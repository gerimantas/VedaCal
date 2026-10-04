// Month screen (SPEC 5.2) as plain data, from computeMonth(). The app's Month.svelte and the
// P3 mockup both render it, like the day screen and ./day.ts.
import type { Location, MonthDay } from '../core/types'
import type { Zodiac } from './day'
import { LOCALE, MONTH, content, entry, t, time } from './format'
import { icon } from './icons'
import { markText } from './marks'

/** `favoured`: Guru/Ravi Pushya; `eclipse`: an eclipse peaks that day. */
export type Cell = { date: string; n: number; rest: boolean; today: boolean; ekadashi: boolean; favoured: boolean; eclipse: boolean; illumination: number; waxing: boolean; label: string }
export type KeyDate = { at: Date; date: string; svg: string; cls: string; title: string; sub: string; when: string }
/** One legend row; `swatch` is drawn exactly as the grid draws it. */
export type LegendItem = { swatch: 'moon' | 'rest' | 'today' | 'ekadashi' | 'favoured' | 'eclipse'; label: string; sanskrit: string }
export type MonthView = { title: string; lead: number; weekdays: string[]; cells: Cell[]; events: KeyDate[] }

/** The month legend, in the order a reader meets things: tiles first, then the dots. */
export const legend = (): LegendItem[] => [
  { swatch: 'moon', label: t('legendMoonShape'), sanskrit: '' },
  { swatch: 'today', label: t('legendToday'), sanskrit: '' },
  { swatch: 'rest', label: t('legendRest'), sanskrit: '' },
  { swatch: 'ekadashi', label: t('legendEkadashi'), sanskrit: 'Ekadashi' },
  { swatch: 'favoured', label: t('legendFavoured'), sanskrit: 'Pushya' },
  { swatch: 'eclipse', label: t('legendEclipse'), sanskrit: 'Grahan' },
]

/** "2026-10" ± n months. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthView(days: MonthDay[], loc: Location, today: string, zodiac: Zodiac = 'vedic'): MonthView {
  const [y, m] = days[0].date.split('-').map(Number)
  const title = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)))
  // Monday-first grid (ISO week, as in Lithuania); blanks before the first weekday.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + i))),
  )

  const cells = days.map((d): Cell => ({
    date: d.date,
    n: Number(d.date.slice(8)),
    rest: !!d.rhythm.restDay,
    today: d.date === today,
    ekadashi: d.ekadashi,
    favoured: d.marks.some((m) => m.kind === 'pushya'),
    eclipse: d.marks.some((m) => m.kind === 'eclipse'),
    illumination: d.moon.illumination,
    waxing: d.moon.waxing,
    label: [`${d.date}: ${entry('tithi', d.tithi).name}`, d.ekadashi && 'Ekadashi', d.rhythm.restDay && t('restDay'), ...d.marks.map((m) => markText(m, loc, zodiac).title)]
      .filter(Boolean)
      .join(', '),
  }))

  // Key dates: moon phases, Ekadashi, season and half-year changes — plain English first,
  // the same words as the legend.
  const events: KeyDate[] = []
  for (const d of days) {
    const noon = new Date(`${d.date}T12:00:00Z`)
    if (d.newMoon) events.push({ at: d.newMoon, date: d.date, svg: icon.newMoon, cls: '', title: t('newMoon'), sub: 'Amavasya', when: time(d.newMoon, loc) })
    if (d.fullMoon) events.push({ at: d.fullMoon, date: d.date, svg: icon.fullMoon, cls: '', title: t('fullMoon'), sub: 'Purnima', when: time(d.fullMoon, loc) })
    if (d.ekadashi) events.push({ at: noon, date: d.date, svg: icon.leaf, cls: 'ekadashi', title: t('legendEkadashi'), sub: 'Ekadashi', when: '' })
    for (const e of d.rhythm.events) {
      const next =
        e.kind === 'ritu'
          ? content.rhythm[`ritu${(d.rhythm.ritu % 6) + 1}` as 'ritu1']
          : content.rhythm[d.rhythm.ayana === 'uttarayana' ? 'dakshinayana' : 'uttarayana']
      events.push({ at: e.at, date: d.date, svg: icon.season, cls: '', title: e.kind === 'ritu' ? t('begins', { title: next.title }) : next.title, sub: next.name, when: time(e.at, loc) })
    }
  }
  // Eclipses, Sankranti and Guru/Ravi Pushya (SPEC 4.11).
  for (const d of days)
    for (const m of d.marks) {
      const x = markText(m, loc, zodiac)
      const at = m.kind === 'eclipse' ? m.peak : m.kind === 'sankranti' ? m.at : m.start
      const title = x.note ? `${x.title}, ${x.note}` : x.title
      events.push({ at, date: d.date, svg: x.svg, cls: x.cls, title, sub: x.sanskrit, when: m.kind === 'eclipse' ? time(m.peak, loc) : x.when })
    }
  events.sort((a, b) => a.at.getTime() - b.at.getTime())
  return { title, lead, weekdays, cells, events }
}

/** "Oct 10 · 6:49 PM" for a key date. */
export const keyDateWhen = (e: KeyDate, loc: Location) =>
  `${new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: MONTH, timeZone: loc.tz }).format(e.at)}${e.when ? ` · ${e.when}` : ''}`
