// Periods of the day and the segment verdict (.planning/SPEC.md 13.1–13.4; rules in
// .planning/research/rules.md, cited by record id). Pure: a computed day in, periods and
// segments out — no screen code.
//
// Step 1 of PLAN-periods Q4–Q5: the values that follow from what computeDay already finds
// (sunrise, sunset, the five elements, the Moon's sign, the library's windows, the star-day
// marks). Values that need new computation are listed in MISSING and do not decide yet.
import { skyAt } from './panchang'
import { addDays } from './time'
import type { DayPanchang, Interval, Span } from './types'

export const GROUPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
const ALL: readonly number[] = GROUPS

/** Values of SPEC 13.2 not computed yet — the screen says so while the list is not empty. */
export const MISSING = ['varjyam', 'amritKalam', 'lagnaGandanta', 'baana', 'monthRules'] as const

export type PeriodKind =
  | 'rahuKaal' | 'yamaganda' | 'gulika' | 'durMuhurtam' | 'noon' | 'midnight'
  | 'tithiGandanta' | 'nakshatraGandanta' | 'pakshaRandhra' | 'yogaPart' | 'vyatipata' | 'vaidhriti'
  | 'bhadraMouth' | 'bhadra' | 'bhadraTail'
  | 'abhijit' | 'brahma' | 'sarvartha' | 'amritSiddhi' | 'ravi'
  | 'eclipse' | 'eclipseDays' | 'eclipseStar'
  | 'choghadiya' | 'base'

/**
 * veto / fb (fallback: avoid, acceptable only if the act cannot wait) / strong / plus act on a
 * moment; good / neutral / poor / veto are the day base's grades (13.3).
 */
export type Level = 'veto' | 'fb' | 'strong' | 'plus' | 'good' | 'neutral' | 'poor'

export type Period = Interval & {
  kind: PeriodKind
  level: Level
  groups: readonly number[]
  /** false for notes (Choghadiya, R21) and disputed values (Gulika, R3): shown, never decide. */
  decides: boolean
  /** Record in the rule registry, e.g. 'R1', 'D3', 'C1'. */
  rule: string
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
const CH_LEVEL = { good: 'plus', neutral: 'neutral', avoid: 'veto' } as const
const CH_RATING = { amrit: 'good', shubh: 'good', labh: 'good', chal: 'neutral', udveg: 'avoid', rog: 'avoid', kaal: 'avoid' } as const

const sunStar = (t: Date) => Math.floor(skyAt(t).sun / (360 / 27)) + 1

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
export function dayPeriods(day: DayPanchang, prev: DayPanchang): { window: Interval; periods: Period[]; missing: readonly string[] } {
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
  if (w.abhijit) add(w.abhijit.start, w.abhijit.end, 'abhijit', 'strong', 'R9')
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

  // Choghadiya: shown, never decides (R21).
  for (const p of [...day.choghadiyaBefore, ...day.choghadiya])
    add(p.start, p.end, 'choghadiya', CH_LEVEL[CH_RATING[p.name]], 'R21', { decides: false, detail: { name: p.name } })

  // Junctions (D5): the end of Panchami, Dashami, Purnima and the start of the next tithi,
  // 1 ghatika each side; Ashlesha, Jyeshtha, Revati and the next star, 2 each side.
  for (const [t, before] of junctions(day.tithi, 30))
    if ([5, 10, 15, 20, 25].includes(before)) add(plus(t, -GHATIKA), plus(t, GHATIKA), 'tithiGandanta', 'veto', 'D5', { detail: { before } })
  for (const [t, before] of junctions(day.nakshatra, 27))
    if ([9, 18, 27].includes(before)) add(plus(t, -2 * GHATIKA), plus(t, 2 * GHATIKA), 'nakshatraGandanta', 'veto', 'D5', { detail: { before } })

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
  // The day's stars, with the one before sunrise taken from the previous day (each searched on its own, so equal to a second, not a millisecond).
  const stars = [...day.nakshatra, ...prev.nakshatra].filter((s, i, a) => a.findIndex((x) => x.index === s.index && Math.abs(x.start.getTime() - s.start.getTime()) < MIN) === i)
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

/** SPEC 13.4 for the periods active at one moment, for one group. */
export function verdictOf(active: Period[], group: number): { verdict: Verdict; strong: boolean; by: Period[] } {
  const deciding = active.filter((p) => p.decides && p.groups.includes(group))
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
export function daySegments(day: DayPanchang, prev: DayPanchang, group: number): Segment[] {
  const { window, periods } = dayPeriods(day, prev)
  const cuts = [...new Set([window.start, window.end, ...periods.flatMap((p) => [p.start, p.end])].map((t) => t.getTime()))]
    .filter((t) => t >= window.start.getTime() && t <= window.end.getTime())
    .sort((a, b) => a - b)
  const out: Segment[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const m = new Date((cuts[i] + cuts[i + 1]) / 2)
    const active = periods.filter((p) => p.start <= m && m < p.end && p.groups.includes(group))
    const v = verdictOf(active, group)
    const key = (s: { verdict: Verdict; strong: boolean; by: Period[] }) => `${s.verdict}|${s.strong}|${s.by.map((p) => p.kind + p.rule).join(',')}`
    const last = out[out.length - 1]
    if (last && key(last) === key(v)) {
      last.end = new Date(cuts[i + 1])
      for (const p of active) if (!last.active.includes(p)) last.active.push(p)
    } else out.push({ start: new Date(cuts[i]), end: new Date(cuts[i + 1]), ...v, active })
  }
  return out
}
