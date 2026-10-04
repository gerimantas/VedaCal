// P1 gate (.planning/PLAN.md): the adapter against reference pages fetched from
// drikpanchang.com (minute precision, our default sunrise rule) and mypanchang.com
// (second precision, centre-of-disc sunrise — so only element end times are compared).
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import type { Location, Span } from '../src/core/types'
import { CITIES, type CityKey } from '../scripts/cities'

const MIN = 60_000

// Drik's spellings, by our 1-based index.
const DRIK = {
  tithi: ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'],
  nakshatra: ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'],
  yoga: ['Vishkambha', 'Priti', 'Ayushmana', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'],
  karana: ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti', 'Shakuni', 'Chatushpada', 'Nagava', 'Kinstughna'],
  vara: ['Raviwara', 'Somawara', 'Mangalawara', 'Budhawara', 'Guruwara', 'Shukrawara', 'Shaniwara'],
  ritu: ['Vasant', 'Grishma', 'Varsha', 'Sharad', 'Hemant', 'Shishir'],
}
const drikName = (el: 'tithi' | 'nakshatra' | 'yoga' | 'karana', i: number) =>
  el === 'tithi' ? (i === 30 ? 'Amavasya' : DRIK.tithi[(i - 1) % 15]) : DRIK[el][i - 1]

type Ref = { name: string; end: string | null }
type DrikFixture = {
  city: CityKey; date: string; sunrise: string; sunset: string; nextSunrise: string
  tithi: Ref[]; nakshatra: Ref[]; yoga: Ref[]; karana: Ref[]
  weekday: string; ritu: string; ayana: string
  rahuKalam: { start: string; end: string } | null
  abhijit: { start: string; end: string } | null
  brahmaMuhurta: { start: string; end: string } | null
}
type MypanchangFixture = { city: CityKey; date: string; tithi: Ref[]; nakshatra: Ref[]; yoga: Ref[]; karana: Ref[] }

const load = <T>(dir: string): T[] =>
  readdirSync(`tests/fixtures/${dir}`).map((f) => JSON.parse(readFileSync(`tests/fixtures/${dir}/${f}`, 'utf8')))

const loc = (city: CityKey): Location => {
  const c = CITIES[city]
  return { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
}

const ms = (iso: string) => Date.parse(iso)
const near = (actual: Date | null | undefined, expected: string, toleranceMs: number, what: string) => {
  expect(actual, `${what}: missing`).toBeTruthy()
  const diff = Math.abs(actual!.getTime() - ms(expected))
  expect(diff, `${what}: ours ${actual!.toISOString()} vs ${expected} (${Math.round(diff / 1000)} s)`).toBeLessThanOrEqual(toleranceMs)
}

const ELEMENTS = ['tithi', 'nakshatra', 'yoga', 'karana'] as const

describe.each(load<DrikFixture>('drik'))('Drik $city $date', (f) => {
  const day = computeDay(f.date, loc(f.city))
  // Drik shows HH:MM. Allow the minute it drops plus the tolerance.
  const sunTol = MIN + MIN
  const endTol = 2 * MIN + MIN

  it('sunrise, sunset and next sunrise within 1 min', () => {
    near(day.sunrise, f.sunrise, sunTol, 'sunrise')
    near(day.sunset, f.sunset, sunTol, 'sunset')
    near(day.nextSunrise, f.nextSunrise, sunTol, 'next sunrise')
  })

  it.each(ELEMENTS)('%s: same spans and names, ends within 2 min', (el) => {
    const ours: Span[] = day[el]
    expect(ours.map((s) => drikName(el, s.index)), 'names').toEqual(f[el].map((r) => r.name))
    f[el].forEach((ref, i) => {
      if (ref.end && ref.end !== 'fullNight') near(ours[i].end, ref.end, endTol, `${el} ${ref.name} end`)
      else expect(ours[i].end.getTime(), `${el} ${ref.name} lasts past next sunrise`).toBeGreaterThanOrEqual(day.nextSunrise!.getTime() - MIN)
    })
  })

  it('weekday, ritu and ayana', () => {
    expect(DRIK.vara[day.vara]).toBe(f.weekday)
    expect(f.ritu.startsWith(DRIK.ritu[day.rhythm.ritu - 1]), `ritu ${day.rhythm.ritu} vs ${f.ritu}`).toBe(true)
    expect(day.rhythm.ayana).toBe(f.ayana.toLowerCase())
  })

  it('Rahu Kaal, Abhijit and Brahma Muhurta within 2 min', () => {
    const windows = [
      ['Rahu Kaal', day.windows.rahuKaal, f.rahuKalam],
      ['Abhijit', day.windows.abhijit, f.abhijit],
      ['Brahma Muhurta', day.windows.brahma, f.brahmaMuhurta],
    ] as const
    for (const [name, ours, ref] of windows) {
      if (!ref) {
        expect(ours, `${name}: Drik shows none`).toBeNull()
        continue
      }
      near(ours?.start, ref.start, endTol, `${name} start`)
      near(ours?.end, ref.end, endTol, `${name} end`)
    }
  })
})

describe.each(load<MypanchangFixture>('mypanchang'))('mypanchang $city $date', (f) => {
  const day = computeDay(f.date, loc(f.city))
  it.each(ELEMENTS)('%s: every end time within 2 min', (el) => {
    for (const ref of f[el].filter((r) => r.end)) {
      const closest = day[el].reduce((a, b) => (Math.abs(b.end.getTime() - ms(ref.end!)) < Math.abs(a.end.getTime() - ms(ref.end!)) ? b : a))
      near(closest.end, ref.end!, 2 * MIN, `${el} ${ref.name} end`)
    }
  })
})
