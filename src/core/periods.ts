// Periods of the day and the segment verdict (.planning/SPEC.md 13.1–13.4; rules in
// .planning/research/rules.md, cited by record id). Pure: a computed day in, periods and
// segments out — no screen code.
//
// Step 1 of PLAN-periods Q4–Q5: the values that follow from what computeDay already finds
// (sunrise, sunset, the five elements, the Moon's sign, the library's windows, the star-day
// marks). Values that need new computation are listed in MISSING and do not decide yet.
import { jupiterAt, masaAt, skyAt } from './panchang'
import { addDays } from './time'
import type { DayPanchang, Interval, Span } from './types'

export const GROUPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
const ALL: readonly number[] = GROUPS

/** Values of SPEC 13.2 not computed yet — the screen says so while the list is not empty. */
export const MISSING = [] as const

export type PeriodKind =
  | 'rahuKaal' | 'yamaganda' | 'gulika' | 'durMuhurtam' | 'noon' | 'midnight'
  | 'tithiGandanta' | 'nakshatraGandanta' | 'lagnaGandanta' | 'pakshaRandhra' | 'yogaPart' | 'vyatipata' | 'vaidhriti'
  | 'bhadraMouth' | 'bhadra' | 'bhadraTail'
  | 'varjyam' | 'amritKalam'
  | 'abhijit' | 'brahma' | 'sarvartha' | 'amritSiddhi' | 'ravi'
  | 'eclipse' | 'eclipseDays' | 'eclipseStar'
  | 'baana' | 'month' | 'hora' | 'pushkara' | 'sankranti' | 'anandadi' | 'panchaka'
  | 'dishaShool' | 'dawn' | 'godhuli' | 'nishita'
  | 'choghadiya' | 'base'
  | 'tara' | 'chandra' | 'janma'

/**
 * veto / fb (fallback: avoid, acceptable only if the act cannot wait) / strong / plus act on a
 * moment; good / neutral / poor / veto are the day base's grades (13.3).
 */
export type Level = 'veto' | 'fb' | 'strong' | 'plus' | 'good' | 'neutral' | 'poor'

/** A travel direction (group 1); the traveller picks one (user, 2026-10-14). */
export type Direction = 'north' | 'east' | 'south' | 'west'

export type Period = Interval & {
  kind: PeriodKind
  level: Level
  groups: readonly number[]
  /** false for notes (Choghadiya, R21) and disputed values (Gulika, R3): shown, never decide. */
  decides: boolean
  /** Record in the rule registry, e.g. 'R1', 'D3', 'C1'. */
  rule: string
  /** Travel rules: the period counts only for this direction, or for every direction but this one. */
  dir?: { only: Direction } | { except: Direction }
  /** Element index the period comes from (tithi 1–30, nakshatra 1–27, yoga 1–27, Choghadiya name …). */
  detail?: Record<string, number | string>
}

export type Verdict = 'good' | 'neutral' | 'fb' | 'avoid'
export type Segment = Interval & { verdict: Verdict; strong: boolean; by: Period[]; active: Period[] }

const MIN = 60_000
const GHATIKA = 24 * MIN // a ghatika (= danda) taken as 24 minutes (D3, D5, R12, R17)
const PALA = GHATIKA / 60
const SYNODIC = 29.530589 * 86_400_000 // a lunar month

const clip = (a: Date, b: Date, w: Interval): Interval | null => {
  const start = a > w.start ? a : w.start
  const end = b < w.end ? b : w.end
  return start < end ? { start, end } : null
}
const plus = (t: Date, ms: number) => new Date(t.getTime() + ms)
const mid = (a: Date, b: Date) => new Date((a.getTime() + b.getTime()) / 2)

// ── Day base (13.3) ─────────────────────────────────────────────────────────────

type StarClass = 'fixed' | 'movable' | 'swift' | 'soft' | 'mixed' | 'sharp' | 'fierce'

/** Nakshatra 1–27 → class (G2: [BS] 98, [MC] 2.2–8). */
const STAR_CLASS: StarClass[] = [
  'swift', 'fierce', 'mixed', 'fixed', 'soft', 'sharp', 'movable', 'swift', 'sharp', // Ashwini … Ashlesha
  'fierce', 'fierce', 'fixed', 'swift', 'soft', 'movable', 'mixed', 'soft', 'sharp', // Magha … Jyeshtha
  'sharp', 'fierce', 'fixed', 'movable', 'movable', 'movable', 'fierce', 'fixed', 'soft', // Mula … Revati
]
/** Weekday 0–6 → the class [MC] 2.2–8 pairs it with. */
const WEEKDAY_CLASS: StarClass[] = ['fixed', 'movable', 'fierce', 'mixed', 'swift', 'soft', 'sharp']
/** Groups a class is good for (13.3); mixed is neutral, sharp and fierce poor for all. */
const CLASS_GOOD: Partial<Record<StarClass, number[]>> = { fixed: [3, 8, 9, 0], movable: [1], swift: [4, 5, 6, 1], soft: [2, 5] }

type Grade = 'good' | 'neutral' | 'poor'
const classGrade = (cls: StarClass, group: number): Grade =>
  cls === 'sharp' || cls === 'fierce' ? 'poor' : CLASS_GOOD[cls]?.includes(group) ? 'good' : 'neutral'

/** Tithi class's own weekday ("siddha", D4): Nanda Friday, Bhadra Wednesday, Jaya Tuesday, Rikta Saturday, Purna Thursday. */
const SIDDHA_WEEKDAY = [5, 3, 2, 6, 4]

/**
 * Grades of the three day elements for a group (13.3). `vara` is the weekday in force (before
 * sunrise the previous one); `tuesdayAfterNoon` lifts Tuesday to neutral (C2).
 */
export function baseGrades(vara: number, tithi: number, star: number, group: number, tuesdayAfterNoon = false) {
  const n = ((tithi - 1) % 15) + 1 // 1–15 in its fortnight; Amavasya (30) → 15, a Purna tithi
  const bright = tithi <= 15
  let t: Grade | 'veto'
  if (tithi === 30 && group !== 7) t = 'veto' // [MC] 1.34–35; ancestor rites fall on it
  else if (SIDDHA_WEEKDAY[(n - 1) % 5] === vara) t = 'good'
  else if (n % 5 === 4) t = 'poor' // Rikta: 4, 9, 14 (D1, D4)
  else if (n <= 5) t = bright ? 'poor' : 'good' // D4: bright first five low, dark first five best
  else if (n > 10) t = bright ? 'good' : 'poor'
  else t = 'neutral'
  const w: Grade = vara === 2 && tuesdayAfterNoon ? 'neutral' : classGrade(WEEKDAY_CLASS[vara], group)
  const s = classGrade(STAR_CLASS[star - 1], group)
  return { tithi: t, weekday: w, star: s }
}

/** 13.3 model choice: good if star and tithi are good and the weekday is not poor; poor if any is poor. */
function baseLevel(g: ReturnType<typeof baseGrades>): Level {
  if (g.tithi === 'veto') return 'veto'
  if (g.tithi === 'poor' || g.weekday === 'poor' || g.star === 'poor') return 'poor'
  return g.tithi === 'good' && g.star === 'good' ? 'good' : 'neutral'
}

// ── Personal layer (13.6) ─────────────────────────────────────────────────────────

/** The birth Moon's star 1–27 and sign 1–12, the birth lunar day 1–30 and amanta month 1–12; 0 = not known. */
export type Birth = { star: number; sign: number; tithi: number; month: number }

/** The birth Moon and lunar day at the birth instant (P1, P2, R17). */
export function birthOf(at: Date): Birth {
  const { sun, moon } = skyAt(at)
  return {
    star: Math.floor(moon / (360 / 27)) + 1,
    sign: Math.floor(moon / 30) + 1,
    tithi: Math.floor((((moon - sun) % 360) + 360) % 360 / 12) + 1,
    month: masaAt(at).amanta,
  }
}

/** Tara 1–9 of the Moon's star counted from the birth star, in sets of nine (P2: Janma … Param Mitra). */
export const taraOf = (birthStar: number, star: number) => (((star - birthStar + 27) % 27) % 9) + 1

/** Place 1–12 of the Moon's sign counted from the birth sign (P2; 8 = Chandrashtama, P1). */
export const chandraOf = (birthSign: number, sign: number) => ((sign - birthSign + 12) % 12) + 1

// ── Periods ─────────────────────────────────────────────────────────────────────

const spanAt = (spans: Span[], t: Date) => spans.find((s) => s.start <= t && t < s.end)

/** Boundaries between consecutive spans: [instant, index before, index after]. */
function junctions(spans: Span[], count: number): [Date, number, number][] {
  const out: [Date, number, number][] = []
  for (const s of spans) out.push([s.start, s.index === 1 ? count : s.index - 1, s.index])
  const last = spans[spans.length - 1]
  if (last) out.push([last.end, last.index, (last.index % count) + 1])
  return out.filter(([t], i, a) => a.findIndex(([u]) => u.getTime() === t.getTime()) === i)
}

/** Paksha-randhra tithis (D3): position in the fortnight → ghatikas avoided from its start. */
const PAKSHA_RANDHRA: Record<number, number> = { 4: 8, 6: 9, 8: 14, 9: 25, 12: 10, 14: 5 }
/** Bad yogas (R17): yoga → dandas avoided from its start; Parigha (19): its first half. */
const YOGA_DANDAS: Record<number, number> = { 1: 3, 15: 3, 9: 5, 10: 6, 6: 6, 13: 9 }
const VYATIPATA = 17, VAIDHRITI = 27, PARIGHA = 19
const VISHTI = 7
/** Moon signs (1 Mesha … 12 Meena) where Bhadra lives on earth (R12, [MC] 1.45). */
const BHADRA_EARTH = [4, 5, 11, 12]
const RAVI_COUNTS = [4, 6, 9, 10, 13, 20]
/**
 * Dur Muhurtam per weekday (R10): muhurtas (1/15 of the day, or of the night) as Drik counts
 * them — measured from its day pages in 3 cities; [Raman] differs on Mon, Tue, Thu and Fri.
 */
const DUR_DAY = [[14], [9, 12], [4], [8], [6, 12], [4, 9], [1, 2]]
const DUR_NIGHT = [[], [], [7], [], [], [], []]
/**
 * Varjyam (R7) and Amrit Kalam (R23), nakshatra 1–27 → the ghatika (of 60 in the star's real
 * span) each 4-ghatika window starts at. Drik's tables, read off its day pages; Varjyam is
 * [KP]'s table except P.Bhadrapada (Drik 16, [KP] 6), and Mula has both of its values.
 */
const VARJYAM = [[50], [24], [30], [40], [14], [21], [30], [20], [32], [30], [20], [18], [21], [20], [14], [14], [10], [14], [20, 56], [24], [20], [10], [10], [18], [16], [24], [30]]
const AMRIT_KALAM = [42, 48, 54, 52, 38, 35, 54, 44, 56, 54, 44, 42, 45, 44, 38, 38, 34, 38, 44, 48, 44, 34, 34, 42, 40, 48, 54]
const CH_LEVEL = { good: 'plus', neutral: 'neutral', avoid: 'veto' } as const
const CH_RATING = { amrit: 'good', shubh: 'good', labh: 'good', chal: 'neutral', udveg: 'avoid', rog: 'avoid', kaal: 'avoid' } as const

/** Planets in hora order (each hora's lord is the 6th from the last in weekday order, R6). */
export const HORA_ORDER = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'] as const
/** Weekday 0–6 → its lord's place in HORA_ORDER. */
const WEEKDAY_LORD = [3, 6, 2, 5, 1, 4, 0]
/** Planet → the weekday it rules, whose class the hora carries (R22). */
const PLANET_WEEKDAY: Record<(typeof HORA_ORDER)[number], number> = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6 }
const horaGroups = (planet: (typeof HORA_ORDER)[number]) => GROUPS.filter((g) => classGrade(WEEKDAY_CLASS[PLANET_WEEKDAY[planet]], g) === 'good')

/** Tri / Dwi Pushkara (R24, [MC] 2.50): its weekdays (Sun, Tue, Sat) and stars for ×3 and ×2. */
const PUSHKARA_DAYS = [0, 2, 6]
const PUSHKARA_STARS: Record<number, 3 | 2> = { 16: 3, 12: 3, 25: 3, 7: 3, 3: 3, 21: 3, 23: 2, 14: 2, 5: 2 }

/** Sankranti (R26, [MC] 3.8): ghatikas before and after the Sun enters each sign (1 Mesha … 12 Meena). */
const SANKRANTI: Record<number, [number, number]> = { 1: [8, 8], 2: [16, 0], 3: [0, 16], 4: [16, 0], 5: [16, 0], 6: [0, 16], 7: [8, 8], 8: [16, 0], 9: [0, 16], 10: [0, 16], 11: [16, 0], 12: [0, 16] }

/** The 28 Anandadi yogas in order ([MC] 1.23–25), Drik's spellings. */
export const ANANDADI = [
  'Ananda', 'Kaladanda', 'Dhumra', 'Dhata', 'Saumya', 'Dhwanksha', 'Ketu', 'Shrivatsa', 'Vajra', 'Mudgara', 'Chhatra', 'Mitra', 'Manasa', 'Padma',
  'Lumbaka', 'Utpata', 'Mrityu', 'Kana', 'Siddhi', 'Shubha', 'Amrita', 'Mushala', 'Gada', 'Matanga', 'Rakshasa', 'Chara', 'Sthira', 'Vardhamana',
] as const
/** Good by Drik's mark on its day pages (all 83 cached pages agree); the other 12 are bad. */
const ANANDADI_GOOD = new Set(['Ananda', 'Dhata', 'Saumya', 'Ketu', 'Shrivatsa', 'Chhatra', 'Mitra', 'Manasa', 'Padma', 'Siddhi', 'Shubha', 'Amrita', 'Matanga', 'Chara', 'Sthira', 'Vardhamana'])
/** Weekday 0–6 → the star its count starts from, as a place among the 28 (Abhijit is 22nd). */
const ANANDADI_START = [1, 5, 9, 13, 17, 21, 25]
/** Abhijit: the Moon from 276°40′ to 280°53′20″ — U.Ashadha's last pada and Shravana's first 1/15. */
const ABHIJIT = [276 + 2 / 3, 280 + 8 / 9]

/** When the Moon reaches sidereal longitude `lon` inside [a, b), or null. */
function moonAt(lon: number, a: Date, b: Date): Date | null {
  const f = (t: number) => ((skyAt(new Date(t)).moon - lon + 540) % 360) - 180
  let lo = a.getTime(), hi = b.getTime()
  if (!(f(lo) < 0 && f(hi) >= 0)) return null
  while (hi - lo > 1000) {
    const m = (lo + hi) / 2
    if (f(m) < 0) lo = m
    else hi = m
  }
  return new Date(hi)
}

/**
 * Anandadi yogas over [a, b) (R15): the count from the weekday's starting star to the Moon's,
 * Abhijit included; the weekday runs sunrise to sunrise. `prev` gives the stars before sunrise.
 */
export function anandadiSpans(day: DayPanchang, prev: DayPanchang, a: Date, b: Date): { name: (typeof ANANDADI)[number]; start: Date; end: Date }[] {
  const stars = [...prev.nakshatra, ...day.nakshatra].filter((s, i, x) => x.findIndex((y) => y.index === s.index && Math.abs(y.start.getTime() - s.start.getTime()) < MIN) === i)
  const abhijit: Date[] = []
  for (const s of stars) {
    if (s.end <= a || s.start >= b) continue
    const t = s.index === 21 ? moonAt(ABHIJIT[0], s.start, s.end) : s.index === 22 ? moonAt(ABHIJIT[1], s.start, s.end) : null
    if (t) abhijit.push(t)
  }
  const inAbhijit = (t: Date) => {
    const m = skyAt(t).moon
    return m >= ABHIJIT[0] && m < ABHIJIT[1]
  }
  const sunrise = day.sunrise ?? a
  const cuts = [a, b, sunrise, ...stars.map((s) => s.start), ...abhijit]
    .filter((t) => t >= a && t <= b)
    .sort((x, y) => x.getTime() - y.getTime())
  const out: { name: (typeof ANANDADI)[number]; start: Date; end: Date }[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [x, y] = [cuts[i], cuts[i + 1]]
    if (x.getTime() === y.getTime()) continue
    const m = mid(x, y)
    const star = spanAt(stars, m)?.index
    if (!star) continue
    const place = inAbhijit(m) ? 22 : star <= 21 ? star : star + 1
    const vara = m < sunrise ? (day.vara + 6) % 7 : day.vara
    const name = ANANDADI[(place - ANANDADI_START[vara] + 28) % 28]
    const last = out[out.length - 1]
    if (last && last.name === name && last.end.getTime() === x.getTime()) last.end = y
    else out.push({ name, start: x, end: y })
  }
  return out
}

/** Disha Shool (R25): the direction each weekday (Sunday first) forbids, as Drik gives it. */
const DISHA_SHOOL: Direction[] = ['west', 'east', 'north', 'north', 'south', 'west', 'east']

const sunStar = (t: Date) => Math.floor(skyAt(t).sun / (360 / 27)) + 1

export type Baana = 'mrityu' | 'agni' | 'raja' | 'chora' | 'roga'
/** Baana by the Sun's completed degrees in its sign, remainder by 9 ([MC] 6.73; Drik's changes). */
const BAANA: Record<number, Baana> = { 1: 'mrityu', 2: 'agni', 4: 'raja', 6: 'chora', 8: 'roga' }
/** The act each Baana spoils ([MC] 6.74, SPEC 13.2): travel, marriage, house, official work, rites. */
const BAANA_GROUP: Record<Baana, number> = { chora: 1, mrityu: 2, agni: 3, raja: 9, roga: 7 }

/** Groups the month rules M1 and M2 name ([MC] 1.46–48): travel, marriage, home, rites, official work. */
const RITES = [1, 2, 3, 7, 9]
/** Jupiter in Magha 1 – P.Phalguni 1, "blamed in all countries" (M2, [MC] 1.50). */
const JUPITER_BLAMED = [120, 120 + 40 / 3]
/** Sun signs of the marriage months (M5, [MC] 6.13): Mesha, Vrishabha, Vrishchika, Makara, Kumbha. */
const MARRIAGE_SIGNS = [1, 2, 8, 10, 11]
const MITHUNA = 3, ASHADHA = 4, KARTIKA = 8

/** The Baana over [a, b), cut where the Sun completes a degree (about once a day); null where there is none. */
export function baanaSpans(a: Date, b: Date): { name: Baana | null; start: Date; end: Date }[] {
  const degree = (t: Date) => Math.floor(skyAt(t).sun)
  const out: { name: Baana | null; start: Date; end: Date }[] = []
  let start = a
  while (start < b) {
    const d = degree(start)
    let end = b
    if (degree(b) !== d) {
      let lo = start.getTime(), hi = b.getTime()
      while (hi - lo > 1000) {
        const m = (lo + hi) / 2
        if (degree(new Date(m)) === d) lo = m
        else hi = m
      }
      end = new Date(hi)
    }
    out.push({ name: BAANA[(d % 30) % 9] ?? null, start, end })
    start = end
  }
  return out
}

/** Spans of the Sun's nakshatra over [a, b): it moves one star in ~13 days, at most once here. */
function sunStars(a: Date, b: Date): Span[] {
  const s0 = sunStar(a), s1 = sunStar(b)
  if (s0 === s1) return [{ index: s0, start: a, end: b }]
  let lo = a.getTime(), hi = b.getTime()
  while (hi - lo > MIN) {
    const m = (lo + hi) / 2
    if (sunStar(new Date(m)) === s0) lo = m
    else hi = m
  }
  return [{ index: s0, start: a, end: new Date(hi) }, { index: s1, start: new Date(hi), end: b }]
}

/**
 * Every period active in the day's window — from the start of Brahma Muhurta to the next
 * sunrise (13.1). `prev` is the civil day before (its star-day marks reach past this sunrise).
 */
export function dayPeriods(day: DayPanchang, prev: DayPanchang, birth: Birth | null = null): { window: Interval; periods: Period[]; missing: readonly string[] } {
  const { sunrise, sunset, nextSunrise } = day
  if (!sunrise || !sunset || !nextSunrise) return { window: { start: sunrise ?? new Date(0), end: sunrise ?? new Date(0) }, periods: [], missing: MISSING }
  const window: Interval = { start: day.windows.brahma?.start ?? sunrise, end: nextSunrise }
  const noon = mid(sunrise, sunset)
  const midnight = mid(sunset, nextSunrise)
  const out: Period[] = []
  const add = (a: Date, b: Date, kind: PeriodKind, level: Level, rule: string, extra: Partial<Period> = {}) => {
    const w = clip(a, b, window)
    if (w) out.push({ ...w, kind, level, rule, groups: ALL, decides: true, ...extra })
  }
  /** Before midday a veto, after it a fallback (C1); before sunrise the previous day's afternoon. */
  const untilMidday = (a: Date, b: Date, kind: PeriodKind, rule: string, extra: Partial<Period> = {}) => {
    add(a, b < sunrise ? b : sunrise, kind, 'fb', rule, extra)
    add(a > sunrise ? a : sunrise, b < noon ? b : noon, kind, 'veto', rule, extra)
    add(a > noon ? a : noon, b, kind, 'fb', rule, extra)
  }

  // Fixed windows (R1–R3, R9, R20).
  const w = day.windows
  if (w.rahuKaal) add(w.rahuKaal.start, w.rahuKaal.end, 'rahuKaal', 'veto', 'R1')
  if (w.yamaganda) add(w.yamaganda.start, w.yamaganda.end, 'yamaganda', 'veto', 'R2')
  if (w.gulika) add(w.gulika.start, w.gulika.end, 'gulika', 'veto', 'R3', { decides: false })
  if (w.abhijit) {
    add(w.abhijit.start, w.abhijit.end, 'abhijit', 'strong', 'R9')
    add(w.abhijit.start, w.abhijit.end, 'abhijit', 'veto', 'R9', { groups: [1], dir: { only: 'south' } })
  }
  if (w.brahma) add(w.brahma.start, w.brahma.end, 'brahma', 'plus', 'R20', { groups: [5, 7] })
  add(plus(noon, -10 * PALA), plus(noon, 10 * PALA), 'noon', 'veto', 'R18')

  // Dur Muhurtam (R10): the weekday's bad muhurtas of the day and of the night.
  const muhurtas = (a: Date, b: Date, list: number[], part: string) => {
    const len = (b.getTime() - a.getTime()) / 15
    for (const n of list) add(plus(a, (n - 1) * len), plus(a, n * len), 'durMuhurtam', 'veto', 'R10', { detail: { muhurta: n, part } })
  }
  muhurtas(sunrise, sunset, DUR_DAY[day.vara], 'day')
  muhurtas(sunset, nextSunrise, DUR_NIGHT[day.vara], 'night')
  add(plus(midnight, -10 * PALA), plus(midnight, 10 * PALA), 'midnight', 'veto', 'R18')

  // The day's stars, with the one before sunrise taken from the previous day (each searched on its own, so equal to a second, not a millisecond).
  const stars = [...day.nakshatra, ...prev.nakshatra].filter((s, i, a) => a.findIndex((x) => x.index === s.index && Math.abs(x.start.getTime() - s.start.getTime()) < MIN) === i)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Varjyam (R7) veto and Amrit Kalam (R23) +: 4 ghatikas of the star's span from its table value.
  for (const s of stars) {
    const gh = (s.end.getTime() - s.start.getTime()) / 60
    const from = (n: number, kind: PeriodKind, level: Level, rule: string) => add(plus(s.start, n * gh), plus(s.start, (n + 4) * gh), kind, level, rule, { detail: { star: s.index } })
    for (const n of VARJYAM[s.index - 1]) from(n, 'varjyam', 'veto', 'R7')
    from(AMRIT_KALAM[s.index - 1], 'amritKalam', 'plus', 'R23')
  }

  // Choghadiya: shown, never decides (R21).
  for (const p of [...day.choghadiyaBefore, ...day.choghadiya])
    add(p.start, p.end, 'choghadiya', CH_LEVEL[CH_RATING[p.name]], 'R21', { decides: false, detail: { name: p.name } })

  // Hora (R6): 12 equal parts of the day, 12 of the night, from the weekday's lord; Drik starts
  // them at local sunrise. Each is + for the groups its planet's weekday class suits (R22);
  // Mars, Mercury and Saturn suit none. Before sunrise: the previous day's night horas.
  const horas = (a: Date, b: Date, first: number) => {
    const len = (b.getTime() - a.getTime()) / 12
    for (let i = 0; i < 12; i++) {
      const planet = HORA_ORDER[(first + i) % 7]
      add(plus(a, i * len), plus(a, (i + 1) * len), 'hora', 'plus', 'R6', { groups: horaGroups(planet), detail: { planet } })
    }
  }
  if (prev.sunset) horas(prev.sunset, sunrise, WEEKDAY_LORD[prev.vara] + 12)
  horas(sunrise, sunset, WEEKDAY_LORD[day.vara])
  horas(sunset, nextSunrise, WEEKDAY_LORD[day.vara] + 12)

  // Tri / Dwi Pushkara (R24): a note where a Bhadra-class tithi (2, 7, 12 of either half), its
  // weekday (sunrise to sunrise; before sunrise the previous one) and its star overlap.
  const tithis = [...prev.tithi, ...day.tithi].filter((s, i, a) => a.findIndex((x) => x.index === s.index && Math.abs(x.start.getTime() - s.start.getTime()) < MIN) === i)
  const weekdays = [{ vara: (day.vara + 6) % 7, start: window.start, end: sunrise }, { vara: day.vara, start: sunrise, end: nextSunrise }]
  for (const w of weekdays.filter((x) => PUSHKARA_DAYS.includes(x.vara)))
    for (const t of tithis.filter((x) => [2, 7, 12].includes(((x.index - 1) % 15) + 1)))
      for (const s of stars.filter((x) => PUSHKARA_STARS[x.index])) {
        const a = [w.start, t.start, s.start].reduce((m, d) => (d > m ? d : m))
        const b = [w.end, t.end, s.end].reduce((m, d) => (d < m ? d : m))
        if (a < b) add(a, b, 'pushkara', 'neutral', 'R24', { decides: false, detail: { times: PUSHKARA_STARS[s.index], star: s.index } })
      }

  // Sankranti (R26): the holy window around the Sun's entry into a sign, + for rites (7). The
  // entry instants are the day's Sun-sign span edges (the same instant as the day mark); an
  // entry up to 16 ghatikas outside the day can still reach into it.
  const entries = [...prev.signs.vedic.sun, ...day.signs.vedic.sun].flatMap((s) => [[s.start, s.index], [s.end, (s.index % 12) + 1]] as const)
    .filter(([t], i, a) => a.findIndex(([u]) => Math.abs(u.getTime() - t.getTime()) < MIN) === i)
  for (const [at, sign] of entries)
    if (at > plus(window.start, -16 * GHATIKA) && at < plus(window.end, 16 * GHATIKA)) {
      const [before, after] = SANKRANTI[sign]
      add(plus(at, -before * GHATIKA), plus(at, after * GHATIKA), 'sankranti', 'plus', 'R26', { groups: [7], detail: { sign } })
    }

  // Anandadi yogas (R15): the good ones (Drik's mark) are + for all; the bad ones are regional
  // ([MC] 1.31, C9) and do not decide. Padma's first 4 dandas are bad ([MC] 1.26): no + there.
  for (const y of anandadiSpans(day, prev, window.start, window.end))
    if (ANANDADI_GOOD.has(y.name)) add(y.name === 'Padma' ? plus(y.start, 4 * GHATIKA) : y.start, y.end, 'anandadi', 'plus', 'R15', { detail: { name: y.name } })

  // Panchaka (G3, [MC] 2.48): the Moon in Kumbha or Meena — no roofing or bed-making, a veto
  // for home and property (3); no travel south (1).
  const moonSigns = [...prev.signs.vedic.moon, ...day.signs.vedic.moon].filter((s, i, a) => a.findIndex((x) => x.index === s.index && Math.abs(x.start.getTime() - s.start.getTime()) < MIN) === i)
  for (const s of moonSigns.filter((x) => x.index === 11 || x.index === 12)) {
    add(s.start, s.end, 'panchaka', 'veto', 'G3', { groups: [3] })
    add(s.start, s.end, 'panchaka', 'veto', 'G3', { groups: [1], dir: { only: 'south' } })
  }

  // Junctions (D5): the end of Panchami, Dashami, Purnima and the start of the next tithi,
  // 1 ghatika each side; Ashlesha, Jyeshtha, Revati and the next star, 2 each side.
  for (const [t, before] of junctions(day.tithi, 30))
    if ([5, 10, 15, 20, 25].includes(before)) add(plus(t, -GHATIKA), plus(t, GHATIKA), 'tithiGandanta', 'veto', 'D5', { detail: { before } })
  for (const [t, before] of junctions(day.nakshatra, 27))
    if ([9, 18, 27].includes(before)) add(plus(t, -2 * GHATIKA), plus(t, 2 * GHATIKA), 'nakshatraGandanta', 'veto', 'D5', { detail: { before } })
  // Rising signs Karka / Simha, Vrishchika / Dhanu, Meena / Mesha, half a ghatika each side; the
  // signs before this sunrise come from the previous day.
  const lagna = [...prev.lagna, ...day.lagna].filter((s, i, a) => a.findIndex((x) => x.index === s.index && Math.abs(x.start.getTime() - s.start.getTime()) < MIN) === i)
  for (const [t, before] of junctions(lagna, 12))
    if ([4, 8, 12].includes(before)) add(plus(t, -GHATIKA / 2), plus(t, GHATIKA / 2), 'lagnaGandanta', 'veto', 'D5', { detail: { before } })

  // Paksha-randhra tithis: their first ghatikas (D3).
  for (const s of day.tithi) {
    const n = ((s.index - 1) % 15) + 1
    const gh = PAKSHA_RANDHRA[n]
    if (gh) {
      const end = plus(s.start, gh * GHATIKA)
      add(s.start, end < s.end ? end : s.end, 'pakshaRandhra', 'veto', 'D3', { detail: { tithi: s.index } })
    }
  }

  // Yogas (R17, C1).
  for (const s of day.yoga) {
    const d = YOGA_DANDAS[s.index]
    if (d) add(s.start, plus(s.start, d * GHATIKA), 'yogaPart', 'veto', 'R17', { detail: { yoga: s.index } })
    if (s.index === PARIGHA) add(s.start, mid(s.start, s.end), 'yogaPart', 'veto', 'R17', { detail: { yoga: s.index } })
    if (s.index === VYATIPATA) untilMidday(s.start, s.end, 'vyatipata', 'C1')
    if (s.index === VAIDHRITI) untilMidday(s.start, s.end, 'vaidhriti', 'C1')
  }

  // Bhadra (Vishti karana) on earth (R12, C1): mouth 5 ghatikas veto, tail 3 ghatikas +, the
  // rest veto before midday, fallback after. A Vishti from a tithi's second half is harmless by
  // day, one from a first half at night.
  for (const k of day.karana.filter((x) => x.index === VISHTI)) {
    const firstHalf = day.tithi.some((t) => Math.abs(t.start.getTime() - k.start.getTime()) < MIN)
    const harmless = (t: Date) => {
      const byDay = t >= sunrise && t < sunset
      return firstHalf ? !byDay : byDay
    }
    const mouthEnd = plus(k.start, 5 * GHATIKA)
    const tailStart = plus(k.end, -3 * GHATIKA)
    // Cut at every change of the Moon's sign, sunrise, noon and sunset; keep the pieces on earth that are not harmless.
    const cuts = [k.start, k.end, mouthEnd, tailStart, sunrise, noon, sunset, ...day.signs.vedic.moon.map((s) => s.start)]
      .filter((t) => t >= k.start && t <= k.end)
      .sort((a, b) => a.getTime() - b.getTime())
    for (let i = 0; i + 1 < cuts.length; i++) {
      const [a, b] = [cuts[i], cuts[i + 1]]
      if (a.getTime() === b.getTime()) continue
      const m = mid(a, b)
      const sign = spanAt(day.signs.vedic.moon, m)?.index
      if (!sign || !BHADRA_EARTH.includes(sign) || harmless(m)) continue
      if (m < mouthEnd) add(a, b, 'bhadraMouth', 'veto', 'R12')
      else if (m >= tailStart) add(a, b, 'bhadraTail', 'plus', 'R12')
      else untilMidday(a, b, 'bhadra', 'C1')
    }
  }

  // Star days (R14): Sarvartha Siddhi strong; Amrita Siddhi strong as practice. A day's marks run
  // from its sunrise, so the hours before this sunrise are in the previous day's marks.
  for (const m of [...prev.marks, ...day.marks])
    if (m.kind === 'siddhi') add(m.start, m.end, m.yoga === 'sarvartha' ? 'sarvartha' : 'amritSiddhi', 'strong', 'R14')

  // Ravi yoga (R16): the Moon's star 4th, 6th, 9th, 10th, 13th or 20th from the Sun's.
  for (const moon of day.nakshatra) {
    const span = clip(moon.start, moon.end, window)
    if (!span) continue
    for (const sun of sunStars(span.start, span.end)) {
      const count = ((moon.index - sun.index + 27) % 27) + 1
      if (RAVI_COUNTS.includes(count)) add(sun.start, sun.end, 'ravi', 'strong', 'R16', { detail: { moon: moon.index, sun: sun.index } })
    }
  }

  // Eclipses seen here (E1; [MC] 1.32–33 with the Piyushadhara commentary). The body sets
  // eclipsed: the 3 days before are avoided; rises eclipsed: the 3 days after; seen whole:
  // the 3 before, the day and the 3 after; a total eclipse: also the 7 days after (1.32). Its
  // nakshatra: 6 lunar months after a total eclipse, 3 after at least half, 1 after less, by
  // the deepest phase seen here. The eclipse itself is avoided too (model choice: SPEC 4.11).
  for (const e of day.eclipses) {
    const before = e.set || !e.rose ? 3 : 0
    const after = e.magnitude >= 1 ? 7 : e.rose || !e.set ? 3 : 0
    const near = [1, 2, 3, 4, 5, 6, 7].some((k) => (k <= before && addDays(e.day, -k) === day.date) || (k <= after && addDays(e.day, k) === day.date))
    if (near || (!e.rose && !e.set && e.day === day.date)) add(window.start, window.end, 'eclipseDays', 'veto', 'E1', { detail: { body: e.body, day: e.day } })
    add(e.seen.start, e.seen.end, 'eclipse', 'veto', 'E1', { detail: { body: e.body } })
    const months = e.magnitude >= 1 ? 6 : e.magnitude >= 0.5 ? 3 : 1
    const until = plus(e.seen.end, months * SYNODIC)
    for (const s of stars)
      if (e.stars.includes(s.index)) add(s.start > e.seen.end ? s.start : e.seen.end, s.end < until ? s.end : until, 'eclipseStar', 'veto', 'E1', { detail: { star: s.index, months, body: e.body, day: e.day } })
  }

  // Baana (R19, SPEC 13.2): a veto for its own act only, at its own time — Chora and Roga at
  // night, Raja by day, Agni always, Mrityu at the sandhyas. A sandhya is the tenth of the night
  // next to sunrise or sunset (3 of its 30 ghatikas; Drik's Pratah and Sayahna Sandhya).
  const night = (nextSunrise.getTime() - sunset.getTime()) / 10
  const sandhyas: Interval[] = [
    ...(prev.sunset ? [{ start: plus(sunrise, -(sunrise.getTime() - prev.sunset.getTime()) / 10), end: sunrise }] : []),
    { start: sunset, end: plus(sunset, night) },
    { start: plus(nextSunrise, -night), end: nextSunrise },
  ]

  // Travel (R9, R25; group 1, by direction). Disha Shool: the weekday's direction, all day.
  // Dawn (Drik's Pratah Sandhya, the sandhyas above), Godhuli (from sunset, a thirtieth of the
  // night — Drik starts it up to 5 min before sunset outside Aug–Nov, cause not found) and
  // Nishita (a fifteenth of the night around midnight): + except east, west, north.
  add(window.start, sunrise, 'dishaShool', 'veto', 'R25', { groups: [1], dir: { only: DISHA_SHOOL[(day.vara + 6) % 7] } })
  add(sunrise, nextSunrise, 'dishaShool', 'veto', 'R25', { groups: [1], dir: { only: DISHA_SHOOL[day.vara] } })
  for (const sd of [...(prev.sunset ? [sandhyas[0]] : []), sandhyas[sandhyas.length - 1]]) add(sd.start, sd.end, 'dawn', 'plus', 'R9', { groups: [1], dir: { except: 'east' } })
  add(sunset, plus(sunset, night / 3), 'godhuli', 'plus', 'R9', { groups: [1], dir: { except: 'west' } })
  add(plus(midnight, -night / 3), plus(midnight, night / 3), 'nishita', 'plus', 'R9', { groups: [1], dir: { except: 'north' } })
  const when: Record<Baana, Interval[]> = {
    chora: [{ start: window.start, end: sunrise }, { start: sunset, end: nextSunrise }],
    roga: [{ start: window.start, end: sunrise }, { start: sunset, end: nextSunrise }],
    raja: [{ start: sunrise, end: sunset }],
    agni: [window],
    mrityu: sandhyas,
  }
  for (const s of baanaSpans(window.start, window.end))
    if (s.name)
      for (const w of when[s.name])
        add(s.start > w.start ? s.start : w.start, s.end < w.end ? s.end : w.end, 'baana', 'veto', 'R19', { groups: [BAANA_GROUP[s.name]], detail: { name: s.name } })

  // Jupiter or Venus combust (M1): a veto for RITES from the planet's last sighting to its next.
  for (const c of day.combust) add(c.start ?? window.start, c.end ?? window.end, 'month', 'veto', 'M1', { groups: RITES, detail: { name: `${c.body}Asta` } })

  // Month rules (SPEC 13.3), each a veto for the groups its record names: M1's Adhika month and
  // M2 Jupiter in Magha – P.Phalguni 1 for RITES; M5 outside the marriage months for marriage —
  // the Sun in Mithuna counts only in Ashadha's first ten tithis; M6 Chaturmas (Ashadha Shukla
  // 11 to Kartika Shukla 11, amanta) for marriage only — the record names ear-piercing, and
  // Chaturmas is itself a time of devotion, so rites (group 7) stay open (user, 2026-10-14). Cut where the tithi, the Sun's sign
  // or Jupiter's place changes; pieces in a row with the same rule are one period.
  const blamed = (t: Date) => jupiterAt(t) >= JUPITER_BLAMED[0] && jupiterAt(t) < JUPITER_BLAMED[1]
  let jupiterCut: Date[] = []
  if (blamed(window.start) !== blamed(window.end)) {
    let lo = window.start.getTime(), hi = window.end.getTime()
    while (hi - lo > MIN) {
      const m = (lo + hi) / 2
      if (blamed(new Date(m)) === blamed(window.start)) lo = m
      else hi = m
    }
    jupiterCut = [new Date(hi)]
  }
  const monthCuts = [window.start, window.end, ...jupiterCut, ...day.tithi.map((s) => s.start), ...day.signs.vedic.sun.map((s) => s.start)]
    .filter((t) => t >= window.start && t <= window.end)
    .sort((a, b) => a.getTime() - b.getTime())
  const lastOf = new Map<string, Period>()
  const month = (a: Date, b: Date, rule: string, name: string, groups: number[]) => {
    const last = lastOf.get(rule)
    if (last && last.end.getTime() === a.getTime()) last.end = b
    else {
      add(a, b, 'month', 'veto', rule, { groups, detail: { name } })
      lastOf.set(rule, out[out.length - 1])
    }
  }
  for (let i = 0; i + 1 < monthCuts.length; i++) {
    const [a, b] = [monthCuts[i], monthCuts[i + 1]]
    if (a.getTime() === b.getTime()) continue
    const m = mid(a, b)
    const tithi = spanAt(day.tithi, m)?.index ?? 0
    const sun = spanAt(day.signs.vedic.sun, m)?.index ?? 0
    const { amanta, adhika } = masaAt(m)
    if (adhika) month(a, b, 'M1', 'adhika', RITES)
    if (blamed(m)) month(a, b, 'M2', 'jupiter', RITES)
    if (!MARRIAGE_SIGNS.includes(sun) && !(sun === MITHUNA && amanta === ASHADHA && !adhika && tithi <= 10)) month(a, b, 'M5', 'marriage', [2])
    if ((amanta === ASHADHA && !adhika && tithi >= 11) || (amanta > ASHADHA && amanta < KARTIKA) || (amanta === KARTIKA && tithi <= 11)) month(a, b, 'M6', 'chaturmas', [2])
  }

  // Personal layer (13.6), only with birth data.
  if (birth) {
    const merged = (a: Span[], b: Span[]) => [...b, ...a].filter((s, i, x) => x.findIndex((y) => y.index === s.index && Math.abs(y.start.getTime() - s.start.getTime()) < MIN) === i)
      .sort((p, q) => p.start.getTime() - q.start.getTime())
    // Tarabala (P2): Vipat and Vadha vetoed; the birth star and Pratyari until midday, a
    // fallback after ([MC] 1.42 commentary: "pratyaraṃ janmanakṣatraṃ madhyāhnāt parataḥ
    // śubham", C1); the good taras shown only.
    if (birth.star) for (const s of stars) {
      const tara = taraOf(birth.star, s.index)
      const extra = { detail: { tara, star: s.index } }
      if (tara === 1 || tara === 5) untilMidday(s.start, s.end, 'tara', 'C1', extra)
      else if (tara === 3 || tara === 7) add(s.start, s.end, 'tara', 'veto', 'P2', extra)
      else add(s.start, s.end, 'tara', 'plus', 'P2', { ...extra, decides: false })
    }
    // Chandrabala (P2): the 4th and 12th sign vetoed, the 8th too (Chandrashtama, P1); 2, 5, 9
    // fallback (Drik's "Puja Needed": practice); the good places shown only.
    if (birth.sign) for (const s of merged(day.signs.vedic.moon, prev.signs.vedic.moon)) {
      const place = chandraOf(birth.sign, s.index)
      const extra = { detail: { place, sign: s.index } }
      if (place === 8) add(s.start, s.end, 'chandra', 'veto', 'P1', extra)
      else if ([4, 12].includes(place)) add(s.start, s.end, 'chandra', 'veto', 'P2', extra)
      else if ([2, 5, 9].includes(place)) add(s.start, s.end, 'chandra', 'fb', 'P2', extra)
      else add(s.start, s.end, 'chandra', 'plus', 'P2', { ...extra, decides: false })
    }
    // The birth lunar day is avoided (R17). The birth (amanta) month too, by [MC] 1.34–35, but
    // [MC] 6.14 narrows it to a first-born's marriage and a whole month in red told the user
    // nothing: shown, does not decide (user, 2026-10-14).
    for (const s of merged(day.tithi, prev.tithi)) {
      if (s.index === birth.tithi) add(s.start, s.end, 'janma', 'veto', 'R17', { detail: { what: 'tithi' } })
      if (birth.month && masaAt(mid(s.start, s.end)).amanta === birth.month) add(s.start, s.end, 'janma', 'veto', 'R17', { detail: { what: 'month' }, decides: false })
    }
  }

  // Day base per group (13.3): cut where the weekday, tithi, star or Tuesday's half changes.
  const cuts = [window.start, window.end, sunrise, noon, ...day.tithi.map((s) => s.start), ...day.nakshatra.map((s) => s.start)]
    .filter((t) => t >= window.start && t <= window.end)
    .sort((a, b) => a.getTime() - b.getTime())
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]]
    if (a.getTime() === b.getTime()) continue
    const m = mid(a, b)
    const vara = m < sunrise ? (day.vara + 6) % 7 : day.vara
    const tithi = spanAt(day.tithi, m)?.index
    const star = spanAt(day.nakshatra, m)?.index
    if (!tithi || !star) continue
    const byLevel = new Map<Level, number[]>()
    for (const g of GROUPS) {
      const level = baseLevel(baseGrades(vara, tithi, star, g, m >= noon))
      byLevel.set(level, [...(byLevel.get(level) ?? []), g])
    }
    for (const [level, groups] of byLevel) add(a, b, 'base', level, 'D0', { groups, detail: { vara, tithi, star } })
  }

  return { window, periods: out, missing: MISSING }
}

// ── The verdict (13.4) ──────────────────────────────────────────────────────────

/** Whether a period counts for this travel direction; with none chosen, direction rules do not. */
export const dirCounts = (p: Period, dir?: Direction | null) =>
  !p.dir || (!!dir && ('only' in p.dir ? p.dir.only === dir : p.dir.except !== dir))

/** SPEC 13.4 for the periods active at one moment, for one group (and travel direction). */
export function verdictOf(active: Period[], group: number, dir?: Direction | null): { verdict: Verdict; strong: boolean; by: Period[] } {
  const deciding = active.filter((p) => p.decides && p.groups.includes(group) && dirCounts(p, dir))
  const of = (level: Level) => deciding.filter((p) => p.kind !== 'base' && p.level === level)
  const base = deciding.find((p) => p.kind === 'base')
  const vetoes = deciding.filter((p) => p.level === 'veto') // the base's Amavasya veto too
  if (vetoes.length) return { verdict: 'avoid', strong: false, by: vetoes }
  const fbs = of('fb')
  if (fbs.length) return { verdict: 'fb', strong: false, by: fbs }
  const strong = of('strong')
  if (strong.length) return { verdict: 'good', strong: true, by: strong }
  const pluses = of('plus')
  const b = base?.level ?? 'neutral'
  const withBase = (list: Period[]) => (base ? [base, ...list] : list)
  if (b === 'good' || (b === 'neutral' && pluses.length)) return { verdict: 'good', strong: false, by: pluses.length ? pluses : withBase([]) }
  if (b === 'neutral' || (b === 'poor' && pluses.length)) return { verdict: 'neutral', strong: false, by: withBase(pluses) }
  return { verdict: 'fb', strong: false, by: withBase([]) }
}

/** The day cut into segments with one verdict each, for one group; equal neighbours merged. */
export function daySegments(day: DayPanchang, prev: DayPanchang, group: number, dir?: Direction | null, birth: Birth | null = null): Segment[] {
  const { window, periods } = dayPeriods(day, prev, birth)
  const cuts = [...new Set([window.start, window.end, ...periods.flatMap((p) => [p.start, p.end])].map((t) => t.getTime()))]
    .filter((t) => t >= window.start.getTime() && t <= window.end.getTime())
    .sort((a, b) => a - b)
  const out: Segment[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const m = new Date((cuts[i] + cuts[i + 1]) / 2)
    const active = periods.filter((p) => p.start <= m && m < p.end && p.groups.includes(group))
    const v = verdictOf(active, group, dir)
    const key = (s: { verdict: Verdict; strong: boolean; by: Period[] }) => `${s.verdict}|${s.strong}|${s.by.map((p) => p.kind + p.rule).join(',')}`
    const last = out[out.length - 1]
    if (last && key(last) === key(v)) {
      last.end = new Date(cuts[i + 1])
      for (const p of active) if (!last.active.includes(p)) last.active.push(p)
    } else out.push({ start: new Date(cuts[i]), end: new Date(cuts[i + 1]), ...v, active })
  }
  return out
}
