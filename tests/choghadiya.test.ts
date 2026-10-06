// Choghadiya (SPEC 4.5) against Drik's Choghadiya pages: every weekday in Vilnius, plus a
// long summer day in New York and a short winter day in New Delhi.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { addDays } from '../src/core/time'
import type { Location } from '../src/core/types'
import { CITIES, type CityKey } from '../scripts/cities'

type Part = { name: string; start: string; end: string }
type Fixture = { city: CityKey; date: string; day: Part[]; night: Part[] }

// Drik's spellings of our content keys.
const DRIK = { amrit: 'Amrita', shubh: 'Shubha', labh: 'Labha', chal: 'Chara', udveg: 'Udvega', rog: 'Roga', kaal: 'Kala' }
const fixtures: Fixture[] = readdirSync('tests/fixtures/choghadiya').map((f) => JSON.parse(readFileSync(`tests/fixtures/choghadiya/${f}`, 'utf8')))
const loc = (city: CityKey): Location => {
  const c = CITIES[city]
  return { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
}
// Drik shows HH:MM: the minute it drops plus 2 min, as for the other windows.
const TOL = 3 * 60_000

describe.each(fixtures)('Drik Choghadiya $city $date', (f) => {
  const ours = computeDay(f.date, loc(f.city)).choghadiya
  const ref = [...f.day, ...f.night]

  it('the same 16 names in the same order', () => {
    expect(ours.map((p) => DRIK[p.name])).toEqual(ref.map((p) => p.name))
    expect(ours.map((p) => p.night)).toEqual([...Array(8).fill(false), ...Array(8).fill(true)])
  })

  const close = (list: { start: Date; end: Date }[], refs: Part[]) =>
    refs.forEach((r, i) => {
      expect(Math.abs(list[i].start.getTime() - Date.parse(r.start)), `${r.name} start`).toBeLessThanOrEqual(TOL)
      expect(Math.abs(list[i].end.getTime() - Date.parse(r.end)), `${r.name} end`).toBeLessThanOrEqual(TOL)
    })

  it('every start and end within 2 min', () => close(ours, ref))

  it("the next day's choghadiyaBefore is this night", () => {
    const before = computeDay(addDays(f.date, 1), loc(f.city)).choghadiyaBefore
    expect(before.map((p) => DRIK[p.name])).toEqual(f.night.map((p) => p.name))
    close(before, f.night)
  })
})

it('covers every weekday', () => {
  const weekdays = new Set(fixtures.map((f) => computeDay(f.date, loc(f.city)).vara))
  expect(weekdays.size).toBe(7)
})
