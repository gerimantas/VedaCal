// Day marks (SPEC 4.11) against Drik's own Sankranti, eclipse and Guru/Ravi Pushya pages
// (`scripts/fetch-marks.ts`). Drik shows minutes, so times must agree within 2 min.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeMonth } from '../src/core/panchang'
import type { DayMark, Location } from '../src/core/types'
import { CITIES, type CityKey } from '../scripts/cities'

type Fixture = {
  city: CityKey
  year: number
  sankranti: { sign: number; observed: string; at: string }[]
  eclipses: { date: string; body: 'sun' | 'moon'; type: string; visible: boolean; local: string }[]
  pushya: { weekday: 0 | 4; date: string; start: string; end: string }[]
}

const fixtures: Fixture[] = readdirSync('tests/fixtures/marks').map((f) => JSON.parse(readFileSync(`tests/fixtures/marks/${f}`, 'utf8')))

const loc = (city: CityKey): Location => {
  const c = CITIES[city]
  return { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
}
const marksOf = <K extends DayMark['kind']>(l: Location, year: number, kind: K) =>
  Array.from({ length: 12 }, (_, m) => computeMonth(year, m + 1, l))
    .flat()
    .flatMap((d) => d.marks.map((m) => ({ date: d.date, m })))
    .filter((x): x is { date: string; m: Extract<DayMark, { kind: K }> } => x.m.kind === kind)

const near = (actual: Date, expected: string, what: string) =>
  expect(Math.abs(actual.getTime() - Date.parse(expected)) / 60_000, `${what}: ${actual.toISOString()} vs Drik ${expected}`).toBeLessThanOrEqual(2)

describe.each(fixtures)('Drik marks $city $year', (f) => {
  const l = loc(f.city)

  // Before the ayanamsha was aligned with Drik's published Lahiri value (+24.14″), every
  // Sankranti here was 8.5–9.9 min before Drik's.
  it('Sankranti: same sign, moment within 2 min', () => {
    const ours = marksOf(l, f.year, 'sankranti')
    expect(ours.map((x) => x.m.sign).sort()).toEqual(f.sankranti.map((s) => s.sign).sort())
    for (const s of f.sankranti) near(ours.find((x) => x.m.sign === s.sign)!.m.at, s.at, `sign ${s.sign}`)
  })

  it('Guru/Ravi Pushya: the same windows, within 2 min', () => {
    // Compared by window, not date: Drik files a window that falls before Friday's sunrise under
    // Friday's civil date, the app under the Thursday Panchang day it belongs to (SPEC 4.11).
    const ours = marksOf(l, f.year, 'pushya')
    expect(ours.map((x) => x.m.weekday)).toEqual(f.pushya.map((p) => p.weekday))
    f.pushya.forEach((p, i) => {
      near(ours[i].m.start, p.start, `${p.date} start`)
      near(ours[i].m.end, p.end, `${p.date} end`)
    })
  })

  it('eclipses: same days, and visible here exactly when Drik says so', () => {
    const ours = marksOf(l, f.year, 'eclipse')
    expect(ours.map((x) => `${x.date} ${x.m.body}`)).toEqual(f.eclipses.map((e) => `${e.date} ${e.body}`))
    f.eclipses.forEach((e, i) => {
      const m = ours[i].m
      expect(m.visible, `${e.date}: ${e.local.slice(0, 60)}`).toBe(e.visible)
      // Seen here: the type this place sees ("Partial Solar Eclipse in Vilnius"); else the global type.
      const type = e.visible ? e.local.split(' ')[0].toLowerCase() : e.type
      expect(m.type, e.date).toBe(type)
    })
  })
})
