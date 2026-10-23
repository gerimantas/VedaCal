// Week screen as plain data: the Monday–Sunday dates, each day's clock model, the daytime
// average colour position, the star rule and the shared hour axis. Week.svelte draws it; the
// verdicts themselves come from clockModel/scalePos (./verdict), nothing is re-derived here.
import type { Birth, Direction, Segment } from '../core/periods'
import { addDays, tzOffsetMinutes, zonedTimeToUtc } from '../core/time'
import type { DayPanchang } from '../core/types'
import { clockModel, scalePos, type ClockModel } from './verdict'

const MIN = 60_000
const DAY = 86_400_000

/** A 'best' or 'goodBase' window at least this long puts a star on the day (user, 2026-10-23). */
export const STAR_MINUTES = 48

/** Monday of the ISO week (as in Lithuania) that contains the civil date. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = Sunday
  return addDays(date, -((dow + 6) % 7))
}

/** The seven civil dates, Monday first. Plain calendar arithmetic, so a DST change cannot shift it. */
export const weekDates = (date: string): string[] => {
  const mon = mondayOf(date)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

/** "2026-10-19 – 10-25"; the year is repeated only when the week crosses New Year. */
export function weekLabel(dates: string[]): string {
  const [a, b] = [dates[0], dates[dates.length - 1]]
  return `${a} – ${a.slice(0, 4) === b.slice(0, 4) ? b.slice(5) : b}`
}

/** Local clock minutes since midnight (0..1439) of an instant. */
export const minuteOfDay = (d: Date, tz: string): number => (((d.getTime() / MIN + tzOffsetMinutes(tz, d)) % 1440) + 1440) % 1440

/**
 * The mean position on the rainbow scale (0..6) over [from, to): sampled at the middle of every
 * minute, so each minute weighs the same. Null when the span is empty.
 */
export function averagePos(segs: Segment[], from: Date, to: Date): number | null {
  const n = Math.floor((to.getTime() - from.getTime()) / MIN)
  if (n <= 0) return null
  let sum = 0
  for (let k = 0; k < n; k++) sum += scalePos(segs, new Date(from.getTime() + (k + 0.5) * MIN))
  return sum / n
}

/** True when a run of 'best' / 'goodBase' segments, touching end to start, lasts `minutes` or more. */
export function hasStar(segs: Segment[], minutes = STAR_MINUTES): boolean {
  let run = 0
  let prevEnd = NaN
  for (const s of segs) {
    if (s.tier !== 'best' && s.tier !== 'goodBase') {
      run = 0
      continue
    }
    run = s.start.getTime() === prevEnd ? run + (s.end.getTime() - s.start.getTime()) : s.end.getTime() - s.start.getTime()
    prevEnd = s.end.getTime()
    if (run >= minutes * MIN) return true
  }
  return false
}

/**
 * First hour of the shared axis: the earliest day start (T0) of the week by clock time, rounded
 * down to the full hour. Null when no day has a start (polar).
 */
export function axisStartHour(starts: Date[], tz: string): number | null {
  if (!starts.length) return null
  return Math.floor(Math.min(...starts.map((d) => minuteOfDay(d, tz))) / 60)
}

/** The 24 hours of `date`'s bar: from clock hour `hour` on that date to the same hour on the next. */
export function axisWindow(date: string, hour: number, tz: string): { start: Date; end: Date } {
  const at = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number)
    return zonedTimeToUtc(tz, y, m, dd, hour)
  }
  return { start: at(date), end: at(addDays(date, 1)) }
}

/** Where an instant sits on the bar, 0..1 of the 24 clock hours (wall time, so a DST change is a jump). */
export function axisX(t: Date, win: { start: Date; end: Date }, tz: string): number {
  const wall = (d: Date) => d.getTime() + tzOffsetMinutes(tz, d) * MIN
  return (wall(t) - wall(win.start)) / DAY
}

export type WeekDay = {
  date: string
  model: ClockModel
  /** Mean position on the rainbow scale over sunrise → sunset. */
  avg: number
  star: boolean
}

/**
 * One entry per date (null where the day has no sunrise or sunset). `days` are the date's
 * panchang values in order and `before` the day before the first one.
 */
export function weekModel(days: DayPanchang[], before: DayPanchang, group: number, dir: Direction | null, birth: Birth | null): (WeekDay | null)[] {
  return days.map((day, i) => {
    const model = clockModel(day, i ? days[i - 1] : before, group, dir, birth)
    if (!model) return null
    return { date: day.date, model, avg: averagePos(model.segments, model.sunrise, model.sunset) ?? 3, star: hasStar(model.segments) }
  })
}

/** The colour at a position on the scale: RGB blend of the two neighbouring scale colours (as the ring does). */
export function scaleColour(scaleRgb: number[][], pos: number): string {
  const lo = Math.max(0, Math.min(scaleRgb.length - 1, Math.floor(pos)))
  const hi = Math.min(scaleRgb.length - 1, Math.ceil(pos))
  const f = pos - lo
  return `rgb(${scaleRgb[lo].map((v, i) => Math.round(v + (scaleRgb[hi][i] - v) * f)).join(',')})`
}

/**
 * A day's bar as a CSS gradient over the axis. Only the day's own window is painted (before its
 * start belongs to the previous day); the rest stays transparent. Sampled every 4 minutes.
 */
export function barGradient(model: ClockModel, win: { start: Date; end: Date }, tz: string, scaleRgb: number[][]): string {
  const from = Math.max(win.start.getTime(), model.window.start.getTime())
  const to = Math.min(win.end.getTime(), model.window.end.getTime())
  if (to <= from) return 'none'
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`
  let last = axisX(new Date(from), win, tz)
  const stops = [`transparent ${pct(last)}`]
  for (let t = from; ; t = Math.min(t + 4 * MIN, to)) {
    // Wall time can step back at the autumn change; keep the stops in order.
    last = Math.max(last, axisX(new Date(t), win, tz))
    stops.push(`${scaleColour(scaleRgb, scalePos(model.segments, new Date(Math.min(t, to - 1))))} ${pct(last)}`)
    if (t >= to) break
  }
  stops.push(`transparent ${pct(last)}`)
  return `linear-gradient(to right, ${stops.join(', ')})`
}
