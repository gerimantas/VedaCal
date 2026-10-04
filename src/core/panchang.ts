// Calculation core (.planning/SPEC.md sections 4 and 11).
//
// From @ishubhamx/panchangam-js we take sunrise/sunset/moonrise/moonset, the Lahiri
// ayanamsa, the weekday and the Rahu Kaal / Abhijit / Brahma Muhurta formulas. Element
// boundaries (tithi, nakshatra, yoga, karana) are found here with the library's own angle
// formulas but a bracketing search: its getPanchangam() and transition finders made a month
// take 1.3 s on a 4×-throttled CPU (P1 gate: 300 ms), and its karana list drops the fixed
// karanas around the new moon. The P1 fixtures (Drik, mypanchang) check every value.
import {
  Body,
  Ecliptic,
  GeoVector,
  Illumination,
  MakeTime,
  Observer,
  Search,
  SearchMoonPhase,
  SearchSunLongitude,
  SunPosition,
} from 'astronomy-engine'
// Deep imports on purpose: the package root also loads kundli/exporter.js (needs Node's `fs`).
import { getAyanamsa } from '@ishubhamx/panchangam-js/dist/core/ayanamsa'
import { getMoonrise, getMoonset, getSunrise, getSunset } from '@ishubhamx/panchangam-js/dist/core/rise-set'
import { calculateAbhijitMuhurta, calculateBrahmaMuhurta } from '@ishubhamx/panchangam-js/dist/muhurta/abhijit'
import { calculateRahuKalam } from '@ishubhamx/panchangam-js/dist/muhurta/rahu-kaal'
import { getVara } from '@ishubhamx/panchangam-js/dist/calendar/vara'
import { addDays, civilDate, tzOffsetMinutes, zonedTimeToUtc } from './time'
import type { Ayana, DayPanchang, Interval, Location, Span } from './types'

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
 * true boundaries (the first may start before `from`, the last end after `to`). Every
 * element lasts under 1.3 days, so the brackets below hold exactly one crossing.
 */
function sectorSpans(angle: (t: Date) => number, step: number, from: Date, to: Date, indexOf: (k: number) => number): Span[] {
  let k = Math.floor(angle(from) / step)
  let start = crossing(angle, k * step, new Date(from.getTime() - 1.3 * DAY_MS), from)
  const out: Span[] = []
  while (start < to) {
    const end = crossing(angle, ((k + 1) * step) % 360, new Date(start.getTime() + 1000), new Date(start.getTime() + 1.5 * DAY_MS))
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

// ── The day ─────────────────────────────────────────────────────────────────────

const interval = (w: { start: Date; end: Date } | null | undefined): Interval | null =>
  w?.start && w?.end ? { start: new Date(w.start), end: new Date(w.end) } : null

const computed = new Map<string, DayPanchang>()

export function computeDay(date: string, loc: Location): DayPanchang {
  return remember(computed, key(loc, date), () => {
    const observer = observerOf(loc)
    const options = optionsOf(loc, date)
    const middle = noon(loc, date)
    const sunrise = sunriseOn(loc, date)
    const sunset = sunsetOn(loc, date)
    const nextSunrise = sunriseOn(loc, addDays(date, 1))
    const ref = sunrise ?? middle
    const ayanamsa = getAyanamsa(ref)
    const vara = getVara(ref, observer, options.timezoneOffset)
    const e = elongation(middle)

    // Without a sunrise (polar day/night) there is no Panchang day to divide.
    const span = (angle: (t: Date) => number, step: number, indexOf: (k: number) => number) =>
      sunrise && nextSunrise ? sectorSpans(angle, step, sunrise, nextSunrise, indexOf) : []
    const rahu = sunrise && sunset ? calculateRahuKalam(sunrise, sunset, vara) : null

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
        brahma: sunrise ? interval(calculateBrahmaMuhurta(sunrise, sunsetOn(loc, addDays(date, -1)) ?? undefined)) : null,
        // Drik shows no Abhijit Muhurta on Wednesdays (P1 fixtures, SPEC 4.5).
        abhijit: sunrise && sunset && vara !== 3 ? interval(calculateAbhijitMuhurta(sunrise, sunset)) : null,
        rahuKaal: interval(rahu),
      },
      ekadashi: isSmartaEkadashi(
        sunriseTithi(loc, addDays(date, -1)),
        sunriseTithi(loc, date),
        sunriseTithi(loc, addDays(date, 1)),
        sunriseTithi(loc, addDays(date, 2)),
      ),
      newMoon: moonPhaseIn(0, midnight(loc, date), midnight(loc, addDays(date, 1))),
      fullMoon: moonPhaseIn(180, midnight(loc, date), midnight(loc, addDays(date, 1))),
      rhythm: rhythm(loc, date),
      ayanamsha: ayanamsa,
    }
  })
}

export function computeMonth(year: number, month: number, loc: Location): DayPanchang[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const out: DayPanchang[] = []
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) out.push(computeDay(d, loc))
  return out
}
