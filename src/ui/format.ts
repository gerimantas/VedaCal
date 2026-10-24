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
type Entry = { name: string; title: string; meaning: string; source: string }
export type Group = 'tithi' | 'nakshatra' | 'yoga' | 'karana' | 'vara'

export const entry = (group: Group, index: number): Entry =>
  (content[group] as Record<string, Entry>)[String(index)]

/** A value's meaning and, after it, where it comes from (user, 2026-10-14: no claim without a source). */
export const sourced = (e: { meaning: string; source: string }): string => `${e.meaning} ${t('source')}: ${e.source}.`

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
/** Where a tradition text comes from (rules.md records); every text has one. */
export const traditionSource = (key: string): string => (content.traditionSource as Record<string, string>)[key] ?? ''

/** A row's sheet opens on this: what its value means on this day. `title` may be ''. */
export type Lead = { title: string; text: string }

/**
 * Dates and times are written in the app's language, not the device's: an English page on a
 * Lithuanian phone would otherwise mix "popiet" or "spal." into English sentences.
 */
export const LOCALE: string = LANG
/** Month in short dates: "Oct 17" in English; Lithuanian's short form is numeric ("10-17"), so "spalio 17 d.". */
export const MONTH: 'short' | 'long' = LANG === 'lt' ? 'long' : 'short'

/** The top bar's date, "2026-10-14, tr" (user, 2026-10-14): the civil date as is, then its weekday. */
export const barDate = (date: string) =>
  `${date}, ${new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))}`

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

/** A span as "1 h 10 min", "40 min" or "4 h" (the same in both languages). */
export function duration(ms: number): string {
  const m = Math.round(ms / 60_000)
  const h = Math.floor(m / 60)
  return [h ? `${h} h` : '', m % 60 || !h ? `${m % 60} min` : ''].filter(Boolean).join(' ')
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

/** Escapes text for {@html}. */
export const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * Text as HTML with the given Sanskrit names in `<span class="sk">` (user, 2026-10-24: Sanskrit is
 * yellow everywhere). Everything else is escaped. Names match whole words only, case-sensitively,
 * longest first, so "Shukla Pratipada" wins over "Shukla" and "Rog" is not found inside "Rogas".
 * `protect` phrases (brand names) are kept whole and left unmarked, so "Drik Panchang" stays plain.
 */
const reCache = new Map<string, RegExp>()
export function markSanskrit(text: string, names: readonly string[], protect: readonly string[] = []): string {
  const guard = new Set(protect.filter(Boolean))
  const list = [...new Set([...names.filter(Boolean), ...guard])].sort((a, b) => b.length - a.length)
  if (!list.length) return escHtml(text)
  const key = `${list.join('|')}#${[...guard].join('|')}`
  let re = reCache.get(key)
  if (!re) {
    const word = String.raw`[\p{L}\p{N}]`
    const alt = list.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    re = new RegExp(`(?<!${word})(?:${alt})(?!${word})`, 'gu')
    reCache.set(key, re)
  }
  let out = '', last = 0
  for (const m of text.matchAll(re)) {
    const hit = escHtml(m[0])
    out += escHtml(text.slice(last, m.index)) + (guard.has(m[0]) ? hit : `<span class="sk">${hit}</span>`)
    last = m.index + m[0].length
  }
  return out + escHtml(text.slice(last))
}

// Sanskrit words that sit inside UI text and are not an entry name.
const EXTRA_SANSKRIT = ['Ekadashi', 'Parana', 'Bhadra', 'Vishti', 'Amavasya', 'Purnima', 'parvan', 'Tithi', 'Vara', 'Masa', 'Nakshatra', 'Rashi', 'Yoga', 'Karana', 'Ritu', 'Choghadiya', 'Brahma Muhurta', 'Abhijit Muhurta', 'Rahu Kaal', 'Yamaganda', 'Gulika', 'Vyatipata', 'Vaidhriti', 'Sankranti', 'Grahan', 'Amrit Siddhi', 'Sarvartha Siddhi', 'Guru Pushya', 'Ravi Pushya', 'Nanda', 'Jaya', 'Rikta', 'Purna']
// Sanskrit words found in running text (sheets, meanings, traditions, guide). Lowercase forms are
// listed where the prose writes them lowercase. Matching is whole-word and case-sensitive.
const PROSE_SANSKRIT = [
  // calendar terms
  'Panchang', 'Muhurta', 'Muhurtha', 'Muhurtas', 'muhurta', 'muhurtas', 'tithi', 'nakshatra', 'yoga', 'yogas', 'karana', 'vara', 'masa', 'rashi', 'ritu', 'hora', 'tara',
  'Hora', 'Tara', 'Graha', 'Lagna', 'Sandhya', 'Pratah Sandhya', 'Gandanta', 'Chaturmas', 'Adhika', 'adhika', 'Ayana', 'Paksha', 'paksha', 'paksha-randhra', 'Randhra',
  'ekadashi', 'choghadiya', 'sankranti', 'bhadra', 'asta', 'Asta', 'ghatika', 'ghatikas', 'pala', 'palas', 'Kaal', 'Dur Muhurtam', 'Disha Shool', 'Anandadi', 'Tarabala', 'Chandrabala', 'Chandrashtama',
  'Shukla', 'Krishna', 'Rahu', 'Ketu', 'Yama', 'Hari Vasara', 'Vasara', 'Dwadashi', 'Siddhi', 'Sarvartha', 'Amrit', 'Labh', 'Chal', 'Udveg', 'Rog', 'Gulikai', 'Hari-shayana',
  // seasons
  'Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta', 'Shishira',
  // yogas, signs, stars and months named in prose
  'Parigha', 'Vishkambha', 'Vajra', 'Shula', 'Ganda', 'Atiganda', 'Vyaghata',
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
  'Ashwini', 'Mrigashira', 'Ashlesha', 'Magha', 'Phalguni', 'P.Phalguni', 'Hasta', 'Chitra', 'Anuradha', 'Jyeshtha', 'Mula', 'Revati', 'Rohini', 'Pushya', 'Krittika', 'Vishakha', 'Purva', 'Ashadha', 'Shravana',
  'Chaitra', 'Kartika', 'Bhadrapada', 'Janma', 'Vipat', 'Pratyari', 'Vadha',
  'Mrityu', 'Baana', 'Roga', 'Chora', 'Raja', 'Padma',
  // festivals
  'Ugadi', 'Gudi Padwa', 'Navaratri', 'Rama Navami', 'Hanuman Jayanti', 'Akshaya Tritiya', 'Buddha Purnima', 'Ganga Dussehra', 'Dussehra', 'Nirjala', 'Ratha Yatra', 'Devshayani', 'Nag Panchami',
  'Raksha Bandhan', 'Janmashtami', 'Ganesh Chaturthi', 'Pitru Paksha', 'Diwali', 'Govardhan Puja', 'Bhai Dooj', 'Gita Jayanti', 'Dattatreya Jayanti', 'Vasant Panchami', 'Maha Shivaratri', 'Holi',
  // books
  'Muhurta Chintamani', 'Brihat Samhita', 'Kalaprakasika', 'Dharmasutra', 'Ashtanga Hridaya', 'Sutrasthana',
  // deities named in meanings
  'Agni', 'Brahma', 'brahma', 'Ganesha', 'Shiva', 'Durga', 'Vishnu', 'Skanda', 'Kartikeya', 'Surya', 'Gauri', 'Kama', 'Chandra', 'Soma', 'Rudra', 'Aditi', 'Brihaspati', 'Bhaga', 'Aryaman', 'Savitar', 'Tvashtar',
  'Vayu', 'Indra', 'Mitra', 'Nirriti', 'Apah', 'Vasus', 'Varuna', 'Aja Ekapada', 'Ahirbudhnya', 'Pushan', 'Vishvedevas', 'Pitris', 'Ashvins', 'Sarpa', 'Maruta', 'Vrisha',
]
// Brand names are never Sanskrit-marked: the whole phrase is skipped.
export const PROTECTED_PHRASES: readonly string[] = ['Drik Panchang', 'Shubh Panchang', 'mypanchang', 'Mypanchang', 'panchangam-js', 'VedaCal']
const NAMED_GROUPS = ['tithi', 'vara', 'masa', 'nakshatra', 'rashi', 'yoga', 'karana', 'choghadiya', 'rhythm'] as const
/** Every Sanskrit name the content knows: entry names plus the words above. */
export const SANSKRIT_NAMES: readonly string[] = [
  ...NAMED_GROUPS.flatMap((g) => Object.values(content[g] as Record<string, { name?: string }>).map((e) => e.name ?? '')),
  ...EXTRA_SANSKRIT,
  ...PROSE_SANSKRIT,
].filter(Boolean)
/** A label or running text as HTML with its Sanskrit words marked; memoised per string. */
const htmlCache = new Map<string, string>()
export const labelHtml = (text: string): string => {
  let out = htmlCache.get(text)
  if (out === undefined) htmlCache.set(text, (out = markSanskrit(text, SANSKRIT_NAMES, PROTECTED_PHRASES)))
  return out
}
