// P4 gate (.planning/PLAN.md): every value the day screen shows equals the engine output
// for Vilnius, New York and New Delhi today; city search finds the test cities offline;
// the city list stays within 1 MB gzipped.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import data from '../src/data/cities.json'
import { computeDay } from '../src/core/panchang'
import { civilDate } from '../src/core/time'
import { buildIndex, nearest, search, type CityData } from '../src/ui/cities'
import { activeAt, clockOn, dayView, shownWindows } from '../src/ui/day'
import { content, entry, time, until } from '../src/ui/format'
import { skyView } from '../src/ui/sky'
import { termGroups, terms } from '../src/ui/terms'

const index = buildIndex(data as unknown as CityData)
const city = (q: string) => search(index, q)[0]

describe('city search (offline, bundled list)', () => {
  it.each([
    ['Vilnius', 'Vilnius', 'LT'],
    ['New York', 'New York City', 'US'],
    ['Kaunas', 'Kaunas', 'LT'],
    ['new delhi', 'New Delhi', 'IN'],
    ['klaipeda', 'Klaipėda', 'LT'], // no accents typed
    ['tromso', 'Tromsø', 'NO'], // ø is not an accent; folded by hand
  ])('%s → %s', (q, name, cc) => {
    expect(city(q)).toMatchObject({ name, cc })
  })

  it('also matches a later word of the name', () => {
    expect(search(index, 'york').map((p) => p.name)).toEqual(expect.arrayContaining(['York', 'New York City']))
  })

  it('carries what a Location needs', () => {
    expect(city('Vilnius')).toMatchObject({ tz: 'Europe/Vilnius', country: 'Lithuania', elevation: 98 })
    expect(city('Vilnius').lat).toBeCloseTo(54.689, 2)
  })

  it('names a GPS point by its nearest city', () => {
    expect(nearest(index, 54.70, 25.30).name).toBe('Vilnius')
    expect(nearest(index, 40.75, -73.99).name).toBe('New York City') // midtown, nearer Hoboken's point
    expect(nearest(index, 40.744, -74.032).name).toBe('Hoboken') // but Hoboken itself stays Hoboken
    expect(nearest(index, 54.897, 23.892).name).toBe('Kaunas')
  })

  it('returns nothing for an empty query', () => {
    expect(search(index, '  ')).toEqual([])
  })

  it('is at most 1 MB gzipped', () => {
    expect(gzipSync(readFileSync('src/data/cities.json')).length).toBeLessThanOrEqual(1024 * 1024)
  })
})

describe.each(['Vilnius', 'New York', 'New Delhi'])('day screen for %s today shows the engine output', (q) => {
  const loc = city(q)
  const now = new Date()
  const day = computeDay(civilDate(loc.tz, now), loc)
  const v = dayView(day, loc, now)

  it('moon card', () => {
    const tithi = activeAt(day.tithi, now)
    const te = entry('tithi', tithi.index)
    expect(v.tithi).toMatchObject({ title: te.title, name: te.name, meaning: te.meaning, percent: Math.round(day.moon.illumination * 100) })
    expect(v.tithi.ends).toContain(time(tithi.end, loc))
    expect(v.moon).toMatchObject({ illumination: day.moon.illumination, waxing: day.moon.waxing })
  })

  it('sunrise, sunset and the five windows, in time order', () => {
    expect(v.sunrise).toBe(time(day.sunrise, loc))
    expect(v.sunset).toBe(time(day.sunset, loc))
    const shown = Object.fromEntries(v.windows.map((w) => [w.term, w]))
    expect(v.windows).toHaveLength(5)
    // As the engine has them, except where the good time and a time to avoid cancel out.
    const sw = shownWindows(day)
    for (const k of ['brahma', 'abhijit', 'rahuKaal', 'yamaganda', 'gulika'] as const) {
      if (!sw.clash || (k !== 'abhijit' && k !== sw.clash.term)) expect(sw[k], k).toEqual(day.windows[k])
      const w = sw[k]
      if (w) expect(shown[k], k).toMatchObject({ start: time(w.start, loc), end: time(w.end, loc) })
      else expect(shown[k].start, k).toBe('')
    }
  })

  it('day facts', () => {
    const facts = Object.fromEntries([...v.facts, ...v.moreFacts].map((f) => [f.term, f]))
    expect(facts.vara.value).toBe(entry('vara', day.vara).title)
    for (const el of ['nakshatra', 'yoga', 'karana'] as const) {
      const s = activeAt(day[el], now)
      expect(facts[el], el).toMatchObject({ value: entry(el, s.index).title, right: until(s.end, day, loc) })
    }
    const moon = activeAt(day.signs.vedic.moon, now)
    const rashi = (i: number) => content.rashi[String(i) as '1']
    expect(v.moonSign).toMatchObject({ text: `Moon in ${rashi(moon.index).title}`, sanskrit: rashi(moon.index).name, until: until(moon.end, day, loc) })
    const sun = activeAt(day.signs.vedic.sun, now)
    expect(v.sunSign).toMatchObject({ text: `Sun in ${rashi(sun.index).title}`, sanskrit: rashi(sun.index).name })
    expect([...v.facts, ...v.moreFacts].some((f) => f.term === 'rashi'), 'signs live on the cards, not in the facts').toBe(false)
    expect(facts.masa.sanskrit).toContain(content.masa[String(day.masa.purnimanta) as '1'].name)
    const ritu = content.rhythm[`ritu${day.rhythm.ritu}` as 'ritu1']
    expect(facts.rhythm).toMatchObject({ value: ritu.title, sanskrit: ritu.name })
  })
})

describe('Yamaganda, Gulika and Choghadiya (Vilnius, Tuesday 2026-10-06; Drik: Abhijit 12:44–13:29, Gulika 13:06–14:31)', () => {
  const loc = city('Vilnius')
  const day = computeDay('2026-10-06', loc)
  const at = (iso: string) => dayView(day, loc, new Date(iso))

  it('the good time and Gulika cancel out where they overlap: both rows leave that part out', () => {
    const v = at('2026-10-06T09:00:00Z')
    const row = (term: string) => v.windows.find((w) => w.term === term)!
    const { abhijit, gulika } = day.windows
    expect(row('abhijit')).toMatchObject({ start: time(abhijit!.start, loc), end: time(gulika!.start, loc) })
    expect(row('gulika')).toMatchObject({ start: time(abhijit!.end, loc), end: time(gulika!.end, loc) })
    expect(row('abhijit').overlap).toEqual({ text: 'Abhijit and Gulika cancel each other out', start: time(gulika!.start, loc), end: time(abhijit!.end, loc) })
    expect(row('gulika').overlap).toBeNull()
    expect(v.windows.map((w) => w.term), 'still in time order').toEqual(['brahma', 'sarvarthaSiddhi', 'yamaganda', 'abhijit', 'gulika', 'rahuKaal'])
  })

  it('counts Yamaganda and Gulika as time to avoid in the dial centre, and nothing where they cancel out', () => {
    expect(at('2026-10-06T07:30:00Z').nowWindows).toEqual(['avoid']) // 10:30, Yamaganda
    expect(at('2026-10-06T11:00:00Z').nowWindows).toEqual(['avoid']) // 14:00, Gulika
    expect(at('2026-10-06T09:50:00Z').nowWindows).toEqual(['good']) // 12:50, Abhijit only
    expect(at('2026-10-06T10:15:00Z').nowWindows).toEqual([]) // 13:15, both: cancelled
  })

  it('lists 16 Choghadiya parts and marks the one now', () => {
    const v = at('2026-10-06T09:00:00Z') // 12:00 — Labh, 11:42–13:06
    expect(v.choghadiya).toHaveLength(16)
    expect(v.choghadiya.filter((c) => c.current)).toHaveLength(1)
    expect(v.choghadiyaNow).toMatchObject({ name: 'Gain', sanskrit: 'Labh', rating: 'good', part: 'day' })
  })

  it('before sunrise, leads with what is left of last night (Monday night, Drik: Chara 05:55–07:30)', () => {
    const early = at('2026-10-06T03:30:00Z') // 06:30, before the 07:30 sunrise
    expect(early.choghadiyaNow).toMatchObject({ name: 'Moving', sanskrit: 'Chal', part: 'before' })
    expect(early.choghadiya.filter((c) => c.part === 'before')).toHaveLength(1)
    expect(early.choghadiya).toHaveLength(17)
    expect(early.choghadiya.filter((c) => c.current)).toHaveLength(1)
    expect(at('2026-10-06T09:00:00Z').choghadiya.some((c) => c.part === 'before'), 'gone after sunrise').toBe(false)
  })
})

describe('a live day (Vilnius 2026-10-04: Taitila until 14:21, then Garaja)', () => {
  const loc = city('Vilnius')
  const day = computeDay('2026-10-04', loc)
  const karana = (at: string) => dayView(day, loc, new Date(at)).moreFacts.find((f) => f.term === 'karana')!

  it('shows the element in force, and what follows it', () => {
    expect(karana('2026-10-04T08:00:00Z')).toMatchObject({ value: entry('karana', 4).title, next: `then ${entry('karana', 5).title}` })
    expect(karana('2026-10-04T12:00:00Z').value).toBe(entry('karana', 5).title) // after 14:21 local
  })

  it('switches the moon card when the lunar day ends', () => {
    expect(dayView(day, loc, new Date('2026-10-04T12:00:00Z')).tithi.index).toBe(24) // Krishna Navami
    expect(dayView(day, loc, new Date('2026-10-04T23:00:00Z')).tithi.index).toBe(25) // after 01:23 → Dashami
  })

  it('names Western signs when asked', () => {
    const w = dayView(day, loc, new Date('2026-10-04T08:00:00Z'), 'western')
    expect(w.sunSign).toMatchObject({ text: 'Sun in Libra', sanskrit: 'Western sign' })
  })
})

describe('Ekadashi fast end (Vilnius, Indira Ekadashi 2026-10-06; Drik: 07:32–09:46 on Oct 7)', () => {
  const loc = city('Vilnius')
  const row = (date: string) => dayView(computeDay(date, loc), loc, new Date(`${date}T09:00:00Z`)).facts[0]

  it('is the first row on the Ekadashi day and on the day after', () => {
    expect(row('2026-10-06')).toMatchObject({ term: 'parana' })
    expect(row('2026-10-06').value).toMatch(/^Tomorrow, /)
    expect(row('2026-10-07').value).toMatch(/^Today, /)
    expect(row('2026-10-08').term).not.toBe('parana')
  })
})

it('a polar night still shows the day (Tromsø, 2026-12-21)', () => {
  const loc = city('Tromso')
  const v = dayView(computeDay('2026-12-21', loc), loc, new Date('2026-12-21T11:00:00Z'))
  expect(v.polar).toBe(true)
  expect(v.tithi.title).toBeTruthy()
  expect(v.facts.length).toBeGreaterThan(3)
})

describe('sun dial on another day: the device clock time on that date', () => {
  const loc = city('Vilnius')
  const now = new Date('2026-10-16T09:50:00Z') // 12:50 in Vilnius (summer time)

  it('today: now', () => {
    expect(clockOn(computeDay('2026-10-16', loc), loc, now)).toEqual(now)
  })

  it('another day: 12:50 there too, also after summer time ends (Oct 25)', () => {
    expect(clockOn(computeDay('2026-10-20', loc), loc, now).toISOString()).toBe('2026-10-20T09:50:00.000Z')
    expect(clockOn(computeDay('2026-10-30', loc), loc, now).toISOString()).toBe('2026-10-30T10:50:00.000Z')
  })

  it('the countdown runs from that time, not from sunrise', () => {
    const day = computeDay('2026-10-20', loc)
    const clock = clockOn(day, loc, now)
    const v = dayView(day, loc, day.sunrise!, 'vedic', clock)
    const mins = Math.round((day.sunset!.getTime() - clock.getTime()) / 60_000)
    expect(v.next?.in).toBe(`${Math.floor(mins / 60)} h ${mins % 60} min`)
  })
})

// About page groups (user, 2026-10-05): every term sits in exactly one group.
it('About groups list every term exactly once', () => {
  const grouped = termGroups.flatMap(([, keys]) => keys)
  expect([...grouped].sort()).toEqual(Object.keys(terms).sort())
})

// Sky screen (user, 2026-10-05): the chart's lunar day and Moon star are the engine's, the
// ones the day screen shows at the same instant.
it('Sky chart agrees with the day screen at sunrise', () => {
  for (const q of ['Vilnius', 'New York', 'New Delhi']) {
    const loc = city(q)
    const day = computeDay(civilDate(loc.tz, new Date()), loc)
    const at = new Date(day.sunrise!.getTime() + 60_000)
    const v = skyView(at)
    expect(v.tithi, q).toBe(day.tithi[0].index)
    expect(v.nakshatra, q).toBe(day.nakshatra[0].index)
  }
})
