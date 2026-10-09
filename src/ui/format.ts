// Presentation helpers shared by the mockups (P3) and the app screens (P4).
import en from '../content/en.json'
import lt from '../content/lt.json'
import { addDays, civilDate } from '../core/time'
import type { DayPanchang, Location, Span } from '../core/types'

export type Lang = 'en' | 'lt'
export const LANGS: Lang[] = ['en', 'lt']

/**
 * The language is fixed for the life of the page: the one chosen in Settings, else the
 * device's (Lithuanian devices get Lithuanian), else English. Changing it in Settings saves
 * and reloads, so every label computed at load time follows. Tests run outside a browser and
 * always get English.
 */
function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    const chosen = JSON.parse(localStorage.getItem('vedacal.settings') ?? '{}').lang
    if (LANGS.includes(chosen)) return chosen
  } catch {
    // Storage blocked: fall back to the device language.
  }
  return navigator.language?.toLowerCase().startsWith('lt') ? 'lt' : 'en'
}

export const LANG = detectLang()
// lt.json has en.json's exact shape (tests/content.test.ts checks every key).
export const content: typeof en = LANG === 'lt' ? (lt as unknown as typeof en) : en
type Entry = { name: string; title: string; meaning: string }
export type Group = 'tithi' | 'nakshatra' | 'yoga' | 'karana' | 'vara'

export const entry = (group: Group, index: number): Entry =>
  (content[group] as Record<string, Entry>)[String(index)]

/** UI label with {placeholders}. */
export function t(key: keyof typeof en.ui, vars: Record<string, string | number> = {}): string {
  return content.ui[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

export function sheet(key: keyof typeof en.sheets, vars: Record<string, string | number> = {}): string {
  return content.sheets[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

/** A day-specific sheet line with {placeholders} (user, 2026-10-10: say what it means today). */
export function lead(key: keyof typeof en.leads, vars: Record<string, string | number> = {}): string {
  return content.leads[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

/** What tradition does in a time window, said once: in its day sheet and on the About page. */
export const tradition = (key: string): string => (content.tradition as Record<string, string>)[key] ?? ''

/** A row's sheet opens on this: what its value means on this day. `title` may be ''. */
export type Lead = { title: string; text: string }

/**
 * Dates and times are written in the app's language, not the device's: an English page on a
 * Lithuanian phone would otherwise mix "popiet" or "spal." into English sentences.
 */
export const LOCALE: string = LANG
/** Month in short dates: "Oct 17" in English; Lithuanian's short form is numeric ("10-17"), so "spalio 17 d.". */
export const MONTH: 'short' | 'long' = LANG === 'lt' ? 'long' : 'short'

const regions = new Intl.DisplayNames([LOCALE], { type: 'region' })
/** Country name in the app's language ("LT" → "Lithuania" / "Lietuva"); GeoNames' English name as fallback. */
export const countryName = (cc: string, fallback: string) => {
  try {
    return regions.of(cc) ?? fallback
  } catch {
    return fallback
  }
}

/** Display preferences set from Settings (src/ui/state.svelte.ts). hour12 undefined = the device's habit. */
export const prefs: { hour12: boolean | undefined } = { hour12: undefined }

/** Whether this device writes times with AM/PM. */
export const deviceHour12 = () => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? false

const timeFormats = new Map<string, Intl.DateTimeFormat>()
/** Time of day in the location's zone, 12- or 24-hour as set (default: the device's habit). */
export function time(d: Date | null, loc: Location): string {
  if (!d) return t('none')
  const k = `${loc.tz}|${prefs.hour12}`
  let f = timeFormats.get(k)
  if (!f) timeFormats.set(k, (f = new Intl.DateTimeFormat(LOCALE, { timeStyle: 'short', timeZone: loc.tz, hour12: prefs.hour12 ?? deviceHour12() })))
  return f.format(d)
}

/** "until 21:43", "until 01:23 tomorrow", "until Tue 03:10" within a week, "until Oct 17" later (the Sun's sign). */
export function until(end: Date, day: DayPanchang, loc: Location): string {
  const endDay = civilDate(loc.tz, end)
  if (endDay === day.date) return t('until', { time: time(end, loc) })
  if (endDay === addDays(day.date, 1)) return t('untilTomorrow', { time: time(end, loc) })
  if (endDay > addDays(day.date, 6))
    return t('untilDate', { date: new Intl.DateTimeFormat(LOCALE, { month: MONTH, day: 'numeric', timeZone: loc.tz }).format(end) })
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: loc.tz }).format(end)
  return t('until', { time: `${weekday} ${time(end, loc)}` })
}

/** Spans of an element that matter for the day: the one at sunrise, then any that follow. */
export function current(spans: Span[]): { now: Span | undefined; next: Span | undefined } {
  return { now: spans[0], next: spans[1] }
}

/** Fraction (0-1) of a span elapsed at `at`. */
export const progress = (s: Span, at: Date) =>
  Math.min(1, Math.max(0, (at.getTime() - s.start.getTime()) / (s.end.getTime() - s.start.getTime())))

export const percent = (x: number) => Math.round(x * 100)
