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
import { activeAt, dayView } from '../src/ui/day'
import { content, entry, time, until } from '../src/ui/format'

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

  it('sunrise, sunset and the three windows', () => {
    expect(v.sunrise).toBe(time(day.sunrise, loc))
    expect(v.sunset).toBe(time(day.sunset, loc))
    const shown = Object.fromEntries(v.windows.map((w) => [w.term, w]))
    for (const k of ['brahma', 'abhijit', 'rahuKaal'] as const) {
      const w = day.windows[k]
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
    const signs = [...v.facts, ...v.moreFacts].filter((f) => f.term === 'rashi')
    expect(signs[0]).toMatchObject({ value: content.rashi[String(moon.index) as '1'].title, sanskrit: content.rashi[String(moon.index) as '1'].name })
    expect(facts.masa.sanskrit).toContain(content.masa[String(day.masa.purnimanta) as '1'].name)
    const ritu = content.rhythm[`ritu${day.rhythm.ritu}` as 'ritu1']
    expect(facts.rhythm).toMatchObject({ value: ritu.title, sanskrit: ritu.name })
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
    const w = dayView(day, loc, new Date('2026-10-04T08:00:00Z'), 'western').moreFacts[0]
    expect(w).toMatchObject({ value: 'Libra', sanskrit: 'Western sign' })
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
