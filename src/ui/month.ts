// Month screen (SPEC 5.2) as plain data, from computeMonth(). The app's Month.svelte and the
// P3 mockup both render it, like the day screen and ./day.ts.
import type { Location, MonthDay } from '../core/types'
import type { Zodiac } from './day'
import { LOCALE, MONTH, content, entry, t, time } from './format'
import { icon } from './icons'
import { isFavoured, markText, shownMarks } from './marks'

/** `favoured`: Guru/Ravi Pushya or Amrit Siddhi; `eclipse`: an eclipse peaks that day. */
export type Cell = { date: string; n: number; rest: boolean; today: boolean; ekadashi: boolean; favoured: boolean; eclipse: boolean; illumination: number; waxing: boolean; label: string }
/** A grid mark, drawn in a key date's row exactly as the grid draws it. */
export type Swatch = '' | 'rest' | 'ekadashi' | 'favoured' | 'eclipse'
/**
 * One key date. Rows of a grid mark carry its `swatch`, so the list doubles as the legend
 * (user, 2026-10-09: a separate legend repeated the list); the first row of each mark says what
 * it is for in `note`. `last`: the end date of a run of rest days.
 */
export type KeyDate = { at: Date; date: string; last: string; svg: string; cls: string; swatch: Swatch; title: string; sub: string; note: string; when: string }
export type MonthView = { title: string; lead: number; weekdays: string[]; cells: Cell[]; events: KeyDate[] }

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
    favoured: d.marks.some(isFavoured),
    eclipse: d.marks.some((m) => m.kind === 'eclipse'),
    illumination: d.moon.illumination,
    waxing: d.moon.waxing,
    label: [`${d.date}: ${entry('tithi', d.tithi).name}`, d.ekadashi && 'Ekadashi', d.rhythm.restDay && t('restDay'), ...shownMarks(d.marks).filter((m) => m.kind !== 'siddhi' || m.yoga === 'amrit').map((m) => markText(m, loc, zodiac).title)]
      .filter(Boolean)
      .join(', '),
  }))

  // Key dates: moon phases, rest days, Ekadashi, season and half-year changes — plain English
  // first, the same words as the grid's marks.
  const events: KeyDate[] = []
  const row = (e: Partial<KeyDate> & Pick<KeyDate, 'at' | 'date' | 'title'>) =>
    events.push({ last: '', svg: '', cls: '', swatch: '', sub: '', note: '', when: '', ...e })
  const noon = (date: string) => new Date(`${date}T12:00:00Z`)
  for (const [i, d] of days.entries()) {
    if (d.newMoon) row({ at: d.newMoon, date: d.date, svg: icon.newMoon, title: t('newMoon'), sub: 'Amavasya', when: time(d.newMoon, loc) })
    if (d.fullMoon) row({ at: d.fullMoon, date: d.date, svg: icon.fullMoon, title: t('fullMoon'), sub: 'Purnima', when: time(d.fullMoon, loc) })
    // Rest days come in runs around the new and full moon: one row per run.
    if (d.rhythm.restDay && !days[i - 1]?.rhythm.restDay) {
      let j = i
      while (days[j + 1]?.rhythm.restDay) j++
      row({ at: noon(d.date), date: d.date, last: j > i ? days[j].date : '', swatch: 'rest', title: t('legendRest') })
    }
    if (d.ekadashi) row({ at: noon(d.date), date: d.date, cls: 'ekadashi', swatch: 'ekadashi', title: t('legendEkadashi'), sub: 'Ekadashi' })
    for (const e of d.rhythm.events) {
      const next =
        e.kind === 'ritu'
          ? content.rhythm[`ritu${(d.rhythm.ritu % 6) + 1}` as 'ritu1']
          : content.rhythm[d.rhythm.ayana === 'uttarayana' ? 'dakshinayana' : 'uttarayana']
      row({ at: e.at, date: d.date, svg: icon.season, title: e.kind === 'ritu' ? t('begins', { title: next.title }) : next.title, sub: next.name, when: time(e.at, loc) })
    }
  }
  // Eclipses, Sankranti, Guru/Ravi Pushya and Amrit Siddhi (SPEC 4.11); Sarvartha Siddhi, about
  // ten days a month, stays on the day screen.
  for (const d of days)
    for (const m of shownMarks(d.marks)) {
      if (m.kind === 'siddhi' && m.yoga === 'sarvartha') continue
      const x = markText(m, loc, zodiac)
      const at = m.kind === 'eclipse' ? m.peak : m.kind === 'sankranti' ? m.at : m.start
      const swatch = m.kind === 'eclipse' ? 'eclipse' : isFavoured(m) ? 'favoured' : ''
      row({ at, date: d.date, svg: x.svg, cls: x.cls, swatch, title: x.note ? `${x.title}, ${x.note}` : x.title, sub: x.sanskrit, when: m.kind === 'eclipse' ? time(m.peak, loc) : x.when })
    }
  events.sort((a, b) => a.at.getTime() - b.at.getTime())
  // What a mark is for, said once: on its first row.
  const NOTE = { rest: 'legendRestNote', ekadashi: 'legendEkadashiNote', favoured: 'legendFavouredNote', eclipse: 'legendEclipseNote' } as const
  for (const swatch of Object.keys(NOTE) as (keyof typeof NOTE)[]) {
    const first = events.find((e) => e.swatch === swatch)
    if (first) first.note = t(NOTE[swatch])
  }
  return { title, lead, weekdays, cells, events }
}

/** "Oct 10 · 6:49 PM" for a key date; "Oct 25 – 27" for a run of rest days. */
export function keyDateWhen(e: KeyDate, loc: Location): string {
  const f = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: MONTH, timeZone: loc.tz })
  const day = e.last ? f.formatRange(e.at, new Date(`${e.last}T12:00:00Z`)) : f.format(e.at)
  return `${day}${e.when ? ` · ${e.when}` : ''}`
}
