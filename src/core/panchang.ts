// Calculation core (.planning/SPEC.md sections 4 and 11).
//
// From @ishubhamx/panchangam-js we take sunrise/sunset/moonrise/moonset, the Lahiri
// ayanamsa, the weekday and the Rahu Kaal / Yamaganda / Gulika / Abhijit / Brahma Muhurta
// formulas (Choghadiya is ours: the library's tables swap names). Element boundaries (tithi, nakshatra, yoga, karana) are found here with
// the library's own angle formulas but a bracketing search: its getPanchangam() and
// transition finders made a month take 1.3 s on a 4×-throttled CPU (P1 gate: 300 ms), and its karana list drops the fixed
// karanas around the new moon. The P1 fixtures (Drik, mypanchang) check every value.
import {
  Body,
  Ecliptic,
  Equator,
  GeoVector,
  Horizon,
  Illumination,
  MakeTime,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  Observer,
  Search,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
  SearchMoonPhase,
  SearchSunLongitude,
  SunPosition,
} from 'astronomy-engine'
// Deep imports on purpose: the package root also loads kundli/exporter.js (needs Node's `fs`).
import { getAyanamsa as libraryAyanamsa } from '@ishubhamx/panchangam-js/dist/core/ayanamsa'
import { getMoonrise, getMoonset, getSunrise, getSunset } from '@ishubhamx/panchangam-js/dist/core/rise-set'
import { calculateAbhijitMuhurta, calculateBrahmaMuhurta } from '@ishubhamx/panchangam-js/dist/muhurta/abhijit'
import { calculateGulikaKalam, calculateRahuKalam, calculateYamagandaKalam } from '@ishubhamx/panchangam-js/dist/muhurta/rahu-kaal'
import { getVara } from '@ishubhamx/panchangam-js/dist/calendar/vara'
import { addDays, civilDate, tzOffsetMinutes, zonedTimeToUtc } from './time'
import type { Ayana, Choghadiya, ChoghadiyaName, DayMark, DayPanchang, Interval, Location, MonthDay, Span } from './types'

const DAY_MS = 86_400_000

// ── Local time ──────────────────────────────────────────────────────────────────

const at = (loc: Location, date: string, hour: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return zonedTimeToUtc(loc.tz, y, m, d, hour)
}
const midnight = (loc: Location, date: string) => at(loc, date, 0)
const noon = (loc: Location, date: string) => at(loc, date, 12)

// ── Per-day values from the library, cached so computeMonth reuses neighbours ────

const key = (loc: Location, date: string) => `${loc.lat},${loc.lon},${loc.elevation},${loc.tz},${date}`
function remember<T>(cache: Map<string, T>, k: string, make: () => T): T {
  let v = cache.get(k)
  if (v === undefined) {
    if (cache.size > 400) cache.clear()
    cache.set(k, (v = make()))
  }
  return v
}

const observerOf = (loc: Location) => new Observer(loc.lat, loc.lon, loc.elevation)
const optionsOf = (loc: Location, date: string) => ({ timezoneOffset: tzOffsetMinutes(loc.tz, noon(loc, date)) })

const sunrises = new Map<string, Date | null>()
const sunriseOn = (loc: Location, date: string) =>
  remember(sunrises, key(loc, date), () => getSunrise(noon(loc, date), observerOf(loc), optionsOf(loc, date)))

const sunsets = new Map<string, Date | null>()
const sunsetOn = (loc: Location, date: string) =>
  remember(sunsets, key(loc, date), () => getSunset(noon(loc, date), observerOf(loc), optionsOf(loc, date)))

/** The day's reference instant: sunrise (Drik anchors tithi, ritu and ayana there), else noon. */
const anchor = (loc: Location, date: string) => sunriseOn(loc, date) ?? noon(loc, date)

// ── Angles (the library's formulas: aberration-corrected geocentric vectors) ─────

const tropical = (body: Body, t: Date) => Ecliptic(GeoVector(body, t, true)).elon
const norm = (deg: number) => ((deg % 360) + 360) % 360

/**
 * Lahiri ayanamsha as Drik publishes it. The library's value is 24.14″ smaller on every one
 * of the 48 Drik day pages (1995–2045, three cities: "Lahiri Ayanamsha" 24.237596 vs
 * 24.230890 on 2026-10-04) — a constant, so a different epoch value. That gap put every
 * Sankranti ~9 min before Drik's (SPEC 4.11).
 */
const DRIK_LAHIRI_OFFSET = 24.14 / 3600
const getAyanamsa = (t: Date) => libraryAyanamsa(t) + DRIK_LAHIRI_OFFSET

/** Moon − Sun. Astronomy Engine's MoonPhase() differs by ~40 s of time; this matches mypanchang to ~8 s. */
const elongation = (t: Date) => norm(tropical(Body.Moon, t) - tropical(Body.Sun, t))
const siderealMoon = (ayanamsa: number) => (t: Date) => norm(tropical(Body.Moon, t) - ayanamsa)
const yogaAngle = (ayanamsa: number) => (t: Date) => norm(tropical(Body.Sun, t) + tropical(Body.Moon, t) - 2 * ayanamsa)

/** The instant in (a, b] when `angle` passes `target`, given it does so exactly once. */
function crossing(angle: (t: Date) => number, target: number, a: Date, b: Date): Date {
  const f = (t: { date: Date }) => norm(angle(t.date) - target + 180) - 180
  const hit = Search(f, MakeTime(a), MakeTime(b), { dt_tolerance_seconds: 1 })
  if (!hit) throw new Error(`no crossing of ${target}° between ${a.toISOString()} and ${b.toISOString()}`)
  return hit.date
}

/**
 * Contiguous spans of an angle split into `step`-degree sectors, covering [from, to), with
 * true boundaries (the first may start before `from`, the last end after `to`). `maxDays`
 * is the longest a sector can last — 1.3 days for the five elements, longer for the signs —
 * so the brackets below hold exactly one crossing.
 */
function sectorSpans(angle: (t: Date) => number, step: number, from: Date, to: Date, indexOf: (k: number) => number, maxDays = 1.3): Span[] {
  let k = Math.floor(angle(from) / step)
  let start = crossing(angle, k * step, new Date(from.getTime() - maxDays * DAY_MS), from)
  const out: Span[] = []
  while (start < to) {
    const end = crossing(angle, ((k + 1) * step) % 360, new Date(start.getTime() + 1000), new Date(start.getTime() + (maxDays + 0.2) * DAY_MS))
    out.push({ index: indexOf(k), start, end })
    start = end
    k = (k + 1) % Math.round(360 / step)
  }
  return out
}

/** Karana type 1-11 for half-tithi h (1-60), SPEC 4.4. */
function karanaType(h: number): number {
  if (h === 1) return 11 // Kimstughna
  if (h >= 58) return h - 50 // 58 Shakuni → 8, 59 Chatushpada → 9, 60 Naga → 10
  return ((h - 2) % 7) + 1 // Bava … Vishti
}

const NAKSHATRA = 360 / 27
const SIGN = 30
// Longest stay in one sign: the Moon ~2.5 days.
const MOON_SIGN_DAYS = 2.8
const siderealSun = (ayanamsa: number) => (t: Date) => norm(tropical(Body.Sun, t) - ayanamsa)

// ── Moon and Sun events ─────────────────────────────────────────────────────────

/** First instant in [from, to) when the Moon reaches `phase` degrees of elongation. */
function moonPhaseIn(phase: number, from: Date, to: Date): Date | null {
  const t = SearchMoonPhase(phase, from, (to.getTime() - from.getTime()) / DAY_MS)
  return t && t.date < to ? t.date : null
}

function sunLongitudeIn(lon: number, from: Date, to: Date): Date | null {
  const t = SearchSunLongitude(lon, from, (to.getTime() - from.getTime()) / DAY_MS)
  return t && t.date < to ? t.date : null
}

/**
 * Spans of the Sun's sign — 30° sectors of its longitude minus `offset` (the ayanamsha for
 * Vedic signs, 0 for Western) — covering [from, to). The Sun crosses each longitude once a
 * year, so SearchSunLongitude over a month finds the one boundary; the generic bracketing
 * search over 32 days cost a month view ~2× its time budget.
 */
function sunSignSpans(offset: number, from: Date, to: Date): Span[] {
  const lon = (t: Date) => norm(SunPosition(t).elon - offset)
  let k = Math.floor(lon(from) / SIGN)
  let start = sunLongitudeIn(norm(k * SIGN + offset), new Date(from.getTime() - 32 * DAY_MS), new Date(from.getTime() + 1))!
  const out: Span[] = []
  while (start < to) {
    const end = sunLongitudeIn(norm((k + 1) * SIGN + offset), new Date(start.getTime() + 1000), new Date(start.getTime() + 33 * DAY_MS))!
    out.push({ index: k + 1, start, end })
    start = end
    k = (k + 1) % 12
  }
  return out
}

/** New moons found so far, sorted: each lunation is searched once, not once per day. */
const newMoons: Date[] = []

/** The new moons that open and close the lunation containing `t`. */
function lunation(t: Date): [Date, Date] {
  for (let i = 0; i + 1 < newMoons.length; i++) {
    const [a, b] = [newMoons[i], newMoons[i + 1]]
    // Neighbours in the list are one lunation apart only if none is missing between them.
    if (a <= t && t < b && b.getTime() - a.getTime() < 31 * DAY_MS) return [a, b]
  }
  const first = moonPhaseIn(0, new Date(t.getTime() - 30 * DAY_MS), t)!
  const opened = moonPhaseIn(0, new Date(first.getTime() + DAY_MS), t) ?? first
  const closes = moonPhaseIn(0, new Date(t.getTime() + 1), new Date(t.getTime() + 31 * DAY_MS))!
  if (newMoons.length > 200) newMoons.length = 0
  for (const m of [opened, closes]) if (!newMoons.some((n) => Math.abs(n.getTime() - m.getTime()) < DAY_MS)) newMoons.push(m)
  newMoons.sort((a, b) => a.getTime() - b.getTime())
  return [opened, closes]
}

// ── Day marks: eclipses, Sankranti, Guru/Ravi Pushya (SPEC 4.11) ─────────────────

const MIN_MS = 60_000
const PUSHYA = 8
// Weekday (0 = Sunday) → the Moon's stars that make it Amrit Siddhi / Sarvartha Siddhi, as
// derived from Drik's 2026 lists (SPEC 4.11): Hasta, Mrigashira, Ashwini, Anuradha, Pushya,
// Revati, Rohini; every Amrit pair is also in the Sarvartha list.
const AMRIT_SIDDHI = [13, 5, 1, 17, 8, 27, 4]
const SARVARTHA_SIDDHI = [
  [1, 8, 12, 13, 19, 21, 26],
  [4, 5, 8, 17, 22],
  [1, 3, 9, 26],
  [3, 4, 5, 13, 17],
  [1, 7, 8, 17, 27],
  [1, 7, 17, 22, 27],
  [4, 15, 22],
]

/** Is the Moon above the horizon here at any of these instants? */
const moonUp = (loc: Location, times: Date[]) =>
  times.some((t) => {
    const eq = Equator(Body.Moon, t, observerOf(loc), true, true)
    return Horizon(t, observerOf(loc), eq.ra, eq.dec, 'normal').altitude > 0
  })

/**
 * Is the body up here at `t`, by Drik's rules? The Sun: its upper edge, refraction included
 * (Drik's sunrise). The Moon: its centre, without refraction — that rule meets all 91 of Drik's
 * moonrise and moonset times in tests/fixtures/drik within 0.7 min; the library's moonrise, with
 * refraction, is 4–10 min early (not shown in the app).
 */
const limbUp = (loc: Location, body: Body.Sun | Body.Moon, t: Date) => {
  const eq = Equator(body, t, observerOf(loc), true, true)
  return body === Body.Sun
    ? Horizon(t, observerOf(loc), eq.ra, eq.dec, 'normal').altitude > -0.27 // half the Sun's disc
    : Horizon(t, observerOf(loc), eq.ra, eq.dec).altitude > 0
}

/** The part of [from, to] while the body is up here, to the minute; null if it never is. */
function upPart(loc: Location, body: Body.Sun | Body.Moon, from: Date, to: Date): Interval | null {
  let a: Date | null = null, b: Date | null = null
  for (let t = from.getTime(); t <= to.getTime(); t += MIN_MS) {
    if (!limbUp(loc, body, new Date(t))) continue
    a ??= new Date(t)
    b = new Date(t)
  }
  if (a && b && b.getTime() + MIN_MS > to.getTime()) b = to
  return a && b && a < b ? { start: a, end: b } : null
}

/**
 * Marks for every civil day of a month, found once per month: each search below spans the
 * month, not a day, so the month screen stays inside its speed budget.
 */
function monthMarks(loc: Location, first: string): Map<string, DayMark[]> {
  return remember(marksByMonth, key(loc, first), () => {
    const next = `${first.slice(0, 5)}${String(Number(first.slice(5, 7)) + 1).padStart(2, '0')}-01`
    const start = midnight(loc, first)
    const end = first.slice(5, 7) === '12' ? midnight(loc, `${Number(first.slice(0, 4)) + 1}-01-01`) : midnight(loc, next)
    const out = new Map<string, DayMark[]>()
    const add = (at: Date, m: DayMark) => {
      const d = civilDate(loc.tz, at)
      out.set(d, [...(out.get(d) ?? []), m])
    }

    // Eclipses, dated by their peak. Visible = any part above the horizon here.
    for (let e = SearchLunarEclipse(start); e.peak.date < end; e = NextLunarEclipse(e.peak)) {
      if (e.peak.date < start) continue
      const p = e.peak.date.getTime()
      // Like Drik, report the deepest phase this place sees: the Moon rising after totality has
      // ended makes a total eclipse partial here (New Delhi, 2026-03-03).
      const phases = [['total', e.sd_total], ['partial', e.sd_partial], ['penumbral', e.sd_penum]] as const
      const seen = phases.find(([, sd]) => sd > 0 && moonUp(loc, Array.from({ length: 13 }, (_, i) => new Date(p + (i / 6 - 1) * sd * MIN_MS))))
      // The time to avoid, as on Drik: from the first to the last contact with the umbra (the
      // penumbra when the Moon misses the umbra), while the Moon is up here.
      const sd = e.sd_partial > 0 ? e.sd_partial : e.sd_penum
      const shown = seen ? upPart(loc, Body.Moon, new Date(p - sd * MIN_MS), new Date(p + sd * MIN_MS)) : null
      add(e.peak.date, { kind: 'eclipse', body: 'moon', type: seen ? seen[0] : e.kind, peak: e.peak.date, visible: !!seen, seen: shown })
    }
    for (let e = SearchGlobalSolarEclipse(start); e.peak.date < end; e = NextGlobalSolarEclipse(e.peak)) {
      if (e.peak.date < start) continue
      const local = SearchLocalSolarEclipse(new Date(e.peak.date.getTime() - DAY_MS), observerOf(loc))
      const same = Math.abs(local.peak.time.date.getTime() - e.peak.date.getTime()) < DAY_MS
      const visible = same && [local.partial_begin, local.peak, local.partial_end].some((x) => x.altitude > 0)
      // Seen from here, a total eclipse is usually partial: report what this place gets.
      const type = (visible ? local.kind : e.kind) as 'partial' | 'annular' | 'total'
      const shown = visible ? upPart(loc, Body.Sun, local.partial_begin.time.date, local.partial_end.time.date) : null
      add(e.peak.date, { kind: 'eclipse', body: 'sun', type, peak: e.peak.date, visible, seen: shown })
    }

    // Sankranti: the start of each Vedic Sun-sign span inside the month.
    for (const s of sunSignSpans(getAyanamsa(start), start, end)) {
      if (s.start >= start && s.start < end) add(s.start, { kind: 'sankranti', sign: s.index, at: s.start })
    }

    // Star days: the Moon in a given star during a given weekday's Panchang day (sunrise to
    // sunrise) — Guru/Ravi Pushya, Amrit Siddhi, Sarvartha Siddhi. One pass over the stars.
    const moon = siderealMoon(getAyanamsa(start))
    // The month's last Panchang day runs to the next sunrise, past the month's end.
    for (const s of sectorSpans(moon, NAKSHATRA, new Date(start.getTime() - 2 * DAY_MS), new Date(end.getTime() + 1.5 * DAY_MS), (k) => k + 1)) {
      // A Panchang day runs sunrise to sunrise, so a star starting before dawn on Monday still
      // belongs to Sunday: start one civil day early.
      for (let d = addDays(civilDate(loc.tz, s.start), -1); d <= civilDate(loc.tz, s.end); d = addDays(d, 1)) {
        if (d < first || d >= next) continue
        const weekday = new Date(`${d}T12:00:00Z`).getUTCDay()
        const pushya = s.index === PUSHYA && (weekday === 4 || weekday === 0)
        const amrit = AMRIT_SIDDHI[weekday] === s.index
        const sarvartha = SARVARTHA_SIDDHI[weekday].includes(s.index)
        if (!pushya && !sarvartha) continue // every Amrit Siddhi pair is also Sarvartha
        const rise = sunriseOn(loc, d), nextRise = sunriseOn(loc, addDays(d, 1))
        if (!rise || !nextRise) continue
        const a = s.start > rise ? s.start : rise, b = s.end < nextRise ? s.end : nextRise
        if (a >= b) continue
        const marks = out.get(d) ?? []
        if (pushya) marks.push({ kind: 'pushya', weekday: weekday as 0 | 4, start: a, end: b })
        if (amrit) marks.push({ kind: 'siddhi', yoga: 'amrit', start: a, end: b })
        // Two qualifying stars back to back on one day make one window, as on Drik.
        const prev = marks.find((m) => m.kind === 'siddhi' && m.yoga === 'sarvartha' && m.end.getTime() === a.getTime())
        if (prev && prev.kind === 'siddhi') prev.end = b
        else marks.push({ kind: 'siddhi', yoga: 'sarvartha', start: a, end: b })
        out.set(d, marks)
      }
    }
    return out
  })
}
const marksByMonth = new Map<string, Map<string, DayMark[]>>()
const marksOn = (loc: Location, date: string) => monthMarks(loc, `${date.slice(0, 7)}-01`).get(date) ?? []

// ── Traditional rhythm (SPEC 4.8) ───────────────────────────────────────────────

const RITU_START = [330, 30, 90, 150, 210, 270] // tropical Sun longitude at which each ritu begins

/** First civil day whose sunrise comes after `boundary`. */
function firstDayAfter(loc: Location, boundary: Date): string {
  const day = civilDate(loc.tz, boundary)
  return anchor(loc, day) >= boundary ? day : addDays(day, 1)
}

function rhythm(loc: Location, date: string): DayPanchang['rhythm'] {
  const dayStart = midnight(loc, date)
  const dayEnd = midnight(loc, addDays(date, 1))
  const ref = anchor(loc, date)
  const lon = SunPosition(ref).elon
  const ritu = Math.floor(norm(lon - 330) / 60) + 1
  const ayana: Ayana = lon >= 270 || lon < 90 ? 'uttarayana' : 'dakshinayana'

  const rituStart = sunLongitudeIn(RITU_START[ritu - 1], new Date(ref.getTime() - 70 * DAY_MS), ref)!
  const rituEnd = sunLongitudeIn(RITU_START[ritu % 6], ref, new Date(ref.getTime() + 70 * DAY_MS))!
  const firstDay = firstDayAfter(loc, rituStart)
  const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)

  // Astronomical moments inside this civil day; the new ritu/ayana counts from the next sunrise.
  const events: DayPanchang['rhythm']['events'] = []
  for (const boundary of RITU_START) {
    const t = sunLongitudeIn(boundary, dayStart, dayEnd)
    if (t) events.push({ kind: 'ritu', at: t })
  }
  for (const solstice of [90, 270]) {
    const t = sunLongitudeIn(solstice, dayStart, dayEnd)
    if (t) events.push({ kind: 'ayana', at: t })
  }

  const fullMoon = moonPhaseIn(180, midnight(loc, addDays(date, -1)), midnight(loc, addDays(date, 2)))
  const newMoon = moonPhaseIn(0, dayStart, dayEnd)
  return {
    restDay: fullMoon ? 'fullMoon' : newMoon ? 'newMoon' : null,
    ayana,
    ritu,
    rituDay: days(firstDay, date) + 1,
    rituLength: days(firstDay, firstDayAfter(loc, rituEnd)),
    events,
  }
}

// ── Lunar month (SPEC 4.10) ─────────────────────────────────────────────────────

/** Sidereal sign of the Sun at `t`, 0 Mesha … 11 Meena. */
const sunSignAt = (t: Date) => Math.floor(siderealSun(getAyanamsa(t))(t) / SIGN)

/**
 * Amanta month: new moon to new moon, named by the Sun's sidereal sign at the new moon that
 * opens it (Sun in Meena → Chaitra, in Simha → Bhadrapada). A month with no Sankranti — the
 * Sun in the same sign at both new moons — is adhika (leap) and takes the next month's name.
 * Purnimanta months end at the full moon, so in the waning half they already carry the next
 * month's name; an adhika month keeps its span in both systems (Drik).
 */
function masaAt(t: Date): DayPanchang['masa'] {
  const [opened, closes] = lunation(t)
  const sign = sunSignAt(opened)
  const amanta = ((sign + 1) % 12) + 1
  const adhika = sign === sunSignAt(closes)
  const waning = elongation(t) >= 180
  return { amanta, purnimanta: waning && !adhika ? (amanta % 12) + 1 : amanta, adhika }
}

// ── Ekadashi (SPEC 4.7) ─────────────────────────────────────────────────────────

const isEkadashi = (tithi: number) => tithi === 11 || tithi === 26
const sunriseTithi = (loc: Location, date: string) => Math.floor(elongation(anchor(loc, date)) / 12) + 1

/**
 * Smarta (household) Ekadashi day, from the tithi at sunrise on the previous day, this day,
 * the next day and the day after. Found on Drik's 2026 lists and confirmed on 2027
 * (147 dates, Vilnius, New York, New Delhi).
 * - Ekadashi at this sunrise only → this day, unless the next sunrise is already in
 *   Trayodashi (Dwadashi skipped, "Trisparsha"): the fast then moves to the day before,
 *   so it can be broken during Dwadashi.
 * - Ekadashi at two sunrises → the second day.
 * - Ekadashi at no sunrise (skipped) → the day it begins.
 */
export function isSmartaEkadashi(prev: number, cur: number, next: number, next2: number): boolean {
  const trisparsha = (ek: number, after: number) => after === ek + 2
  if (isEkadashi(cur)) {
    if (isEkadashi(prev)) return true // second of two sunrises
    if (isEkadashi(next)) return false // first of two: wait for the second
    return !trisparsha(cur, next)
  }
  if (isEkadashi(next) && !isEkadashi(next2) && trisparsha(next, next2)) return true // moved one day earlier
  return isEkadashi(cur + 1) && next === cur + 2 // skipped Ekadashi begins today
}

const smartaEkadashiOn = (loc: Location, date: string) =>
  isSmartaEkadashi(
    sunriseTithi(loc, addDays(date, -1)),
    sunriseTithi(loc, date),
    sunriseTithi(loc, addDays(date, 1)),
    sunriseTithi(loc, addDays(date, 2)),
  )

/**
 * Parana — when to end the fast kept on Ekadashi day `date`: on the next day, inside Dwadashi
 * (the 12th tithi) but after its first quarter (Hari Vasara), in the morning (Pratahkala, the
 * first fifth of daylight). If Hari Vasara outlasts the morning, after midday instead
 * (Aparahna, the fourth fifth); if it outlasts that too, from its end until Dwadashi ends. Rules from Drik's Ekadashi pages; tests/fixtures/parana.
 */
function paranaAfter(loc: Location, date: string): Interval | null {
  const day = addDays(date, 1)
  const rise = sunriseOn(loc, day)
  const set = sunsetOn(loc, day)
  if (!rise || !set) return null
  const ref = anchor(loc, date)
  const dwadashi = elongation(ref) < 180 ? 12 : 27
  const dw = sectorSpans(elongation, 12, ref, set, (k) => k + 1).find((s) => s.index === dwadashi)
  if (!dw) return null
  const part = (set.getTime() - rise.getTime()) / 5
  const after = (n: number) => new Date(rise.getTime() + n * part)
  const later = (a: Date, b: Date) => (a > b ? a : b)
  const sooner = (a: Date, b: Date) => (a < b ? a : b)
  // Dwadashi already over at sunrise: nothing to wait for or to stay inside.
  if (dw.end <= rise) return { start: rise, end: after(1) }
  const hariVasara = new Date(dw.start.getTime() + (dw.end.getTime() - dw.start.getTime()) / 4)
  const start = later(rise, hariVasara)
  if (start < after(1)) return { start, end: sooner(after(1), dw.end) }
  const afternoon = later(after(3), hariVasara)
  if (afternoon < after(4)) return { start: afternoon, end: sooner(after(4), dw.end) }
  // Hari Vasara outlasts the afternoon too: any time after it while Dwadashi lasts (Drik
  // then gives only the start, "Parana Time - 03:43 PM").
  return { start: hariVasara, end: dw.end }
}

// ── The sky at an instant (Sky screen) ─────────────────────────────────────────────

/** Sidereal (Drik Lahiri) longitudes of the Sun and the Moon at `t`, in degrees 0–360. */
export function skyAt(t: Date): { sun: number; moon: number } {
  const ayanamsa = getAyanamsa(t)
  return { sun: siderealSun(ayanamsa)(t), moon: siderealMoon(ayanamsa)(t) }
}

// ── The day ─────────────────────────────────────────────────────────────────────

const interval = (w: { start: Date; end: Date } | null | undefined): Interval | null =>
  w?.start && w?.end ? { start: new Date(w.start), end: new Date(w.end) } : null

const computed = new Map<string, DayPanchang>()

/**
 * Choghadiya (SPEC 4.5): day and night each split into 8 equal parts. The names follow the
 * cycle of their ruling lights — Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars. By day the
 * first part is the weekday's own light and each part takes the next; by night the first is
 * five steps on and each part goes two steps back. The 8th part repeats the 1st. Checked
 * against Drik's pages for every weekday (tests/choghadiya.test.ts). panchangam-js 3.0.0 has
 * Rog and Shubh swapped in its day cycle, so its Sunday, Monday, Wednesday and Friday day
 * tables differ from Drik (its night tables agree) — it is not used.
 */
const CHOGHADIYA_CYCLE: ChoghadiyaName[] = ['udveg', 'chal', 'labh', 'amrit', 'kaal', 'shubh', 'rog']
/** Where each weekday (0 = Sunday) starts in the cycle: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn. */
const CHOGHADIYA_DAY_START = [0, 3, 6, 2, 5, 1, 4]

function choghadiyaRun(from: Date, to: Date, first: number, step: number, night: boolean): Choghadiya[] {
  const at = (k: number) => new Date(from.getTime() + ((to.getTime() - from.getTime()) * k) / 8)
  return Array.from({ length: 8 }, (_, i) => ({ name: CHOGHADIYA_CYCLE[(((first + step * i) % 7) + 7) % 7], start: at(i), end: i === 7 ? to : at(i + 1), night }))
}
const choghadiyaDay = (sunrise: Date, sunset: Date, vara: number) => choghadiyaRun(sunrise, sunset, CHOGHADIYA_DAY_START[vara], 1, false)
const choghadiyaNight = (sunset: Date, nextSunrise: Date, vara: number) => choghadiyaRun(sunset, nextSunrise, CHOGHADIYA_DAY_START[vara] + 5, -2, true)

export function computeDay(date: string, loc: Location): DayPanchang {
  return remember(computed, key(loc, date), () => {
    const observer = observerOf(loc)
    const options = optionsOf(loc, date)
    const middle = noon(loc, date)
    const sunrise = sunriseOn(loc, date)
    const sunset = sunsetOn(loc, date)
    const nextSunrise = sunriseOn(loc, addDays(date, 1))
    const lastSunset = sunsetOn(loc, addDays(date, -1))
    const ref = sunrise ?? middle
    const ayanamsa = getAyanamsa(ref)
    const vara = getVara(ref, observer, options.timezoneOffset)
    const e = elongation(middle)

    // Without a sunrise (polar day/night) there is no Panchang day; the civil day stands in,
    // so the elements are still shown.
    const from = sunrise ?? midnight(loc, date)
    const to = nextSunrise ?? midnight(loc, addDays(date, 1))
    const span = (angle: (t: Date) => number, step: number, indexOf: (k: number) => number, maxDays?: number) =>
      sectorSpans(angle, step, from, to, indexOf, maxDays)
    const sign = (k: number) => k + 1
    const ekadashi = smartaEkadashiOn(loc, date)
    const lit = sunrise && sunset ? ([sunrise, sunset] as const) : null
    const rahu = lit ? calculateRahuKalam(...lit, vara) : null

    return {
      date,
      sunrise,
      sunset,
      nextSunrise,
      moonrise: getMoonrise(middle, observer, options),
      moonset: getMoonset(middle, observer, options),
      moon: { illumination: Illumination(Body.Moon, middle).phase_fraction, waxing: e < 180, elongation: e },
      vara,
      tithi: span(elongation, 12, (k) => k + 1),
      nakshatra: span(siderealMoon(ayanamsa), NAKSHATRA, (k) => k + 1).map((s) => {
        const t = sunrise && s.start < sunrise ? sunrise : s.start
        return { ...s, pada: (Math.floor(siderealMoon(ayanamsa)(t) / (NAKSHATRA / 4)) % 4) + 1 }
      }),
      yoga: span(yogaAngle(ayanamsa), NAKSHATRA, (k) => k + 1),
      karana: span(elongation, 6, (k) => karanaType(k + 1)),
      windows: {
        brahma: sunrise ? interval(calculateBrahmaMuhurta(sunrise, lastSunset ?? undefined)) : null,
        // Drik shows no Abhijit Muhurta on Wednesdays (P1 fixtures, SPEC 4.5).
        abhijit: sunrise && sunset && vara !== 3 ? interval(calculateAbhijitMuhurta(sunrise, sunset)) : null,
        rahuKaal: interval(rahu),
        yamaganda: lit ? interval(calculateYamagandaKalam(...lit, vara)) : null,
        gulika: lit ? interval(calculateGulikaKalam(...lit, vara)) : null,
      },
      choghadiya: lit && nextSunrise ? [...choghadiyaDay(...lit, vara), ...choghadiyaNight(lit[1], nextSunrise, vara)] : [],
      // Between midnight and sunrise the previous Panchang day's night is still running.
      choghadiyaBefore: sunrise && lastSunset ? choghadiyaNight(lastSunset, sunrise, (vara + 6) % 7) : [],
      ekadashi,
      parana: ekadashi ? paranaAfter(loc, date) : smartaEkadashiOn(loc, addDays(date, -1)) ? paranaAfter(loc, addDays(date, -1)) : null,
      masa: masaAt(ref),
      signs: {
        vedic: {
          moon: span(siderealMoon(ayanamsa), SIGN, sign, MOON_SIGN_DAYS),
          sun: sunSignSpans(ayanamsa, from, to),
        },
        western: {
          moon: span((t) => tropical(Body.Moon, t), SIGN, sign, MOON_SIGN_DAYS),
          sun: sunSignSpans(0, from, to),
        },
      },
      newMoon: moonPhaseIn(0, midnight(loc, date), midnight(loc, addDays(date, 1))),
      fullMoon: moonPhaseIn(180, midnight(loc, date), midnight(loc, addDays(date, 1))),
      rhythm: rhythm(loc, date),
      marks: marksOn(loc, date),
      ayanamsha: ayanamsa,
    }
  })
}

const months = new Map<string, MonthDay[]>()

/**
 * The month screen's per-day summary (SPEC 8). Only what a calendar cell and the key-dates
 * list need — no element spans, signs or windows — so a month fits the speed budget that
 * 31 full computeDay calls did not (PLAN P5).
 */
export function computeMonth(year: number, month: number, loc: Location): MonthDay[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  return remember(months, key(loc, first), () => {
    const days: string[] = []
    for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) days.push(d)
    const start = midnight(loc, first)
    const end = midnight(loc, addDays(days[days.length - 1], 1))
    // Every new and full moon of the month, found once instead of once per day.
    const phases = (phase: number) => {
      const out: Date[] = []
      for (let t = moonPhaseIn(phase, start, end); t; t = moonPhaseIn(phase, new Date(t.getTime() + DAY_MS), end)) out.push(t)
      return out
    }
    const newMoons = phases(0)
    const fullMoons = phases(180)
    const inDay = (list: Date[], date: string) => list.find((t) => civilDate(loc.tz, t) === date) ?? null
    return days.map((date) => {
      const middle = noon(loc, date)
      const e = elongation(middle)
      return {
        date,
        moon: { illumination: Illumination(Body.Moon, middle).phase_fraction, waxing: e < 180, elongation: e },
        tithi: sunriseTithi(loc, date),
        ekadashi: smartaEkadashiOn(loc, date),
        newMoon: inDay(newMoons, date),
        fullMoon: inDay(fullMoons, date),
        rhythm: rhythm(loc, date),
        marks: marksOn(loc, date),
      }
    })
  })
}
