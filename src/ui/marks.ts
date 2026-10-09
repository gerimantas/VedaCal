// Day marks (eclipses, Sankranti, Guru/Ravi Pushya, Amrit/Sarvartha Siddhi — SPEC 4.11) as
// text, shared by the month screen's key dates and the day screen's facts so both say the same
// thing.
import type { DayMark, Location } from '../core/types'
import type { Zodiac } from './day'
import { content, t, time } from './format'
import { icon } from './icons'
import type { Term } from './terms'

export type MarkText = {
  term: Term
  svg: string
  /** Colour class: favoured (green), warning (red), or '' (neutral). */
  cls: '' | 'favoured' | 'warning'
  label: string
  title: string
  sanskrit: string
  /** When it happens, local time: "13:33", or "21:43–07:28". */
  when: string
  /** Extra line, e.g. "visible here". */
  note: string
}

const TYPE = { penumbral: 'eclipsePenumbral', partial: 'eclipsePartial', annular: 'eclipseAnnular', total: 'eclipseTotal' } as const

export function markText(m: DayMark, loc: Location, zodiac: Zodiac): MarkText {
  if (m.kind === 'eclipse') {
    const moon = m.body === 'moon'
    return {
      term: 'eclipse',
      svg: icon.eclipse,
      cls: 'warning',
      label: t('labelEclipse'),
      title: t('eclipseTitle', { type: t(TYPE[m.type]), what: t(moon ? 'lunar' : 'solar') }),
      sanskrit: moon ? 'Chandra Grahan' : 'Surya Grahan',
      when: t('peakAt', { time: time(m.peak, loc) }),
      note: t(m.visible ? 'visibleHere' : 'notVisibleHere'),
    }
  }
  if (m.kind === 'sankranti') {
    const sign = content.rashi[String(m.sign) as '1']
    return {
      term: 'sankranti',
      svg: icon.vara,
      cls: '',
      label: t('labelSankranti'),
      // Sankranti is a Vedic (sidereal) event; with Western signs chosen, say so.
      title: t(zodiac === 'vedic' ? 'sunEnters' : 'sunEntersVedic', { sign: sign.title }),
      sanskrit: `${sign.name} Sankranti`,
      when: time(m.at, loc),
      note: '',
    }
  }
  if (m.kind === 'siddhi') {
    const amrit = m.yoga === 'amrit'
    return {
      term: amrit ? 'amritSiddhi' : 'sarvarthaSiddhi',
      svg: icon.nakshatra,
      cls: amrit ? 'favoured' : '',
      label: t(amrit ? 'labelFavoured' : 'labelAnyTask'),
      title: amrit ? t('legendFavoured') : t('labelAnyTask'),
      sanskrit: amrit ? 'Amrit Siddhi' : 'Sarvartha Siddhi',
      when: `${time(m.start, loc)}–${time(m.end, loc)}`,
      note: '',
    }
  }
  return {
    term: 'pushya',
    svg: icon.nakshatra,
    cls: 'favoured',
    label: t('labelFavoured'),
    title: t('legendFavoured'),
    sanskrit: m.weekday === 4 ? 'Guru Pushya' : 'Ravi Pushya',
    when: `${time(m.start, loc)}–${time(m.end, loc)}`,
    note: '',
  }
}

/**
 * The marks a screen shows: one favoured window per day, Pushya over Amrit Siddhi over Sarvartha
 * Siddhi — Guru Pushya is always also Amrit Siddhi, and Ravi Pushya also Sarvartha Siddhi.
 */
export function shownMarks(marks: DayMark[]): DayMark[] {
  const has = (yoga: 'amrit' | 'sarvartha') => marks.some((m) => m.kind === 'siddhi' && m.yoga === yoga)
  const top = marks.some((m) => m.kind === 'pushya') ? null : has('amrit') ? 'amrit' : 'sarvartha'
  return marks.filter((m) => m.kind !== 'siddhi' || m.yoga === top)
}

/** A favoured day for the month grid: Pushya or Amrit Siddhi (Sarvartha is too common to mark). */
export const isFavoured = (m: DayMark) => m.kind === 'pushya' || (m.kind === 'siddhi' && m.yoga === 'amrit')
