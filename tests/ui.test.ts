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
import { dayView } from '../src/ui/day'
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
    const te = entry('tithi', day.tithi[0].index)
    expect(v.tithi).toMatchObject({ title: te.title, name: te.name, meaning: te.meaning, percent: Math.round(day.moon.illumination * 100) })
    expect(v.tithi.ends).toContain(time(day.tithi[0].end, loc))
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
    expect(facts.nakshatra).toMatchObject({ value: entry('nakshatra', day.nakshatra[0].index).title, right: until(day.nakshatra[0].end, day, loc) })
    expect(facts.yoga).toMatchObject({ value: entry('yoga', day.yoga[0].index).title, right: until(day.yoga[0].end, day, loc) })
    expect(facts.karana).toMatchObject({ value: entry('karana', day.karana[0].index).title, right: until(day.karana[0].end, day, loc) })
    const ritu = content.rhythm[`ritu${day.rhythm.ritu}` as 'ritu1']
    expect(facts.rhythm).toMatchObject({ value: ritu.title, sanskrit: ritu.name })
  })
})
