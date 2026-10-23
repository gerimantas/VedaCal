// Day clock view model (PLAN-periods Q7, mockup mockups/research/d7-clock.html): what the clock
// draws and says, built from the engine's periods and segments (src/core/periods.ts).
import { daySegments, dayPeriods, dirCounts, type Birth, type Direction, type Level, type Period, type Segment, type Tier } from '../core/periods'
import type { DayPanchang, Interval } from '../core/types'
import { content, entry, LOCALE, MONTH, t, tradition, traditionSource } from './format'

/** What the clock colours a moment: the step of the verdict rule that decided (all 7 shades). */
export type Shade = Tier

export const shadeOf = (s: Pick<Segment, 'tier'>): Shade => s.tier

export const GROUP_LABELS = Array.from({ length: 10 }, (_, g) => t(`group${g}` as 'group0'))

const SHADE_WORD: Record<Shade, () => string> = {
  best: () => t('verdictBest'),
  goodBase: () => t('verdictGoodBase'),
  goodPlus: () => t('verdictGoodPlus'),
  neutral: () => t('verdictNeutral'),
  neutralPlus: () => t('verdictNeutralPlus'),
  fb: () => t('verdictFallback'),
  avoid: () => t('verdictAvoid'),
}
export const shadeWord = (s: Shade) => SHADE_WORD[s]()

/** CSS colour token for a shade or a period level. A level's colour mirrors the shade it leads to. */
const RAINBOW_SHADE: Record<Shade, string> = {
  best: '--rb-violet', goodBase: '--rb-indigo', goodPlus: '--rb-blue', neutral: '--rb-green', neutralPlus: '--rb-yellow', fb: '--rb-orange', avoid: '--rb-red',
}
// "neutral" and "fb" are both a shade and a level and read the same colour. The old level colours (blue strong, green good, yellow neutral) move one step to match the shades.
const RAINBOW_LEVEL: Record<Level, string> = {
  strong: '--rb-violet', plus: '--rb-blue', good: '--rb-indigo', neutral: '--rb-green', poor: '--rb-orange', fb: '--rb-orange', veto: '--rb-red',
}
export const colourVar = (k: Shade | Level): string => (RAINBOW_SHADE as Record<string, string>)[k] ?? (RAINBOW_LEVEL as Record<string, string>)[k]

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

/** The nine taras from the birth star ([KP] p. 166–167). */
const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Param Mitra']
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
    case 'durMuhurtam': return 'Dur Muhurtam'
    case 'varjyam': return 'Varjyam'
    case 'amritKalam': return 'Amrit Kalam'
    case 'abhijit': return 'Abhijit Muhurta'
    case 'brahma': return 'Brahma Muhurta'
    case 'noon': return t('periodNoon')
    case 'midnight': return t('periodMidnight')
    case 'tithiGandanta': return t('periodTithiJunction')
    case 'nakshatraGandanta': return t('periodStarJunction')
    case 'lagnaGandanta': return t('periodSignJunction')
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
    case 'month': return t(`periodMonth_${String(d.name)}` as 'periodMonth_adhika')
    case 'baana': return `${String(d.name)[0].toUpperCase()}${String(d.name).slice(1)} Baana`
    case 'panchaka': return 'Panchaka'
    case 'dishaShool': return t('periodDishaShool', { dir: t(`dir_${p.dir && 'only' in p.dir ? p.dir.only : 'east'}` as 'dir_east') })
    case 'dawn': return t('periodDawn')
    case 'godhuli': return 'Godhuli'
    case 'nishita': return 'Nishita'
    case 'anandadi': return t('periodAnandadi', { name: String(d.name) })
    case 'sankranti': return t('periodSankranti', { sign: (content.rashi as Record<string, { name: string }>)[String(d.sign)].name })
    case 'pushkara': return d.times === 3 ? 'Tri Pushkara' : 'Dwi Pushkara'
    case 'hora': return t('periodHora', { planet: t(`planet_${String(d.planet)}` as 'planet_sun') })
    case 'choghadiya': return `Choghadiya ${(content.choghadiya as Record<string, { name: string }>)[String(d.name)].name}`
    case 'tara': return t('periodTara', { name: TARA_NAMES[Number(d.tara) - 1] })
    case 'chandra': return t(Number(d.place) === 8 ? 'periodChandrashtama' : 'periodChandra', { n: Number(d.place) })
    case 'janma': return t(d.what === 'month' ? 'periodJanmaMonth' : 'periodJanmaTithi')
    case 'base':
      return t('periodBase', { vara: entry('vara', Number(d.vara)).name, tithi: tithiName(Number(d.tithi)), star: entry('nakshatra', Number(d.star)).name })
  }
}

/** What the sources say of a period and where (content `tradition`, `traditionSource`); '' where none is written. */
export function periodWhy(p: Period): { text: string; source: string } {
  const d = p.detail ?? {}
  const key = p.kind === 'sarvartha' ? 'sarvarthaSiddhi' : p.kind === 'month' || p.kind === 'baana' ? `${p.kind}_${String(d.name)}` : p.kind
  return { text: tradition(key), source: traditionSource(key) }
}

/** The readout's note on a period that never decides, or on a travel rule while no direction is chosen. */
export const periodNote = (p: Period, dir?: Direction | null) =>
  p.dir && !dir ? t('needsDirection') : p.decides ? '' : p.kind === 'gulika' ? t('disputedNote') : t('shownOnly')

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

/** Everything the clock draws for one group (and, with `birth`, for the user), or null when the day has no sunrise or sunset (polar). */
export function clockModel(day: DayPanchang, prev: DayPanchang, group: number, dir?: Direction | null, birth: Birth | null = null): ClockModel | null {
  if (!day.sunrise || !day.sunset || !day.nextSunrise) return null
  const { window, periods } = dayPeriods(day, prev, birth)
  return {
    window,
    segments: daySegments(day, prev, group, dir, birth),
    // with no direction chosen, travel rules are listed (marked) but do not colour the day
    periods: periods.filter((p) => p.groups.includes(group) && (!dir || dirCounts(p, dir))),
    sunrise: day.sunrise,
    noon: new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2),
    sunset: day.sunset,
  }
}

/** The rainbow scale, worst to best; a shade's index is its place on the legend bar. */
export const RAINBOW_ORDER: Shade[] = ['avoid', 'fb', 'neutralPlus', 'neutral', 'goodPlus', 'goodBase', 'best']

/** Segment edges blend over up to this long (the ring and the legend marker share it). */
export const FADE = 20 * 60_000

/**
 * Where the colour at moment `t` sits on the rainbow scale (0..6, fractional). A segment is its own shade's
 * index; within the fade of an edge it moves half-way towards the neighbour, so the position is continuous.
 */
export function scalePos(segs: Segment[], t: Date): number {
  const i = Math.max(0, segs.findIndex((s) => s.start <= t && t < s.end))
  const s = segs[i]
  if (!s) return 3
  const idx = (x: Segment) => RAINBOW_ORDER.indexOf(shadeOf(x))
  const fade = Math.min(FADE, (s.end.getTime() - s.start.getTime()) / 2)
  const dl = t.getTime() - s.start.getTime()
  const dr = s.end.getTime() - t.getTime()
  const own = idx(s)
  if (segs[i - 1] && dl < fade) return own + (idx(segs[i - 1]) - own) * 0.5 * (1 - dl / fade)
  if (segs[i + 1] && dr < fade) return own + (idx(segs[i + 1]) - own) * 0.5 * (1 - dr / fade)
  return own
}
