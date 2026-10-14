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

/** Choghadiya names (keys into the content file) and how tradition rates each. */
export const CHOGHADIYA_RATING = {
  amrit: 'good', shubh: 'good', labh: 'good', chal: 'neutral', udveg: 'avoid', rog: 'avoid', kaal: 'avoid',
} as const
export type ChoghadiyaName = keyof typeof CHOGHADIYA_RATING
/** One of the 16 Choghadiya parts: 8 from sunrise to sunset, then 8 to the next sunrise. */
export type Choghadiya = Interval & { name: ChoghadiyaName; night: boolean }

/**
 * One element (tithi, nakshatra, yoga, karana) active during the Panchang day.
 * `start` may be before sunrise and `end` after the next sunrise — they are the element's
 * true boundaries. Spans of one element are contiguous.
 */
export type Span = { index: number; start: Date; end: Date }

/** Spans covering the Panchang day, like the five elements; the Sun's sign usually has one span lasting weeks. */
export type SignSpans = { moon: Span[]; sun: Span[] }

/**
 * Day-level markers for the month and day screens (SPEC 4.11):
 * - eclipse on this civil day (peak), and whether any of it is above the horizon here; for a
 *   visible solar eclipse `type` is what this place sees (partial where the path is total);
 *   `seen`: the time to avoid here — the eclipse (lunar: umbral contacts) while the body is up;
 * - Sankranti: the Sun enters the next Vedic (sidereal) sign at `at`;
 * - Pushya: Pushya nakshatra overlaps a Thursday (Guru Pushya) or Sunday (Ravi Pushya)
 *   Panchang day, sunrise to sunrise — traditionally favoured for beginnings;
 * - Siddhi: the Moon's star and the weekday make Amrit Siddhi (rare, favoured) or Sarvartha
 *   Siddhi (about ten days a month) Yoga, sunrise to sunrise; times are the overlap.
 */
export type DayMark =
  | { kind: 'eclipse'; body: 'sun' | 'moon'; type: 'penumbral' | 'partial' | 'annular' | 'total'; peak: Date; visible: boolean; seen: Interval | null }
  | { kind: 'sankranti'; sign: number; at: Date }
  | { kind: 'pushya'; weekday: 0 | 4; start: Date; end: Date }
  | { kind: 'siddhi'; yoga: 'amrit' | 'sarvartha'; start: Date; end: Date }

/**
 * An eclipse seen here, for the windows it casts on the days around it (rule registry E1).
 * Lunar eclipses count from the first to the last contact with the umbra; penumbral-only
 * eclipses are not counted. `day` is the app's day (Brahma Muhurta to the next sunrise, SPEC
 * 13.1) in which the seen part starts; `magnitude` is the deepest phase seen here, as a
 * fraction of the body's diameter; `rose` / `set`: the body rose already eclipsed / set
 * still eclipsed; `stars`: the Moon's nakshatras while it is seen.
 */
export type SeenEclipse = { body: 'sun' | 'moon'; day: string; seen: Interval; magnitude: number; rose: boolean; set: boolean; stars: number[] }

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
  windows: {
    brahma: Interval | null
    abhijit: Interval | null
    rahuKaal: Interval | null
    yamaganda: Interval | null
    gulika: Interval | null
  }
  choghadiya: Choghadiya[] // 16 parts, sunrise to next sunrise; empty without a sunrise or sunset
  choghadiyaBefore: Choghadiya[] // the 8 night parts of the day before, ending at this sunrise
  ekadashi: boolean
  /**
   * When to end the Ekadashi fast (Parana), on the morning after the Ekadashi day. Set on the
   * Ekadashi day and on the day after it (the window lies on the day after); null otherwise.
   */
  parana: Interval | null
  /** Lunar month, 1 Chaitra … 12 Phalguna, at sunrise (SPEC 4.10). An adhika (leap) month carries the name of the month it precedes. */
  masa: { amanta: number; purnimanta: number; adhika: boolean }
  /** Sign (1 Aries/Mesha … 12 Pisces) of the Moon and the Sun: Vedic (sidereal, Lahiri) and Western (tropical). */
  signs: { vedic: SignSpans; western: SignSpans }
  /** Rising sign (Udaya Lagna, sidereal, 1 Mesha … 12 Meena) from sunrise to the next sunrise; the first starts before sunrise; empty above 66° latitude. */
  lagna: Span[]
  marks: DayMark[]
  /**
   * Jupiter or Venus combust (asta, M1) around this day: from its rise / set on the last day it is
   * seen to its rise / set on the first day it is seen again; null = before / after the days looked at.
   */
  combust: { body: 'jupiter' | 'venus'; start: Date | null; end: Date | null }[]
  /** Eclipses seen here from about 6 lunar months before this day to 4 days after it (E1). */
  eclipses: SeenEclipse[]
  newMoon: Date | null // instant inside this civil day
  fullMoon: Date | null
  rhythm: {
    restDay: 'fullMoon' | 'newMoon' | null // full moon: its civil day; new moon: its civil day and the day before
    ayana: Ayana
    ritu: number // 1 Vasanta … 6 Shishira
    rituDay: number // 1-based civil day within the current ritu
    rituLength: number // civil days in the current ritu
    events: { kind: 'ayana' | 'ritu'; at: Date }[] // changes inside this civil day
  }
  ayanamsha: number // degrees, Lahiri
}

/** One day of the month screen (SPEC 8): a calendar cell and its key dates. `tithi` is the one at sunrise. */
export type MonthDay = Pick<DayPanchang, 'date' | 'moon' | 'ekadashi' | 'newMoon' | 'fullMoon' | 'rhythm' | 'marks'> & { tithi: number }

/** Karana types by index 1-11 (names are keys into the content file). */
export const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
] as const
