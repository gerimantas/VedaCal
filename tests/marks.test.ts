// Day marks (SPEC 4.11): eclipses, Sankranti, Guru/Ravi Pushya. Drik pages for these are not
// fetched yet (reCAPTCHA, 2026-10-05; CONTEXT Next Tasks) — until then these tests check the
// marks against the engine's own validated spans and against the Drik day fixtures we have.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay, computeMonth } from '../src/core/panchang'
import type { DayMark, Location } from '../src/core/types'
import { dayView } from '../src/ui/day'
import { monthView } from '../src/ui/month'
import { CITIES, type CityKey } from '../scripts/cities'

const loc = (city: CityKey): Location => {
  const c = CITIES[city]
  return { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
}
const year = (l: Location) =>
  Array.from({ length: 12 }, (_, m) => computeMonth(2026, m + 1, l)).flat().flatMap((d) => d.marks.map((m) => ({ date: d.date, m })))
const of = <K extends DayMark['kind']>(list: { date: string; m: DayMark }[], kind: K) =>
  list.filter((x): x is { date: string; m: Extract<DayMark, { kind: K }> } => x.m.kind === kind)

describe.each(['vilnius', 'new-york', 'new-delhi'] as const)('%s 2026', (city) => {
  const l = loc(city)
  const marks = year(l)

  it('twelve Sankrantis, each where the Vedic Sun sign changes', () => {
    const s = of(marks, 'sankranti')
    expect(s.map((x) => x.m.sign)).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const { date, m } of s) {
      const spans = computeDay(date, l).signs.vedic.sun
      const boundary = spans.find((x) => x.index === m.sign)?.start ?? computeDay(date, l).signs.vedic.sun[0].end
      expect(Math.abs(boundary.getTime() - m.at.getTime()), date).toBeLessThan(2 * 60_000)
    }
  })

  it('Tula Sankranti falls between the Drik days showing Kanya (Oct 10) and Tula (Oct 18)', () => {
    const sign = (d: string) => JSON.parse(readFileSync(`tests/fixtures/drik/${city}-${d}.json`, 'utf8')).raw['Rashi and Nakshatra'].Sunsign[0]
    expect([sign('2026-10-10'), sign('2026-10-18')]).toEqual(['Kanya', 'Tula'])
    const tula = of(marks, 'sankranti').find((x) => x.m.sign === 7)!
    expect(tula.date > '2026-10-10' && tula.date < '2026-10-18').toBe(true)
  })

  it('Guru/Ravi Pushya: inside a Pushya span, on a Thursday or Sunday Panchang day', () => {
    const p = of(marks, 'pushya')
    expect(p.length).toBeGreaterThan(3)
    for (const { date, m } of p) {
      const day = computeDay(date, l)
      expect([0, 4], date).toContain(day.vara)
      expect(m.weekday).toBe(day.vara)
      // The month search holds one ayanamsha for the whole month, the day screen uses the
      // day's: boundaries differ by seconds (the screen shows minutes).
      const slack = 30_000
      const pushya = day.nakshatra.filter((s) => s.index === 8)
      expect(pushya.some((s) => s.start.getTime() - slack <= m.start.getTime() && m.end.getTime() <= s.end.getTime() + slack), date).toBe(true)
      expect(m.start >= day.sunrise! && m.end <= day.nextSunrise!, date).toBe(true)
    }
  })

  it('the same marks on the day screen as on the month screen', () => {
    for (const { date } of marks) {
      expect(computeDay(date, l).marks, date).toEqual(computeMonth(2026, Number(date.slice(5, 7)), l).find((d) => d.date === date)!.marks)
    }
  })
})

it('2026 eclipses (smoke check until Drik Grahan pages are fetched)', () => {
  const e = of(year(loc('vilnius')), 'eclipse').map((x) => `${x.date} ${x.m.type} ${x.m.body}`)
  // Aug 12 is total in Spain and Iceland; Vilnius sees it partial.
  expect(e).toEqual(['2026-02-17 annular sun', '2026-03-03 total moon', '2026-08-12 partial sun', '2026-08-28 partial moon'])
})

it('says where an eclipse can be seen: the March 3 lunar eclipse in New Delhi but not Vilnius', () => {
  const visible = (city: CityKey) => of(year(loc(city)), 'eclipse').find((x) => x.date === '2026-03-03')!.m.visible
  expect([visible('new-delhi'), visible('vilnius')]).toEqual([true, false])
})

it('shows marks in the month key dates and first on the day screen', () => {
  const l = loc('vilnius')
  const v = monthView(computeMonth(2026, 8, l), l, '2026-08-01')
  expect(v.cells.find((c) => c.date === '2026-08-12')?.eclipse).toBe(true)
  expect(v.events.map((e) => e.title)).toContain('Partial solar eclipse, visible here')
  const day = dayView(computeDay('2026-08-12', l), l, new Date('2026-08-12T10:00:00Z'))
  expect(day.facts[0]).toMatchObject({ term: 'eclipse', value: 'Partial solar eclipse', sanskrit: 'Surya Grahan', next: 'visible here' })
  const oct = monthView(computeMonth(2026, 10, l), l, '2026-10-05', 'western')
  expect(oct.events.map((e) => e.title)).toContain('Sun enters Libra (Vedic)')
  expect(oct.cells.find((c) => c.date === '2026-10-04')?.favoured).toBe(true)
})
