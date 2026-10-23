// Week screen logic (user, 2026-10-23): the Monday–Sunday range, the daytime average, the star
// rule and the shared axis.
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import type { Segment, Tier } from '../src/core/periods'
import { addDays } from '../src/core/time'
import { averagePos, axisStartHour, axisWindow, axisX, barGradient, hasStar, mondayOf, scaleColour, weekDates, weekLabel, weekModel } from '../src/ui/week'

const TZ = 'Europe/Vilnius'
const VILNIUS = { name: 'Vilnius', country: 'Lithuania', lat: 54.6892, lon: 25.2798, elevation: 98, tz: TZ }
const at = (iso: string) => new Date(iso)
const seg = (tier: Tier, from: string, to: string): Segment => ({ start: at(from), end: at(to), verdict: 'neutral', strong: false, tier, by: [], active: [], cancelled: [] })
/** Segments of the given tiers, back to back from 00:00Z, each lasting the given minutes. */
function run(...parts: [Tier, number][]): Segment[] {
  let t = Date.UTC(2026, 9, 20)
  return parts.map(([tier, m]) => {
    const s = { ...seg(tier, '2026-10-20T00:00Z', '2026-10-20T00:00Z'), start: new Date(t), end: new Date(t + m * 60_000) }
    t += m * 60_000
    return s
  })
}

describe('week dates', () => {
  it('mid-week date gives Monday to Sunday', () => {
    expect(weekDates('2026-10-23')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
    expect(weekLabel(weekDates('2026-10-23'))).toBe('2026-10-19 – 10-25')
  })
  it('Monday and Sunday stay in their own week', () => {
    expect(mondayOf('2026-10-19')).toBe('2026-10-19')
    expect(mondayOf('2026-10-25')).toBe('2026-10-19')
  })
  it('the week of 2026-10-26 (after the clocks go back on Sunday 10-25) is 10-26 to 11-01', () => {
    expect(weekDates('2026-10-26')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
    expect(weekLabel(weekDates('2026-10-26'))).toBe('2026-10-26 – 11-01')
  })
  it('the week that contains the change (10-19 to 10-25) is seven different dates', () => {
    const w = weekDates('2026-10-25')
    expect(w[0]).toBe('2026-10-19')
    expect(new Set(w).size).toBe(7)
    expect(addDays(w[6], 1)).toBe('2026-10-26')
  })
  it('names the year when the week crosses New Year', () => {
    expect(weekLabel(weekDates('2026-12-31'))).toBe('2026-12-28 – 2027-01-03')
  })
})

describe('daytime average', () => {
  it('half neutral (3) and half goodBase (5) averages 4', () => {
    const segs = run(['neutral', 120], ['goodBase', 120])
    expect(averagePos(segs, segs[0].start, segs[1].end)).toBeCloseTo(4, 6)
  })
  it('weighs by time: 3 h of neutral and 1 h of best (6) gives 3.75', () => {
    const segs = run(['neutral', 180], ['best', 60])
    // the 20 minute fade at the edge is symmetric around the midpoint of the two shades
    expect(averagePos(segs, segs[0].start, segs[1].end)).toBeCloseTo(3.75, 1)
  })
  it('an empty span has no average', () => {
    const segs = run(['neutral', 60])
    expect(averagePos(segs, segs[0].start, segs[0].start)).toBeNull()
  })
})

describe('star rule', () => {
  it('47 minutes of goodBase: no; 48: yes', () => {
    expect(hasStar(run(['neutral', 60], ['goodBase', 47], ['neutral', 60]))).toBe(false)
    expect(hasStar(run(['neutral', 60], ['goodBase', 48], ['neutral', 60]))).toBe(true)
  })
  it('best counts, goodPlus does not', () => {
    expect(hasStar(run(['neutral', 60], ['best', 60]))).toBe(true)
    expect(hasStar(run(['neutral', 60], ['goodPlus', 300]))).toBe(false)
  })
  it('touching best and goodBase segments make one window', () => {
    expect(hasStar(run(['best', 30], ['goodBase', 20]))).toBe(true)
    expect(hasStar(run(['best', 30], ['neutral', 5], ['goodBase', 30]))).toBe(false)
  })
})

describe('axis', () => {
  it('starts at the earliest clock time of day start, rounded down to the hour', () => {
    // 06:20 EEST, 07:55 EET (after the change), 06:59 EET
    expect(axisStartHour([at('2026-10-20T03:20Z'), at('2026-10-27T05:55Z'), at('2026-10-28T04:59Z')], TZ)).toBe(6)
    expect(axisStartHour([at('2026-10-27T05:00Z')], TZ)).toBe(7)
    expect(axisStartHour([], TZ)).toBeNull()
  })
  it('runs 24 clock hours, also across the change (25 real hours on 10-25)', () => {
    const w = axisWindow('2026-10-25', 1, TZ)
    expect(w.end.getTime() - w.start.getTime()).toBe(25 * 3_600_000)
    expect(axisX(w.start, w, TZ)).toBe(0)
    expect(axisX(w.end, w, TZ)).toBe(1)
    const n = axisWindow('2026-10-20', 5, TZ)
    expect(axisX(new Date(n.start.getTime() + 12 * 3_600_000), n, TZ)).toBe(0.5)
  })
  it('scale colour blends the neighbouring scale colours', () => {
    const rgb = [[0, 0, 0], [100, 100, 100], [200, 200, 200]]
    expect(scaleColour(rgb, 0.5)).toBe('rgb(50,50,50)')
    expect(scaleColour(rgb, 2)).toBe('rgb(200,200,200)')
  })
})

describe('a real week, Vilnius 2026-10-26', () => {
  const dates = weekDates('2026-10-26')
  const days = dates.map((d) => computeDay(d, VILNIUS))
  const before = computeDay(addDays(dates[0], -1), VILNIUS)
  const week = weekModel(days, before, 0, null, null)
  it('has seven day models, averages on the scale', () => {
    expect(week).toHaveLength(7)
    for (const w of week) {
      expect(w).not.toBeNull()
      expect(w!.avg).toBeGreaterThanOrEqual(0)
      expect(w!.avg).toBeLessThanOrEqual(6)
    }
  })
  it('bars paint inside the shared axis', () => {
    const hour = axisStartHour(week.map((w) => w!.model.window.start), VILNIUS.tz)!
    const rgb = Array.from({ length: 7 }, (_, i) => [i * 30, 0, 0])
    for (const w of week) {
      const g = barGradient(w!.model, axisWindow(w!.date, hour, VILNIUS.tz), VILNIUS.tz, rgb)
      expect(g.startsWith('linear-gradient(')).toBe(true)
      const xs = [...g.matchAll(/ ([\d.]+)%/g)].map((m) => Number(m[1]))
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...xs)).toBeLessThanOrEqual(100)
      expect(xs).toEqual([...xs].sort((a, b) => a - b))
    }
  })
})
