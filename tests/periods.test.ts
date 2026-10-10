// Day periods and the segment verdict (SPEC 13.2–13.4, PLAN-periods Q4–Q5 step 1).
// Expected times come from the Drik fixtures and the worked examples in
// .planning/research/examples.md (Vilnius); verdicts are checked only at moments where no
// value from the `missing` list (Dur Muhurtam, Varjyam, Amrit Kalam, lagna junctions, Baana,
// eclipse star, month rules) is active.
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { dayPeriods, daySegments, verdictOf, type Period } from '../src/core/periods'
import { addDays, zonedTimeToUtc } from '../src/core/time'
import type { Location } from '../src/core/types'
import { CITIES } from '../scripts/cities'

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
  it('group 7: Amavasya no veto, Brahma Muhurta lifts the poor base to neutral, Abhijit good', () => {
    // Amavasya is the last of the dark half's five low tithis (D4): base poor; BM + → neutral.
    expect(verdictAt('2026-10-10', 7, L('2026-10-10', '06:10')).verdict).toBe('neutral')
    expect(verdictAt('2026-10-10', 7, L('2026-10-10', '06:55')).verdict).toBe('fb') // BM over, base poor
    const a = verdictAt('2026-10-10', 7, L('2026-10-10', '13:20'))
    expect(a).toMatchObject({ verdict: 'good', strong: true })
    expect(verdictAt('2026-10-10', 7, L('2026-10-10', '13:05')).verdict).toBe('avoid') // noon window inside Abhijit
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
  it('group 0: neutral morning, avoid in Navami, fb at night', () => {
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '08:00')).verdict).toBe('neutral')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '16:00')).verdict).toBe('avoid')
    expect(verdictAt('2026-05-10', 0, L('2026-05-10', '23:00')).verdict).toBe('fb')
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
