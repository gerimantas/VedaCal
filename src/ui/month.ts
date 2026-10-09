// Month screen (SPEC 5.2) as plain data, from computeMonth(). The app's Month.svelte and the
// P3 mockup both render it, like the day screen and ./day.ts.
import type { Location, MonthDay } from '../core/types'
import type { Zodiac } from './day'
import { LOCALE, MONTH, content, entry, t, time } from './format'
import { icon } from './icons'
import { isFavoured, markText, shownMarks } from './marks'

/** `favoured`: Guru/Ravi Pushya or Amrit Siddhi, named in `favouredBy`; `eclipse`: an eclipse peaks that day. */
export type Cell = { date: string; n: number; rest: boolean; today: boolean; ekadashi: boolean; favoured: boolean; favouredBy: string; eclipse: boolean; illumination: number; waxing: boolean; label: string }
export type KeyDate = { at: Date; date: string; svg: string; cls: string; title: string; sub: string; when: string }
export type MonthView = { title: string; lead: number; weekdays: string[]; cells: Cell[]; events: KeyDate[] }
/** One legend row; `swatch` is drawn exactly as the grid draws it; `note` says what it is for, `days` when. */
export type LegendItem = { swatch: 'rest' | 'ekadashi' | 'favoured' | 'eclipse'; label: string; sanskrit: string; note: string; days: string }

/** "10, 25–27": day numbers, a run of three or more unnamed days as a range. */
function dayList(cells: Cell[], name: (c: Cell) => string = () => ''): string {
  const out: string[] = []
  for (let i = 0; i < cells.length; ) {
    let j = i
    while (!name(cells[j]) && j + 1 < cells.length && cells[j + 1].n === cells[j].n + 1 && !name(cells[j + 1])) j++
    if (j - i >= 2) {
      out.push(`${cells[i].n}–${cells[j].n}`)
      i = j + 1
    } else {
      out.push([cells[i].n, name(cells[i])].filter(Boolean).join(' '))
      i++
    }
  }
  return out.join(', ')
}

/**
 * The month legend: only the marks this month's grid shows, each with what it is for and on
 * which days (user, 2026-10-09: an eclipse row with no eclipse in sight, and bare names like
 * "Favoured day", left the reader guessing; the moon shape and today need no key).
 */
export function legend(cells: Cell[]): LegendItem[] {
  const rows: [Omit<LegendItem, 'days'>, (c: Cell) => boolean, ((c: Cell) => string)?][] = [
    [{ swatch: 'rest', label: t('legendRest'), sanskrit: '', note: t('legendRestNote') }, (c) => c.rest],
    [{ swatch: 'ekadashi', label: t('legendEkadashi'), sanskrit: 'Ekadashi', note: t('legendEkadashiNote') }, (c) => c.ekadashi],
    [{ swatch: 'favoured', label: t('legendFavoured'), sanskrit: '', note: t('legendFavouredNote') }, (c) => c.favoured, (c) => c.favouredBy],
    [{ swatch: 'eclipse', label: t('legendEclipse'), sanskrit: 'Grahan', note: t('legendEclipseNote') }, (c) => c.eclipse],
  ]
  return rows.flatMap(([item, has, name]) => {
    const marked = cells.filter(has)
    return marked.length ? [{ ...item, days: dayList(marked, name) }] : []
  })
}

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

  const cells = days.map((d): Cell => {
    const favoured = shownMarks(d.marks).find(isFavoured)
    return {
      date: d.date,
      n: Number(d.date.slice(8)),
      rest: !!d.rhythm.restDay,
      today: d.date === today,
      ekadashi: d.ekadashi,
      favoured: !!favoured,
      favouredBy: favoured ? markText(favoured, loc, zodiac).sanskrit : '',
      eclipse: d.marks.some((m) => m.kind === 'eclipse'),
      illumination: d.moon.illumination,
      waxing: d.moon.waxing,
      label: [`${d.date}: ${entry('tithi', d.tithi).name}`, d.ekadashi && 'Ekadashi', d.rhythm.restDay && t('restDay'), ...shownMarks(d.marks).filter((m) => m.kind !== 'siddhi' || m.yoga === 'amrit').map((m) => markText(m, loc, zodiac).title)]
        .filter(Boolean)
        .join(', '),
    }
  })

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
  // Eclipses, Sankranti, Guru/Ravi Pushya and Amrit Siddhi (SPEC 4.11); Sarvartha Siddhi, about
  // ten days a month, stays on the day screen.
  for (const d of days)
    for (const m of shownMarks(d.marks)) {
      if (m.kind === 'siddhi' && m.yoga === 'sarvartha') continue
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
