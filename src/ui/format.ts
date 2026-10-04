// Presentation helpers shared by the mockups (P3) and the app screens (P4).
import en from '../content/en.json'
import { addDays, civilDate } from '../core/time'
import type { DayPanchang, Location, Span } from '../core/types'

export const content = en
type Entry = { name: string; title: string; meaning: string }
export type Group = 'tithi' | 'nakshatra' | 'yoga' | 'karana' | 'vara'

export const entry = (group: Group, index: number): Entry =>
  (en[group] as Record<string, Entry>)[String(index)]

/** UI label with {placeholders}. */
export function t(key: keyof typeof en.ui, vars: Record<string, string | number> = {}): string {
  return en.ui[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

export function sheet(key: keyof typeof en.sheets, vars: Record<string, string | number> = {}): string {
  return en.sheets[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

const timeFormats = new Map<string, Intl.DateTimeFormat>()
/** Time of day in the location's zone, in the device's 12/24-hour preference. */
export function time(d: Date | null, loc: Location): string {
  if (!d) return t('none')
  let f = timeFormats.get(loc.tz)
  if (!f) timeFormats.set(loc.tz, (f = new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: loc.tz })))
  return f.format(d)
}

/** "until 21:43", "until 01:23 tomorrow", or "until Tue 03:10" for later days. */
export function until(end: Date, day: DayPanchang, loc: Location): string {
  const endDay = civilDate(loc.tz, end)
  if (endDay === day.date) return t('until', { time: time(end, loc) })
  if (endDay === addDays(day.date, 1)) return t('untilTomorrow', { time: time(end, loc) })
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: loc.tz }).format(end)
  return t('until', { time: `${weekday} ${time(end, loc)}` })
}

/** Spans of an element that matter for the day: the one at sunrise, then any that follow. */
export function current(spans: Span[]): { now: Span | undefined; next: Span | undefined } {
  return { now: spans[0], next: spans[1] }
}

/** Fraction (0-1) of a span elapsed at `at`. */
export const progress = (s: Span, at: Date) =>
  Math.min(1, Math.max(0, (at.getTime() - s.start.getTime()) / (s.end.getTime() - s.start.getTime())))

/**
 * The Moon as an SVG: a dark disc with the lit part drawn on the right while waxing and on
 * the left while waning (as seen from the northern hemisphere).
 */
export function moonSvg(illumination: number, waxing: boolean, size: number, label: string): string {
  const r = size / 2 - 1
  const c = size / 2
  const rx = Math.abs(1 - 2 * illumination) * r
  const crescent = illumination < 0.5
  const outer = waxing ? 1 : 0
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0
  const lit =
    illumination < 0.005
      ? ''
      : illumination > 0.995
        ? `<circle cx="${c}" cy="${c}" r="${r}" fill="var(--color-moon)"/>`
        : `<path d="M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${inner} ${c} ${c - r} Z" fill="var(--color-moon)"/>`
  return `<svg class="moon" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label}"><circle cx="${c}" cy="${c}" r="${r}" fill="var(--color-moon-dark)"/>${lit}</svg>`
}

export const percent = (x: number) => Math.round(x * 100)
