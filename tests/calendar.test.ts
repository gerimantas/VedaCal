// Lunar month, Moon and Sun signs, and Ekadashi Parana (SPEC 4.10, added after the P4 source
// audit) against pages fetched from drikpanchang.com — never typed by hand.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { addDays, zonedTimeToUtc } from '../src/core/time'
import type { Location } from '../src/core/types'
import { CITIES, type CityKey } from '../scripts/cities'

const MIN = 60_000
const MASA = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']

const load = <T>(dir: string): T[] =>
  readdirSync(`tests/fixtures/${dir}`).map((f) => JSON.parse(readFileSync(`tests/fixtures/${dir}/${f}`, 'utf8')))

const loc = (city: CityKey): Location => {
  const c = CITIES[city]
  return { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
}

const near = (actual: Date | undefined, expected: string, what: string) => {
  expect(actual, `${what}: missing`).toBeTruthy()
  const diff = Math.abs(actual!.getTime() - Date.parse(expected))
  // Drik shows HH:MM: the minute it drops plus our ~1 min sunrise/element tolerance.
  expect(diff, `${what}: ours ${actual!.toISOString()} vs ${expected} (${Math.round(diff / 1000)} s)`).toBeLessThanOrEqual(2 * MIN)
}

type Raw = Record<string, Record<string, string[]>>
type DrikFixture = { city: CityKey; date: string; tz: string; raw: Raw }

/** "Mithuna upto 04:01 PM , Oct 05" → the instant (same date rules as scripts/fetch-drik.ts). */
function upto(f: DrikFixture, v: string): string | null {
  const m = v.match(/upto (\d{1,2}):(\d{2}) (AM|PM)(?: , (\w{3}) (\d{1,2}))?/)
  if (!m) return null
  const hour = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)
  const [y, mo, d] = f.date.split('-').map(Number)
  const month = m[4] ? MONTHS.indexOf(m[4]) + 1 : mo
  return zonedTimeToUtc(f.tz, month < mo ? y + 1 : y, month, m[5] ? Number(m[5]) : d, hour, Number(m[2])).toISOString()
}

describe.each(load<DrikFixture>('drik'))('Drik $city $date', (f) => {
  const day = computeDay(f.date, loc(f.city))
  const card = (title: string, key: string) => f.raw[title]?.[key] ?? []

  it('Lahiri ayanamsha equals the value Drik prints', () => {
    // It moves ~0.14″ a day, so the instant Drik takes it at does not matter at this tolerance.
    const drik = Number(card('Other Calendars and Epoch', 'Lahiri Ayanamsha')[0])
    expect(Math.abs(day.ayanamsha - drik) * 3600).toBeLessThan(0.2)
  })

  it('lunar month, Purnimanta and Amanta', () => {
    const [purnimanta, amanta] = card('Lunar Month, Samvat and Brihaspati Samvatsara', 'Chandramasa')
    const name = (m: number, adhika: boolean) => `${adhika ? 'Adhika ' : ''}${MASA[m - 1]}`
    // Drik writes the leap month as "Jyeshtha (Adhik)" (2026-05-25 fixtures).
    const drik = (s: string) => s.replace(/ - (Purnimanta|Amanta)$/, '').replace(/^Nija /, '').replace(/^(\w+) \(Adhik\)$/, 'Adhika $1')
    expect(name(day.masa.purnimanta, day.masa.adhika)).toBe(drik(purnimanta))
    expect(name(day.masa.amanta, day.masa.adhika)).toBe(drik(amanta))
  })

  it('Moon sign at sunrise and its end', () => {
    const [first] = card('Rashi and Nakshatra', 'Moonsign')
    expect(RASHI[day.signs.vedic.moon[0].index - 1]).toBe(first.split(' ')[0])
    const end = upto(f, first)
    if (end) near(day.signs.vedic.moon[0].end, end, 'Moon sign end')
    else expect(day.signs.vedic.moon[0].end > day.nextSunrise!, 'Moon sign lasts the whole day').toBe(true)
  })

  it('Sun sign at sunrise', () => {
    const [first] = card('Rashi and Nakshatra', 'Sunsign')
    expect(RASHI[day.signs.vedic.sun[0].index - 1]).toBe(first.split(' ')[0])
  })
})

it('Western signs: Sun in Libra on 2026-10-04, Moon one sign ahead of the Vedic one', () => {
  const day = computeDay('2026-10-04', loc('vilnius'))
  expect(day.signs.western.sun[0].index).toBe(7)
  const lead = (day.signs.western.moon[0].index - day.signs.vedic.moon[0].index + 12) % 12
  expect([0, 1]).toContain(lead) // ~24° of ayanamsha: same sign or the next
})

type EkadashiFixture = { city: CityKey; year: number; ekadashis: { masa: string; paksha: string; smarta: string }[] }

describe.each(load<EkadashiFixture>('ekadashi'))('Ekadashi months $city $year', (f) => {
  it.each(f.ekadashis)('$smarta $masa $paksha', (e) => {
    // Drik names Ekadashis by the Purnimanta month; on a Trisparsha day the Ekadashi is at the next sunrise.
    const day = computeDay(e.smarta, loc(f.city))
    const next = computeDay(addDays(e.smarta, 1), loc(f.city))
    expect([MASA[day.masa.purnimanta - 1], MASA[next.masa.purnimanta - 1]]).toContain(e.masa)
  })
})

type ParanaFixture = { city: CityKey; year: number; parana: { ekadashi: string; paranaDay: string; start: string; end: string | null; note: string | null }[] }

// A Drik Ekadashi page can describe the Vaishnava day instead of the Smarta one (Vaikuntha
// Ekadashi, New York 2026-12-20); the app keeps the Smarta day, so only those are compared.
const smarta = new Set(load<EkadashiFixture>('ekadashi').flatMap((f) => f.ekadashis.map((e) => `${f.city} ${e.smarta}`)))

describe.each(load<ParanaFixture>('parana'))('Parana $city $year', (f) => {
  it.each(f.parana.filter((p) => smarta.has(`${f.city} ${p.ekadashi}`)))('$ekadashi ($note)', (p) => {
    const day = computeDay(p.ekadashi, loc(f.city))
    expect(day.ekadashi, 'Drik keeps the fast on this day').toBe(true)
    near(day.parana?.start, p.start, 'start')
    if (p.end) near(day.parana?.end, p.end, 'end')
    else expect(day.parana!.end > day.parana!.start, 'open-ended window still ends with Dwadashi').toBe(true)
    expect(computeDay(p.paranaDay, loc(f.city)).parana).toEqual(day.parana)
  })
})
