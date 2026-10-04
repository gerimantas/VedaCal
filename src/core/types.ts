// The contract between the calculation core and the UI (.planning/SPEC.md section 8).
// The UI reads only these types; changing the engine must not change them.

export type Location = {
  name: string
  country: string
  lat: number
  lon: number
  elevation: number // metres
  tz: string // IANA zone, e.g. "Europe/Vilnius"
}

export type Interval = { start: Date; end: Date }

/**
 * One element (tithi, nakshatra, yoga, karana) active during the Panchang day.
 * `start` may be before sunrise and `end` after the next sunrise — they are the element's
 * true boundaries. Spans of one element are contiguous.
 */
export type Span = { index: number; start: Date; end: Date }

export type Ayana = 'uttarayana' | 'dakshinayana'

export type DayPanchang = {
  date: string // civil date YYYY-MM-DD in the location's zone
  sunrise: Date | null
  sunset: Date | null
  nextSunrise: Date | null
  moonrise: Date | null
  moonset: Date | null
  moon: { illumination: number; waxing: boolean; elongation: number } // at local noon
  vara: number // 0 = Sunday
  tithi: Span[] // index 1-30: 1-15 Shukla (15 Purnima), 16-30 Krishna (30 Amavasya)
  nakshatra: (Span & { pada: number })[] // index 1-27; pada 1-4 at the later of sunrise and span start
  yoga: Span[] // index 1-27
  karana: Span[] // index 1-11, see KARANA_NAMES
  windows: { brahma: Interval | null; abhijit: Interval | null; rahuKaal: Interval | null }
  ekadashi: boolean
  newMoon: Date | null // instant inside this civil day
  fullMoon: Date | null
  rhythm: {
    restDay: 'fullMoon' | 'newMoon' | null // full moon: day before, day of, day after; new moon: day of only
    ayana: Ayana
    ritu: number // 1 Vasanta … 6 Shishira
    rituDay: number // 1-based civil day within the current ritu
    rituLength: number // civil days in the current ritu
    events: { kind: 'ayana' | 'ritu'; at: Date }[] // changes inside this civil day
  }
  ayanamsha: number // degrees, Lahiri
}

/** Karana types by index 1-11 (names are keys into the content file). */
export const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
] as const
