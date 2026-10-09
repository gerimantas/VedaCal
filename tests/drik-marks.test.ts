// Day marks (SPEC 4.11) against Drik's own Sankranti, eclipse, Guru/Ravi Pushya, Amrit Siddhi
// and Sarvartha Siddhi pages
// (`scripts/fetch-marks.ts`). Drik shows minutes, so times must agree within 2 min.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay, computeMonth } from '../src/core/panchang'
import type { DayMark, Location } from '../src/core/types'
import { zonedTimeToUtc } from '../src/core/time'
import { CITIES, type CityKey } from '../scripts/cities'

type Fixture = {
  city: CityKey
  year: number
  sankranti: { sign: number; observed: string; at: string }[]
  eclipses: { date: string; body: 'sun' | 'moon'; type: string; visible: boolean; local: string }[]
  pushya: { weekday: 0 | 4; date: string; start: string; end: string }[]
  amrit: { date: string; start: string; end: string }[]
  sarvartha: { date: string; start: string; end: string }[]
  bhadra: { start: string; end: string }[]
  vyatipata: { start: string; end: string }[]
  vaidhriti: { start: string; end: string }[]
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

  it.each(['amrit', 'sarvartha'] as const)('%s Siddhi: the same windows, within 2 min', (yoga) => {
    // Compared by window, as Pushya above. Drik's lists are by year (Amrit) and by month
    // (Sarvartha, a window may sit on the next month's page): keep the year's windows.
    const ours = marksOf(l, f.year, 'siddhi').filter((x) => x.m.yoga === yoga)
    const drik = f[yoga].filter((w) => w.start.startsWith(String(f.year)) || w.end.startsWith(String(f.year)))
    const minute = (t: Date | string) => Math.round(new Date(t).getTime() / 60_000)
    const missing = drik.filter((w) => !ours.some((x) => Math.abs(minute(x.m.start) - minute(w.start)) <= 2))
    const extra = ours.filter((x) => !drik.some((w) => Math.abs(minute(x.m.start) - minute(w.start)) <= 2))
    expect({ missing: missing.map((w) => `${w.date} ${w.start}`), extra: extra.map((x) => `${x.date} ${x.m.start.toISOString()}`) }).toEqual({ missing: [], extra: [] })
    for (const w of drik) {
      const x = ours.find((o) => Math.abs(minute(o.m.start) - minute(w.start)) <= 2)!
      near(x.m.end, w.end, `${w.date} end`)
    }
  })

  // Times to avoid on the day screen (user, 2026-10-10): Bhadra = the Vishti karana (7),
  // Vyatipata and Vaidhriti = yogas 17 and 27. Every window on Drik's 2026 lists is one of ours.
  it.each([
    ['bhadra', 'karana', 7],
    ['vyatipata', 'yoga', 17],
    ['vaidhriti', 'yoga', 27],
  ] as const)('%s: every Drik window is a %s %i span of ours, within 2 min', (list, element, index) => {
    for (const w of f[list]) {
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: l.tz }).format(new Date(w.start))
      const before = new Date(Date.parse(`${date}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
      const spans = [before, date].flatMap((d) => computeDay(d, l)[element]).filter((s) => s.index === index)
      const ours = spans.find((s) => Math.abs(s.start.getTime() - Date.parse(w.start)) <= 2 * 60_000)
      expect(ours, `${list} from ${w.start}`).toBeDefined()
      near(ours!.end, w.end, `${list} from ${w.start}: end`)
    }
  })

  it('eclipses: the time to avoid is what Drik shows here, within 2 min', () => {
    // "Lunar Eclipse Starts (With Moonrise) - 06:26 PM", "Eclipse would end with Sunset - 08:58 PM".
    const clock = (text: string, re: RegExp) => {
      const m = text.match(re)
      if (!m) throw new Error(`no time in "${text.slice(0, 120)}"`)
      return m[1]
    }
    const START = /(?:Lunar Eclipse Starts|Eclipse Start Time)(?: \([^)]*\))? - (\d{1,2}:\d{2} [AP]M)/
    const END = /(?:Lunar Eclipse Ends|Eclipse End Time|Eclipse would end with Sunset)(?: \([^)]*\))? - (\d{1,2}:\d{2} [AP]M)/
    const ours = marksOf(l, f.year, 'eclipse')
    f.eclipses.forEach((e, i) => {
      const seen = ours[i].m.seen
      if (!e.visible) return expect(seen, e.date).toBeNull()
      // Drik gives clock times; take the one of the three days around the peak nearest ours.
      const near2 = (actual: Date, hhmm: string, what: string) => {
        const [h, m] = hhmm.split(/[: ]/).map((x, k) => (k < 2 ? Number(x) : x)) as [number, number, string]
        const hour = (h % 12) + (hhmm.endsWith('PM') ? 12 : 0)
        const [y, mo, d] = e.date.split('-').map(Number)
        const best = Math.min(...[-1, 0, 1].map((k) => Math.abs(zonedTimeToUtc(CITIES[f.city].tz, y, mo, d + k, hour, m).getTime() - actual.getTime())))
        expect(best / 60_000, `${e.date} ${what}`).toBeLessThanOrEqual(2)
      }
      near2(seen!.start, clock(e.local, START), 'start')
      near2(seen!.end, clock(e.local, END), 'end')
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
