// Day periods and the segment verdict (SPEC 13.2–13.4, PLAN-periods Q4–Q5 step 1).
// Expected times come from the Drik fixtures and the worked examples in
// .planning/research/examples.md (Vilnius); verdicts are checked only at moments where no
// value from the `missing` list (month rules) is active.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { baanaSpans, dayPeriods, daySegments, verdictOf, type Period } from '../src/core/periods'
import { addDays, zonedTimeToUtc } from '../src/core/time'
import type { Location } from '../src/core/types'
import { CITIES } from '../scripts/cities'
import { instant, range } from '../scripts/fetch-drik'

const c = CITIES.vilnius
const VILNIUS: Location = { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }

/** Local Vilnius time on `date` (+1 day when `next`). */
const L = (date: string, hhmm: string, next = false) => {
  const [y, m, d] = (next ? addDays(date, 1) : date).split('-').map(Number)
  const [h, mm] = hhmm.split(':').map(Number)
  return zonedTimeToUtc(c.tz, y, m, d, h, mm)
}
const periodsOf = (date: string) => dayPeriods(computeDay(date, VILNIUS), computeDay(addDays(date, -1), VILNIUS))
const MIN = 60_000
const near = (a: Date, b: Date, min: number) => expect(Math.abs(a.getTime() - b.getTime()) / MIN).toBeLessThanOrEqual(min)

/** The one period of `kind` that covers `t`. */
function find(periods: Period[], kind: Period['kind'], t: Date): Period {
  const hit = periods.filter((p) => p.kind === kind && p.start <= t && t < p.end)
  expect(hit, `${kind} at ${t.toISOString()}`).toHaveLength(1)
  return hit[0]
}
const none = (periods: Period[], kind: Period['kind'], t: Date) =>
  expect(periods.filter((p) => p.kind === kind && p.start <= t && t < p.end), `no ${kind} at ${t.toISOString()}`).toHaveLength(0)

/** Verdict for `group` at `t`, from the day's own segments. */
function verdictAt(date: string, group: number, t: Date) {
  const segs = daySegments(computeDay(date, VILNIUS), computeDay(addDays(date, -1), VILNIUS), group)
  const s = segs.find((x) => x.start <= t && t < x.end)
  expect(s, `segment at ${t.toISOString()}`).toBeDefined()
  return s!
}

describe('the verdict rule (SPEC 13.4) on its own', () => {
  const t0 = new Date(0), t1 = new Date(MIN)
  const p = (kind: Period['kind'], level: Period['level'], extra: Partial<Period> = {}): Period => ({ kind, level, start: t0, end: t1, groups: [0], decides: true, rule: '', ...extra })
  const base = (level: Period['level']) => p('base', level)

  it('any veto → avoid, listing every veto', () => {
    const r = verdictOf([p('rahuKaal', 'veto'), p('yamaganda', 'veto'), p('abhijit', 'strong'), base('good')], 0)
    expect(r.verdict).toBe('avoid')
    expect(r.by.map((x) => x.kind)).toEqual(['rahuKaal', 'yamaganda'])
  })
  it('else a fallback → only if it cannot wait, even with a strong +', () => {
    expect(verdictOf([p('vaidhriti', 'fb'), p('ravi', 'strong'), base('neutral')], 0).verdict).toBe('fb')
  })
  it('else a strong + → good, also on a poor base', () => {
    const r = verdictOf([p('ravi', 'strong'), base('poor')], 0)
    expect(r).toMatchObject({ verdict: 'good', strong: true })
  })
  it('steps 4–6 follow the base and the plain +', () => {
    expect(verdictOf([base('good')], 0).verdict).toBe('good')
    expect(verdictOf([base('neutral'), p('brahma', 'plus')], 0).verdict).toBe('good')
    expect(verdictOf([base('neutral')], 0).verdict).toBe('neutral')
    expect(verdictOf([base('poor'), p('brahma', 'plus')], 0).verdict).toBe('neutral')
    expect(verdictOf([base('poor')], 0).verdict).toBe('fb')
  })
  it('notes, disputed values and other groups never decide', () => {
    expect(verdictOf([p('choghadiya', 'veto', { decides: false }), p('gulika', 'veto', { decides: false }), base('neutral')], 0).verdict).toBe('neutral')
    expect(verdictOf([p('rahuKaal', 'veto', { groups: [7] }), base('neutral')], 0).verdict).toBe('neutral')
  })
})

describe('periods, Vilnius 2026-10-10 (example 1)', () => {
  const { window, periods } = periodsOf('2026-10-10')

  it('the day runs from Brahma Muhurta to the next sunrise', () => {
    near(window.start, L('2026-10-10', '05:54'), 1)
    near(window.end, L('2026-10-10', '07:40', true), 1)
  })
  it('20 palas around solar noon and midnight (R18)', () => {
    const noon = find(periods, 'noon', L('2026-10-10', '13:05'))
    near(noon.start, L('2026-10-10', '13:01'), 1)
    near(noon.end, L('2026-10-10', '13:09'), 1)
    const mid = find(periods, 'midnight', L('2026-10-10', '01:06', true))
    near(mid.start, L('2026-10-10', '01:02', true), 1)
  })
  it('Vaidhriti: a fallback from 19:32 to the next sunrise (C1)', () => {
    const v = find(periods, 'vaidhriti', L('2026-10-10', '22:00'))
    expect(v.level).toBe('fb')
    near(v.start, L('2026-10-10', '19:32'), 2)
    near(v.end, L('2026-10-10', '07:40', true), 1)
  })
  it('Choghadiya is a note, Gulika disputed: neither decides', () => {
    expect(find(periods, 'choghadiya', L('2026-10-10', '06:30')).decides).toBe(false)
    expect(find(periods, 'gulika', L('2026-10-10', '08:00')).decides).toBe(false)
  })

  it('group 0: Amavasya avoids until 18:49, then the poor base gives fb', () => {
    expect(verdictAt('2026-10-10', 0, L('2026-10-10', '10:00')).verdict).toBe('avoid')
    expect(verdictAt('2026-10-10', 0, L('2026-10-10', '18:40')).verdict).toBe('avoid')
    expect(verdictAt('2026-10-10', 0, L('2026-10-10', '19:10')).verdict).toBe('fb')
  })
  it('group 7: Amavasya no veto, Brahma Muhurta lifts the poor base to neutral, Abhijit good — inside the day', () => {
    // The day's own values, without the month rules (Venus is combust here, M1).
    const at = (hhmm: string) => {
      const t = L('2026-10-10', hhmm)
      return verdictOf(periods.filter((p) => p.kind !== 'month' && p.start <= t && t < p.end), 7)
    }
    // Amavasya is the last of the dark half's five low tithis (D4): base poor; BM + → neutral.
    expect(at('06:10').verdict).toBe('neutral')
    expect(at('06:55').verdict).toBe('fb') // BM over, base poor
    expect(at('13:20')).toMatchObject({ verdict: 'good', strong: true })
    expect(at('13:05').verdict).toBe('avoid') // noon window inside Abhijit
  })
  it('group 7: with the month rules, Venus combust avoids the whole day (M1; Drik: asta 09-04 → 10-31)', () => {
    expect(verdictAt('2026-10-10', 7, L('2026-10-10', '13:20')).by.map((p) => p.detail?.name)).toContain('venusAsta')
  })
})

describe('periods, Vilnius 2026-10-06 (example 2)', () => {
  const { periods } = periodsOf('2026-10-06')

  it('nakshatra junction Ashlesha / Magha, 2 ghatikas each side (D5)', () => {
    const g = find(periods, 'nakshatraGandanta', L('2026-10-06', '19:47'))
    near(g.start, L('2026-10-06', '18:59'), 2)
    near(g.end, L('2026-10-06', '20:35'), 2)
  })
  it("Dwadashi's first 10 ghatikas (D3)", () => {
    const d = find(periods, 'pakshaRandhra', L('2026-10-06', '23:00'))
    near(d.start, L('2026-10-06', '22:04'), 2)
    near(d.end, L('2026-10-06', '02:04', true), 2)
  })
  it('group 0 in the evening: the junction avoids, then the poor base gives fb', () => {
    expect(verdictAt('2026-10-06', 0, L('2026-10-06', '20:20')).verdict).toBe('avoid')
    expect(verdictAt('2026-10-06', 0, L('2026-10-06', '21:00')).verdict).toBe('fb')
    expect(verdictAt('2026-10-06', 0, L('2026-10-06', '23:00')).verdict).toBe('avoid')
  })
})

describe('periods, Vilnius 2026-10-25 (example 3)', () => {
  const { periods } = periodsOf('2026-10-25')

  it('Bhadra on earth: mouth 5 ghatikas, then veto to noon, fallback after, gone when the Moon leaves Meena (R12, C1)', () => {
    const mouth = find(periods, 'bhadraMouth', L('2026-10-25', '09:00'))
    near(mouth.start, L('2026-10-25', '08:25'), 2)
    near(mouth.end, L('2026-10-25', '10:25'), 2)
    expect(find(periods, 'bhadra', L('2026-10-25', '11:00')).level).toBe('veto')
    expect(find(periods, 'bhadra', L('2026-10-25', '14:00')).level).toBe('fb')
    none(periods, 'bhadra', L('2026-10-25', '16:30'))
    none(periods, 'bhadraTail', L('2026-10-25', '19:00')) // in heaven: no effect
  })
  it('tithi junction Purnima / Pratipada, 1 ghatika each side (D5)', () => {
    const g = find(periods, 'tithiGandanta', L('2026-10-25', '06:11', true))
    near(g.start, L('2026-10-25', '05:47', true), 2)
    near(g.end, L('2026-10-25', '06:35', true), 2)
  })
  it('nakshatra junction Revati / Ashwini (D5)', () => {
    const g = find(periods, 'nakshatraGandanta', L('2026-10-25', '15:52'))
    near(g.start, L('2026-10-25', '15:04'), 2)
    near(g.end, L('2026-10-25', '16:40'), 2)
  })
  it("Vajra's first 3 dandas (R17)", () => {
    const v = find(periods, 'yogaPart', L('2026-10-25', '14:00'))
    near(v.start, L('2026-10-25', '13:52'), 2)
    near(v.end, L('2026-10-25', '15:04'), 2)
  })
  it('Ravi yoga while the Moon is in Revati, 13th from the Sun in Swati (R16)', () => {
    const r = find(periods, 'ravi', L('2026-10-25', '10:00'))
    expect(r.level).toBe('strong')
    near(r.end, L('2026-10-25', '15:52'), 2)
  })
  it('Sarvartha Siddhi from 15:52 to the next sunrise (R14)', () => {
    const s = find(periods, 'sarvartha', L('2026-10-25', '20:00'))
    near(s.start, L('2026-10-25', '15:52'), 2)
  })
  it('group 0: Ravi yoga good by day, Sarvartha good by night, junctions avoid', () => {
    expect(verdictAt('2026-10-25', 0, L('2026-10-25', '07:30'))).toMatchObject({ verdict: 'good', strong: true })
    expect(verdictAt('2026-10-25', 0, L('2026-10-25', '09:00')).verdict).toBe('avoid') // Bhadra mouth
    expect(verdictAt('2026-10-25', 0, L('2026-10-25', '13:30')).verdict).toBe('fb') // Bhadra after noon beats Ravi yoga
    expect(verdictAt('2026-10-25', 0, L('2026-10-25', '20:00'))).toMatchObject({ verdict: 'good', strong: true })
    expect(verdictAt('2026-10-25', 0, L('2026-10-25', '00:03', true)).verdict).toBe('avoid') // midnight
  })
})

describe('periods, Vilnius 2026-05-10 (example 5)', () => {
  const { periods } = periodsOf('2026-05-10')

  it("Navami's first 25 ghatikas (D3)", () => {
    const d = find(periods, 'pakshaRandhra', L('2026-05-10', '16:00'))
    near(d.start, L('2026-05-10', '12:36'), 2)
    near(d.end, L('2026-05-10', '22:36'), 2)
  })
  it('group 0: Sun hora good, neutral morning, avoid in Navami, fb at night but neutral in a Sun hora', () => {
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '06:00')).verdict).toBe('good')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '08:00')).verdict).toBe('neutral')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '16:00')).verdict).toBe('avoid')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '23:00')).verdict).toBe('neutral')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '23:30')).verdict).toBe('fb')
  })
})

// E1 ([MC] 1.32–33 with the Piyushadhara): an eclipse seen here spoils the 3 days before it if
// the body sets eclipsed, the 3 days after if it rises eclipsed, and the 3 days before, the day
// and the 3 after if it is seen whole; its nakshatra for 6, 3 or 1 months by the magnitude seen
// (whole, at least half, less). Seen times and magnitudes: Drik's eclipse pages
// (tests/fixtures/marks/*-2026.json).
describe('eclipses seen here (E1)', () => {
  const place = (k: keyof typeof CITIES): Location => {
    const x = CITIES[k]
    return { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
  }
  const at = (k: keyof typeof CITIES, date: string, hhmm: string) => {
    const [y, m, d] = date.split('-').map(Number)
    const [h, mm] = hhmm.split(':').map(Number)
    return zonedTimeToUtc(CITIES[k].tz, y, m, d, h, mm)
  }
  const day = (k: keyof typeof CITIES, date: string) => computeDay(date, place(k))
  const periods = (k: keyof typeof CITIES, date: string) => dayPeriods(day(k, date), day(k, addDays(date, -1))).periods
  /** Is the whole day window under the 3-day rule? */
  const spoiled = (k: keyof typeof CITIES, date: string) => {
    const d = day(k, date)
    const { window, periods: ps } = dayPeriods(d, day(k, addDays(date, -1)))
    const p = ps.filter((x) => x.kind === 'eclipseDays')
    if (p.length) expect(p.some((x) => x.start.getTime() === window.start.getTime() && x.end.getTime() === window.end.getTime()), date).toBe(true)
    return p.length > 0
  }
  const seenOn = (k: keyof typeof CITIES, date: string, body: 'sun' | 'moon') => {
    const e = day(k, date).eclipses.filter((x) => x.body === body && x.day === date)
    expect(e, `${k} ${date} ${body}`).toHaveLength(1)
    return e[0]
  }

  it('Vilnius 2026-08-12: the Sun sets eclipsed at magnitude 0.84 in Ashlesha (example 4)', () => {
    const e = seenOn('vilnius', '2026-08-12', 'sun')
    near(e.seen.start, at('vilnius', '2026-08-12', '20:09'), 2)
    near(e.seen.end, at('vilnius', '2026-08-12', '20:58'), 2)
    expect(e).toMatchObject({ set: true, rose: false, stars: [9] })
    expect(e.magnitude).toBeCloseTo(0.84, 1)
  })
  it('Vilnius 2026-08-12: the 3 days before are avoided, not the day itself or after; the eclipse itself is', () => {
    expect(['2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'].map((d) => spoiled('vilnius', d))).toEqual([false, true, true, true, false, false])
    const p = find(periods('vilnius', '2026-08-12'), 'eclipse', at('vilnius', '2026-08-12', '20:30'))
    expect(p.level).toBe('veto')
  })
  it('Vilnius: Ashlesha is avoided for 3 months — 2026-10-06 until 19:47, overruling Sarvartha Siddhi (example 2)', () => {
    const ps = periods('vilnius', '2026-10-06')
    const s = find(ps, 'eclipseStar', L('2026-10-06', '12:00'))
    near(s.end, L('2026-10-06', '19:47'), 2)
    none(ps, 'eclipseStar', L('2026-10-06', '21:00'))
    expect(verdictAt('2026-10-06', 0, L('2026-10-06', '12:00')).verdict).toBe('avoid')
    // The Moon is back in Ashlesha on 2026-11-02 (inside 3 months) and on 2026-11-29 (outside).
    expect(periods('vilnius', '2026-11-02').some((p) => p.kind === 'eclipseStar')).toBe(true)
    expect(periods('vilnius', '2026-11-29').some((p) => p.kind === 'eclipseStar')).toBe(false)
  })
  it('Vilnius 2026-08-28: the Moon sets eclipsed at 06:16 — the 3 days before', () => {
    const e = seenOn('vilnius', '2026-08-28', 'moon')
    near(e.seen.start, at('vilnius', '2026-08-28', '05:34'), 2)
    near(e.seen.end, at('vilnius', '2026-08-28', '06:16'), 2)
    expect(e).toMatchObject({ set: true, rose: false })
    expect(e.magnitude).toBeLessThan(0.92) // the greatest phase, 0.92 at 07:13, is below the horizon
    expect(['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29'].map((d) => spoiled('vilnius', d))).toEqual([false, true, true, true, false, false])
  })
  it('New Delhi 2026-03-03: the Moon rises eclipsed at 18:26 — the 3 days after', () => {
    const e = seenOn('new-delhi', '2026-03-03', 'moon')
    near(e.seen.start, at('new-delhi', '2026-03-03', '18:26'), 2)
    near(e.seen.end, at('new-delhi', '2026-03-03', '18:46'), 2)
    expect(e).toMatchObject({ set: false, rose: true })
    expect(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07'].map((d) => spoiled('new-delhi', d))).toEqual([false, false, true, true, true, false])
  })
  it('New York 2026-08-12: seen whole, magnitude 0.18 — 3 days before, the day, 3 after; the star for 1 month', () => {
    const e = seenOn('new-york', '2026-08-12', 'sun')
    near(e.seen.start, at('new-york', '2026-08-12', '13:07'), 2)
    near(e.seen.end, at('new-york', '2026-08-12', '14:38'), 2)
    expect(e).toMatchObject({ set: false, rose: false })
    expect(e.magnitude).toBeCloseTo(0.18, 1)
    expect(['2026-08-08', '2026-08-09', '2026-08-12', '2026-08-15', '2026-08-16'].map((d) => spoiled('new-york', d))).toEqual([false, true, true, true, false])
  })
  it('New York 2026-03-03: the Moon sets in totality — 3 days before, 7 after (a total eclipse, [MC] 1.32)', () => {
    const e = day('new-york', '2026-03-03').eclipses.find((x) => x.body === 'moon')!
    near(e.seen.start, at('new-york', '2026-03-03', '04:51'), 2)
    near(e.seen.end, at('new-york', '2026-03-03', '06:24'), 2)
    expect(e).toMatchObject({ set: true, rose: false })
    expect(e.magnitude).toBeGreaterThanOrEqual(1)
    // 04:51 is inside that morning's Brahma Muhurta (from 04:45), so in the day of the 3rd (SPEC 13.1).
    expect(e.day).toBe('2026-03-03')
    expect(['2026-02-27', '2026-02-28', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-10', '2026-03-11'].map((d) => spoiled('new-york', d))).toEqual([false, true, true, false, true, true, false])
  })
  it('not seen here, not counted: New Delhi 2026-08-12', () => {
    expect(day('new-delhi', '2026-08-10').eclipses.filter((x) => x.body === 'sun')).toHaveLength(0)
    expect(spoiled('new-delhi', '2026-08-10')).toBe(false)
  })
})

// Dur Muhurtam (R10): every Drik day fixture, 3 cities, all 7 weekdays. Drik's list per
// weekday (Sun 14; Mon 9, 12; Tue 4 and night 7; Wed 8; Thu 6, 12; Fri 4, 9; Sat 1, 2) is
// measured from these pages, not typed in.
describe('Dur Muhurtam (R10) against Drik', () => {
  const files = readdirSync('tests/fixtures/drik')
  const weekdays = new Set<string>()
  for (const file of files) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik/${file}`, 'utf8'))
    const drik: string[] = f.raw['Inauspicious Timings']?.['Dur Muhurtam'] ?? []
    if (!drik.length) continue
    weekdays.add(f.weekday)
    it(`${f.city} ${f.date} (${f.weekday})`, () => {
      const x = CITIES[f.city as keyof typeof CITIES]
      const place: Location = { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
      const { periods } = dayPeriods(computeDay(f.date, place), computeDay(addDays(f.date, -1), place))
      const ours = periods.filter((p) => p.kind === 'durMuhurtam')
      expect(ours.map((p) => p.level)).toEqual(ours.map(() => 'veto'))
      expect(ours).toHaveLength(drik.length)
      drik.forEach((v, i) => {
        const r = range(f.tz, f.date, v)!
        near(ours[i].start, new Date(r.start), 2)
        near(ours[i].end, new Date(r.end), 2)
      })
    })
  }
  it('the fixtures cover all 7 weekdays', () => expect(weekdays.size).toBe(7))
  it("Wednesday: the 8th muhurta is Dur Muhurtam, so Abhijit's time is avoided", () => {
    const t = L('2026-10-07', '12:50')
    expect(verdictAt('2026-10-07', 0, t).by.map((p) => p.kind)).toContain('durMuhurtam')
  })
})

// Varjyam (R7) and Amrit Kalam (R23): 4 ghatikas of the star's real span, from a per-star
// ghatika table read off these Drik pages (all 27 stars; Mula has two Varjyams).
describe('Varjyam (R7) and Amrit Kalam (R23) against Drik', () => {
  const stars = { varjyam: new Set<number>(), amritKalam: new Set<number>() }
  for (const file of readdirSync('tests/fixtures/drik')) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik/${file}`, 'utf8'))
    if (!f.nextSunrise) continue
    const x = CITIES[f.city as keyof typeof CITIES]
    const place: Location = { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
    for (const [kind, card, key] of [['varjyam', 'Inauspicious Timings', 'Varjyam'], ['amritKalam', 'Auspicious Timings', 'Amrit Kalam']] as const) {
      const drik = (f.raw[card]?.[key] ?? []).map((v: string) => range(f.tz, f.date, v)).filter(Boolean) as { start: string; end: string }[]
      it(`${kind}: ${f.city} ${f.date}`, () => {
        const { window, periods } = dayPeriods(computeDay(f.date, place), computeDay(addDays(f.date, -1), place))
        const ours = periods.filter((p) => p.kind === kind)
        expect(ours.map((p) => p.level)).toEqual(ours.map(() => (kind === 'varjyam' ? 'veto' : 'plus')))
        // Drik lists the windows that start between this sunrise and the next, in full; ours
        // stop at the next sunrise. Within 2 min of either sunrise a window may sit on either page.
        const sr = Date.parse(f.sunrise), ns = Date.parse(f.nextSunrise)
        for (const r of drik) {
          const a = Date.parse(r.start), b = Date.parse(r.end)
          const p = ours.find((x) => Math.abs(x.start.getTime() - a) <= 2 * MIN)
          if (!p && Math.abs(a - ns) <= 2 * MIN) continue
          expect(p, `${kind} from ${r.start}`).toBeDefined()
          near(p!.end, new Date(Math.min(b, window.end.getTime())), 2)
          stars[kind].add(Number(p!.detail?.star))
        }
        for (const p of ours.filter((x) => x.start.getTime() > sr + 2 * MIN && x.start.getTime() < ns - 2 * MIN))
          expect(drik.some((r) => Math.abs(Date.parse(r.start) - p.start.getTime()) <= 2 * MIN), `${kind} from ${p.start.toISOString()} not on Drik`).toBe(true)
      })
    }
  }
  it('the fixtures cover every star for both', () => {
    expect(stars.varjyam.size).toBe(27)
    expect(stars.amritKalam.size).toBe(27)
  })
})

// Rising signs (Udaya Lagna, PLAN-periods Q4.g) against Drik's lagna pages, and their
// junctions (D5): the last half ghatika of Karka, Vrishchika, Meena and the first of the next.
describe('rising signs and their junctions (D5)', () => {
  const RASHIS = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']
  const placeOf = (city: string): Location => {
    const x = CITIES[city as keyof typeof CITIES]
    return { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
  }
  for (const file of readdirSync('tests/fixtures/drik-extra')) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik-extra/${file}`, 'utf8'))
    it(`${f.city} ${f.date}: every rising sign within 2 min of Drik`, () => {
      const lagna = computeDay(f.date, placeOf(f.city)).lagna
      for (const r of f.lagna as { rashi: string; start: string; end: string }[]) {
        const s = lagna.find((x) => x.index === RASHIS.indexOf(r.rashi) + 1 && Math.abs(x.end.getTime() - Date.parse(r.end)) < 30 * MIN)
        expect(s, `${r.rashi} to ${r.end}`).toBeDefined()
        near(s!.start, new Date(r.start), 2)
        near(s!.end, new Date(r.end), 2)
      }
    })
  }
  it('Vilnius 2026-10-10: junctions are vetoes 12 min each side of Karka/Simha, Vrishchika/Dhanu, Meena/Mesha', () => {
    const day = computeDay('2026-10-10', VILNIUS)
    const { window, periods } = dayPeriods(day, computeDay('2026-10-09', VILNIUS))
    const js = periods.filter((p) => p.kind === 'lagnaGandanta')
    const all = [...computeDay('2026-10-09', VILNIUS).lagna, ...day.lagna]
    const expected = all.filter((s) => [5, 9, 1].includes(s.index) && s.start > new Date(window.start.getTime() - 12 * MIN) && s.start < new Date(window.end.getTime() + 12 * MIN))
    expect(js.length).toBe(new Set(expected.map((s) => s.start.getTime())).size)
    expect(js.length).toBeGreaterThanOrEqual(2)
    for (const p of js) {
      expect(p.level).toBe('veto')
      const s = expected.find((x) => Math.abs(x.start.getTime() - (p.start.getTime() + 12 * MIN)) < MIN || Math.abs(x.start.getTime() - (p.end.getTime() - 12 * MIN)) < MIN)
      expect(s, p.start.toISOString()).toBeDefined()
    }
  })
})

// Baana (R19, [MC] 6.73–74): the Sun's completed degrees in its sign, remainder by 9 — 1
// Mrityu, 2 Agni, 4 Raja, 6 Chora, 8 Roga. Changes measured against Drik's "Baana" field;
// what it vetoes, when and for whom, from SPEC 13.2. Within 3 min, not 2: the Sun takes a day
// per degree, so one arcsecond is 24 s — ours come 17–126 s after Drik's (mean 92 s, 2026-10-14).
describe('Baana (R19)', () => {
  for (const file of readdirSync('tests/fixtures/drik')) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik/${file}`, 'utf8'))
    if (!f.nextSunrise) continue
    it(`${f.city} ${f.date}: the same Baanas as Drik, changing within 3 min`, () => {
      const ours = baanaSpans(new Date(f.sunrise), new Date(f.nextSunrise)).filter((b) => b.name)
      const drik = (f.raw['Inauspicious Timings']?.Baana ?? []) as string[]
      expect(ours.map((b) => b.name)).toEqual(drik.map((v) => v.split(' ')[0].toLowerCase()))
      drik.forEach((v, i) => {
        const m = v.match(/^\w+ (?:upto (.+)|from (.+?) to (.+))$/)!
        // Drik writes an end past the next sunrise in full; ours stop there.
        const end = (s: string) => new Date(Math.min(Date.parse(instant(f.tz, f.date, s)), Date.parse(f.nextSunrise)))
        if (m[1]) near(ours[i].end, end(m[1]), 3)
        if (m[2]) near(ours[i].start, new Date(instant(f.tz, f.date, m[2])), 3)
        if (m[3] && !/Full Night/.test(m[3])) near(ours[i].end, end(m[3]), 3)
      })
    })
  }
  const baanas = (date: string) => periodsOf(date).periods.filter((p) => p.kind === 'baana')
  it('Vilnius 2026-10-10: Raja by day only, for group 9 only — sunrise to 15:50 (example 1)', () => {
    const ps = baanas('2026-10-10')
    expect(ps).toHaveLength(1)
    expect(ps[0]).toMatchObject({ level: 'veto', groups: [9], detail: { name: 'raja' } })
    near(ps[0].start, L('2026-10-10', '07:38'), 1)
    near(ps[0].end, L('2026-10-10', '15:50'), 2)
  })
  it('Vilnius 2026-10-06: Mrityu at the sandhyas only, for group 2 — 18:43–20:00 and before the next sunrise', () => {
    const ps = baanas('2026-10-06')
    expect(ps.every((p) => p.groups.length === 1 && p.groups[0] === 2)).toBe(true)
    expect(ps).toHaveLength(2)
    near(ps[0].start, L('2026-10-06', '18:43'), 2)
    near(ps[0].end, L('2026-10-06', '20:00'), 2)
    near(ps[1].end, L('2026-10-06', '07:32', true), 2)
  })
  it('Vilnius 2026-10-14: Roga at night only, for group 7 — none, as it ends at 16:50', () => {
    expect(baanas('2026-10-14').filter((p) => p.detail?.name === 'roga').every((p) => p.end <= L('2026-10-14', '07:46'))).toBe(true)
  })
})

// Hora (R6): 12 equal parts of the day and 12 of the night, the first ruled by the weekday's
// lord, each next by the planet 6th from it in weekday order — Drik's hora pages, 3 cities.
// R22: a hora carries its planet's weekday class, so it is + for the groups that class suits.
describe('Hora (R6, R22)', () => {
  const placeOf = (city: string): Location => {
    const x = CITIES[city as keyof typeof CITIES]
    return { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
  }
  for (const file of readdirSync('tests/fixtures/drik-extra')) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik-extra/${file}`, 'utf8'))
    it(`${f.city} ${f.date}: every hora inside the day window within 2 min of Drik, same planet`, () => {
      const place = placeOf(f.city)
      const { window, periods } = dayPeriods(computeDay(f.date, place), computeDay(addDays(f.date, -1), place))
      const ours = periods.filter((p) => p.kind === 'hora')
      const drik = [...f.hora.day, ...f.hora.night] as { name: string; start: string; end: string }[]
      expect(drik).toHaveLength(24)
      for (const h of drik) {
        const p = ours.find((x) => Math.abs(x.start.getTime() - Date.parse(h.start)) <= 2 * MIN)
        expect(p, `${h.name} from ${h.start}`).toBeDefined()
        expect(p!.detail?.planet).toBe(h.name.toLowerCase())
        near(p!.end, new Date(Math.min(Date.parse(h.end), window.end.getTime())), 2)
      }
      // the horas before sunrise are the previous day's last night horas
      expect(ours[0].start.getTime()).toBe(window.start.getTime())
    })
  }
  it('Vilnius 2026-10-10 (Saturday): Saturn first; + for the groups of its weekday class', () => {
    const hs = periodsOf('2026-10-10').periods.filter((p) => p.kind === 'hora' && p.start >= L('2026-10-10', '07:30'))
    expect(hs.slice(0, 7).map((p) => p.detail?.planet)).toEqual(['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'])
    const groups = Object.fromEntries(hs.slice(0, 7).map((p) => [p.detail!.planet, p.groups]))
    expect(groups).toEqual({ sun: [0, 3, 8, 9], moon: [1], mars: [], mercury: [], jupiter: [1, 4, 5, 6], venus: [2, 5], saturn: [] })
    expect(hs.every((p) => p.level === 'plus' && p.decides)).toBe(true)
  })
})

// Tri / Dwi Pushkara (R24, [MC] 2.50): a Bhadra-class tithi (2, 7, 12) on Sunday, Tuesday or
// Saturday with Vishakha, U.Phalguni, P.Bhadrapada, Punarvasu, Krittika or U.Ashadha (×3), or
// with Dhanishtha, Chitra or Mrigashira (×2). A note: shown, never decides (SPEC 13.2).
describe('Tri / Dwi Pushkara (R24) against Drik', () => {
  let seen = 0
  for (const file of readdirSync('tests/fixtures/drik')) {
    const f = JSON.parse(readFileSync(`tests/fixtures/drik/${file}`, 'utf8'))
    if (!f.nextSunrise) continue
    it(`${f.city} ${f.date}`, () => {
      const x = CITIES[f.city as keyof typeof CITIES]
      const place: Location = { name: x.drikName, country: '', lat: x.lat, lon: x.lon, elevation: x.elevation, tz: x.tz }
      const { window, periods } = dayPeriods(computeDay(f.date, place), computeDay(addDays(f.date, -1), place))
      const sr = Date.parse(f.sunrise)
      const ours = periods.filter((p) => p.kind === 'pushkara' && p.start.getTime() >= sr - 2 * MIN)
      expect(ours.every((p) => !p.decides)).toBe(true)
      const drik = [3, 2].flatMap((times) =>
        ((f.raw['Auspicious Timings']?.[`${times === 3 ? 'Tri' : 'Dwi'} Pushkara Yoga`] ?? []) as string[]).map((v) => ({ times, ...range(f.tz, f.date, v)! })),
      )
      expect(ours.map((p) => p.detail?.times)).toEqual(drik.map((d) => d.times))
      drik.forEach((d, i) => {
        near(ours[i].start, new Date(d.start), 2)
        near(ours[i].end, new Date(Math.min(Date.parse(d.end), window.end.getTime())), 2)
        seen++
      })
    })
  }
  it('the fixtures hold both kinds', () => expect(seen).toBeGreaterThanOrEqual(10))
})

// Sankranti (R26, [MC] 3.8): 16 ghatikas before the Sun enters Karka, Vrishabha, Simha,
// Vrishchika or Kumbha; 8 + 8 around Tula and Mesha; 16 after Mithuna, Kanya, Dhanu, Meena,
// Makara — + for spiritual rites (7). The entry instant is the day mark (checked vs Drik),
// within 2 min: the mark takes the ayanamsha at the month's start, the day at its own.
describe('Sankranti window (R26)', () => {
  const GH = 24 * MIN
  const span: Record<number, [number, number]> = { 4: [16, 0], 2: [16, 0], 5: [16, 0], 8: [16, 0], 11: [16, 0], 7: [8, 8], 1: [8, 8], 3: [0, 16], 6: [0, 16], 9: [0, 16], 12: [0, 16], 10: [0, 16] }
  const signs = new Set<number>()
  for (let i = 0; i < 365; i += 1) {
    const date = addDays('2026-01-01', i)
    const mk = computeDay(date, VILNIUS).marks.find((m) => m.kind === 'sankranti')
    if (!mk || mk.kind !== 'sankranti') continue
    signs.add(mk.sign)
    it(`Vilnius ${date}: the Sun enters sign ${mk.sign}`, () => {
      const [before, after] = span[mk.sign]
      const from = mk.at.getTime() - before * GH, to = mk.at.getTime() + after * GH
      // the window may fall on the day before or this one: look at both
      const ps = [addDays(date, -1), date, addDays(date, 1)].flatMap((d) => periodsOf(d).periods.filter((p) => p.kind === 'sankranti'))
      expect(ps.length).toBeGreaterThan(0)
      for (const p of ps) {
        expect(p).toMatchObject({ level: 'plus', groups: [7], decides: true })
        expect(p.start.getTime()).toBeGreaterThanOrEqual(from - 2 * MIN)
        expect(p.end.getTime()).toBeLessThanOrEqual(to + 2 * MIN)
      }
      expect(Math.abs(Math.min(...ps.map((p) => p.start.getTime())) - from)).toBeLessThan(2 * MIN)
      expect(Math.abs(Math.max(...ps.map((p) => p.end.getTime())) - to)).toBeLessThan(2 * MIN)
    })
  }
  it('the year has all 12', () => expect(signs.size).toBe(12))
})

// Month rules (SPEC 13.3): vetoes for the groups the record names, for as long as they last.
// M1's Adhika month and M2 for travel, marriage, home, rites and official work; M5 (outside the
// marriage months) and M6 (Chaturmas) for marriage. M1's combustion: not yet.
describe('month rules (M1 Adhika, M2, M5, M6)', () => {
  const RITES = [1, 2, 3, 7, 9]
  /** Groups for which `rule` covers the whole day window. */
  const wholeDay = (date: string, rule: string) => {
    const { window, periods } = periodsOf(date)
    const ps = periods.filter((p) => p.kind === 'month' && p.rule === rule)
    for (const p of ps) {
      expect(p.level).toBe('veto')
      expect([p.start.getTime(), p.end.getTime()], `${rule} ${date}`).toEqual([window.start.getTime(), window.end.getTime()])
    }
    return ps.flatMap((p) => p.groups)
  }
  it('Adhika Jyeshtha 2026: 2026-06-08 is in it, 2026-06-21 is not (M1)', () => {
    expect(wholeDay('2026-06-08', 'M1')).toEqual(RITES)
    expect(wholeDay('2026-06-21', 'M1')).toEqual([])
  })
  it('Jupiter in Magha – P.Phalguni 1 from 2026-11-01 (M2)', () => {
    expect(wholeDay('2026-11-24', 'M2')).toEqual(RITES)
    expect(wholeDay('2026-10-25', 'M2')).toEqual([])
  })
  it('the Sun in Kanya or Tula is outside the marriage months, in Vrishchika inside (M5)', () => {
    expect(wholeDay('2026-10-06', 'M5')).toEqual([2])
    expect(wholeDay('2026-10-25', 'M5')).toEqual([2])
    expect(wholeDay('2026-11-24', 'M5')).toEqual([])
  })
  it('Chaturmas, Ashadha Shukla 11 to Kartika Shukla 11: 2026-10-10 in, 2026-11-24 out (M6)', () => {
    expect(wholeDay('2026-10-10', 'M6')).toEqual([2])
    expect(wholeDay('2026-11-24', 'M6')).toEqual([])
  })
})

it('every moment of the day belongs to exactly one segment, for every group', () => {
  for (const date of ['2026-10-10', '2026-10-06', '2026-10-25', '2026-05-10']) {
    const day = computeDay(date, VILNIUS), prev = computeDay(addDays(date, -1), VILNIUS)
    const { window } = dayPeriods(day, prev)
    for (let g = 0; g < 10; g++) {
      const segs = daySegments(day, prev, g)
      expect(segs[0].start.getTime()).toBe(window.start.getTime())
      expect(segs[segs.length - 1].end.getTime()).toBe(window.end.getTime())
      segs.forEach((s, i) => i && expect(s.start.getTime()).toBe(segs[i - 1].end.getTime()))
      // no segment is good while a veto is active
      for (const s of segs) if (s.verdict === 'good') expect(s.by.some((p) => p.level === 'veto')).toBe(false)
    }
  }
})

it('the day clock names every period and colours every shade in both palettes', async () => {
  const { periodName, levelWord, colourVar, clockModel } = await import('../src/ui/verdict')
  for (const date of ['2026-10-10', '2026-10-06', '2026-10-25', '2026-05-10']) {
    const day = computeDay(date, VILNIUS), prev = computeDay(addDays(date, -1), VILNIUS)
    for (const p of dayPeriods(day, prev).periods) {
      expect(periodName(p), p.kind).toMatch(/\S/)
      expect(levelWord(p), p.kind).toMatch(/\S/)
      for (const palette of ['current', 'rainbow'] as const) expect(colourVar(p.level, palette)).toMatch(/^--/)
    }
    expect(clockModel(day, prev, 0)?.segments.length).toBeGreaterThan(0)
  }
})
