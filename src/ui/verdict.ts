// Day clock view model (PLAN-periods Q7, mockup mockups/research/d7-clock.html): what the clock
// draws and says, built from the engine's periods and segments (src/core/periods.ts).
import { daySegments, dayPeriods, type Level, type Period, type Segment, type Verdict } from '../core/periods'
import type { DayPanchang, Interval } from '../core/types'
import { content, entry, LOCALE, MONTH, t } from './format'
import type { Palette } from './state.svelte'

/** What the clock colours a moment: the verdict, with "good by a strong +" apart for the rainbow palette. */
export type Shade = Verdict | 'best'

export const shadeOf = (s: Pick<Segment, 'verdict' | 'strong'>): Shade => (s.verdict === 'good' && s.strong ? 'best' : s.verdict)

export const GROUP_LABELS = Array.from({ length: 10 }, (_, g) => t(`group${g}` as 'group0'))

const SHADE_WORD: Record<Shade, () => string> = {
  best: () => t('verdictBest'),
  good: () => t('verdictGood'),
  neutral: () => t('verdictNeutral'),
  fb: () => t('verdictFallback'),
  avoid: () => t('verdictAvoid'),
}
/** "Best" exists only in the rainbow palette; elsewhere it is plain "Good". */
export const shadeWord = (s: Shade, palette: Palette) => SHADE_WORD[s === 'best' && palette !== 'rainbow' ? 'good' : s]()

/** CSS colour token for a shade or a period level, per palette. */
const CURRENT: Record<Shade | Level, string> = {
  best: '--color-good', good: '--color-good', strong: '--color-good', plus: '--color-good',
  neutral: '--color-neutral', poor: '--color-fallback', fb: '--color-fallback', avoid: '--color-avoid', veto: '--color-avoid',
}
const RAINBOW: Record<Shade | Level, string> = {
  best: '--rb-blue', strong: '--rb-blue', good: '--rb-green', plus: '--rb-green',
  neutral: '--rb-yellow', poor: '--rb-orange', fb: '--rb-orange', avoid: '--rb-red', veto: '--rb-red',
}
export const colourVar = (k: Shade | Level, palette: Palette) => (palette === 'rainbow' ? RAINBOW : CURRENT)[k]

/** Legend order, best first. */
export const legendShades = (palette: Palette): Shade[] => (palette === 'rainbow' ? ['best', 'good', 'neutral', 'fb', 'avoid'] : ['good', 'neutral', 'fb', 'avoid'])

const LEVEL_WORD: Record<Level, () => string> = {
  veto: () => t('levelVeto'),
  fb: () => t('levelFallback'),
  strong: () => t('levelStrong'),
  plus: () => t('levelPlus'),
  good: () => t('levelGood'),
  neutral: () => t('levelNeutral'),
  poor: () => t('levelPoor'),
}
export const levelWord = (p: Period) => LEVEL_WORD[p.level]()

const tithiName = (i: number) => entry('tithi', i).name
const yogaName = (i: number) => entry('yoga', i).name
const dayName = (date: unknown) => new Intl.DateTimeFormat(LOCALE, { month: MONTH, day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))

/** The name a period goes by in the readout. Sanskrit names stay as they are in both languages. */
export function periodName(p: Period): string {
  const d = p.detail ?? {}
  switch (p.kind) {
    case 'rahuKaal': return 'Rahu Kaal'
    case 'yamaganda': return 'Yamaganda'
    case 'gulika': return 'Gulika'
    case 'abhijit': return 'Abhijit Muhurta'
    case 'brahma': return 'Brahma Muhurta'
    case 'noon': return t('periodNoon')
    case 'midnight': return t('periodMidnight')
    case 'tithiGandanta': return t('periodTithiJunction')
    case 'nakshatraGandanta': return t('periodStarJunction')
    case 'pakshaRandhra': return t('periodFirstHours', { name: tithiName(Number(d.tithi)) })
    case 'yogaPart': return t('periodYogaStart', { name: yogaName(Number(d.yoga)) })
    case 'vyatipata': return 'Vyatipata'
    case 'vaidhriti': return 'Vaidhriti'
    case 'bhadraMouth': return t('periodBhadraMouth')
    case 'bhadra': return 'Bhadra'
    case 'bhadraTail': return t('periodBhadraTail')
    case 'sarvartha': return 'Sarvartha Siddhi'
    case 'amritSiddhi': return 'Amrit Siddhi'
    case 'ravi': return 'Ravi yoga'
    case 'eclipse': return t('periodEclipse')
    case 'eclipseDays': return t('periodEclipseDays', { date: dayName(d.day) })
    case 'eclipseStar': return t('periodEclipseStar', { star: entry('nakshatra', Number(d.star)).name, date: dayName(d.day) })
    case 'choghadiya': return `Choghadiya ${(content.choghadiya as Record<string, { name: string }>)[String(d.name)].name}`
    case 'base':
      return t('periodBase', { vara: entry('vara', Number(d.vara)).name, tithi: tithiName(Number(d.tithi)), star: entry('nakshatra', Number(d.star)).name })
  }
}

/** The readout's note on a period that never decides. */
export const periodNote = (p: Period) => (p.decides ? '' : p.kind === 'gulika' ? t('disputedNote') : t('shownOnly'))

/** Which thin ring a period is drawn on (outside in), or none. */
export function ringOf(p: Period): 0 | 1 | 2 | null {
  if (p.kind === 'base') return 1
  if (p.kind === 'choghadiya') return 2
  return 0
}

export type ClockModel = {
  window: Interval
  segments: Segment[]
  periods: Period[]
  sunrise: Date
  noon: Date
  sunset: Date
}

/** Everything the clock draws for one group, or null when the day has no sunrise or sunset (polar). */
export function clockModel(day: DayPanchang, prev: DayPanchang, group: number): ClockModel | null {
  if (!day.sunrise || !day.sunset || !day.nextSunrise) return null
  const { window, periods } = dayPeriods(day, prev)
  return {
    window,
    segments: daySegments(day, prev, group),
    periods: periods.filter((p) => p.groups.includes(group)),
    sunrise: day.sunrise,
    noon: new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2),
    sunset: day.sunset,
  }
}
