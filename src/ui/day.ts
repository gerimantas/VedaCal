// Day screen (SPEC 5.1) as plain data: every text and shape the screen shows, computed from
// one DayPanchang. The app's Day.svelte and the P3 mockup both render this, so the approved
// mockup and the app cannot drift apart, and tests can compare the screen with the engine.
import { civilDate, tzOffsetMinutes, zonedTimeToUtc } from '../core/time'
import { CHOGHADIYA_RATING, type DayPanchang, type Interval, type Location, type Span } from '../core/types'
import { LOCALE, MONTH, content, entry, percent, progress, t, time, until } from './format'
import { icon } from './icons'
import { markText, shownMarks } from './marks'
import { terms, type Term } from './terms'

/** `next`: "then …" when the element changes before the Panchang day ends (next sunrise). */
export type Fact = { term: Term; icon: string; label: string; value: string; sanskrit: string; right: string; next: string }
export type Zodiac = 'vedic' | 'western'
export type WindowKind = 'calm' | 'good' | 'avoid'
/**
 * `overlap`: on the good time's row when a time to avoid shares time with it — "Abhijit and
 * Gulika cancel each other out" and its range, shown as a second line with the range under the
 * row's own time; both rows then show only their own part (user, 2026-10-06).
 */
export type WindowRow = {
  /** `favoured`: a Pushya or Siddhi window (SPEC 4.11) — a time-list row, not drawn on the dial. */
  kind: WindowKind | 'favoured'; term: Term; name: string; sanskrit: string; start: string; end: string; none: string
  overlap: { text: string; start: string; end: string } | null; active: boolean
}

/**
 * One Choghadiya part as a row: "Gain · Labh  11:42 AM–1:06 PM", `current` while it runs.
 * `part`: 'before' = last night's parts still to run before this sunrise (shown only then).
 */
export type ChoghadiyaRow = { name: string; sanskrit: string; start: string; end: string; rating: 'good' | 'neutral' | 'avoid'; part: 'before' | 'day' | 'night'; current: boolean }

/** "Moon in Cancer · Karka", with "until …" and "then …" — shown on the moon card and the sun card. */
export type SignLine = { text: string; sanskrit: string; until: string; next: string }

export type DayView = {
  shortDate: string
  moon: { illumination: number; waxing: boolean; label: string }
  tithi: { index: number; title: string; name: string; percent: number; progress: number; ends: string; meaning: string }
  moonSign: SignLine
  sunSign: SignLine
  sunrise: string
  sunset: string
  /** 24-hour sun dial as SVG markup; '' when the Sun does not rise or set (polar day/night). */
  dial: string
  /** Windows in force now — two when Abhijit and Rahu Kaal overlap; both are shown, avoid first. */
  nowWindows: WindowKind[]
  next: { label: string; in: string } | null
  windows: WindowRow[]
  /**
   * The 16 Choghadiya parts, sunrise to next sunrise — before sunrise led by what is left of
   * last night; `choghadiyaNow` is the one at the dial's time.
   */
  choghadiya: ChoghadiyaRow[]
  choghadiyaNow: ChoghadiyaRow | null
  facts: Fact[]
  moreFacts: Fact[]
  tradition: { title: string; meaning: string } | null
  polar: boolean
}

const NOW_LABEL = { good: 'nowGood', avoid: 'nowAvoid', calm: 'nowCalm' } as const
const SHORT = { good: 'windowGood', avoid: 'windowAvoid', calm: 'windowCalm' } as const
const nowLabel = (k: WindowKind) => t(NOW_LABEL[k])
/** Centre of the dial: "Now: good time", or "Now: Avoid + Good" while two windows overlap. */
export const nowHtml = (ks: WindowKind[]) =>
  ks.length === 1
    ? `<span class="dial-now ${ks[0]}">${nowLabel(ks[0])}</span>`
    : ks.length
      ? `<span class="dial-now">${t('now')}: ${ks.map((k) => `<span class="${k}">${t(SHORT[k])}</span>`).join(' + ')}</span>`
      : ''

/**
 * The device's clock time on the day shown, for the sun dial: now for today, otherwise the same
 * wall-clock time on that date in the location's zone (user, 2026-10-05 — the sun had sat at
 * sunrise on every other day).
 */
export function clockOn(day: DayPanchang, loc: Location, now: Date): Date {
  if (civilDate(loc.tz, now) === day.date) return now
  const wall = new Date(now.getTime() + tzOffsetMinutes(loc.tz, now) * 60_000)
  const [y, mo, d] = day.date.split('-').map(Number)
  return zonedTimeToUtc(loc.tz, y, mo, d, wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds())
}

/** The moment the screen describes: now for today, otherwise that day's sunrise. */
export function momentFor(day: DayPanchang, loc: Location, now: Date): Date {
  if (civilDate(loc.tz, now) === day.date) return now
  return day.sunrise ?? new Date(`${day.date}T12:00:00Z`)
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60), m = total % 60
  return h ? t('hoursMinutes', { h, m }) : t('minutes', { m })
}

/**
 * The span of an element in force at `at`: the screen is live, so once the Moon's star (or
 * any element) changes during the day, the new one shows. Before the first span starts —
 * early morning, before sunrise — the day's first span stands.
 */
export const activeAt = (spans: Span[], at: Date): Span => spans.find((s) => at >= s.start && at < s.end) ?? spans[0]

/** The span after `s`, if it begins before the Panchang day ends. */
const following = (spans: Span[], s: Span, day: DayPanchang) => {
  const n = spans[spans.indexOf(s) + 1]
  return n && (!day.nextSunrise || n.start < day.nextSunrise) ? n : undefined
}

/** `clock`: where the sun dial stands — its sun, "Now: …" and "Sunset in …" (see clockOn). */
export function dayView(day: DayPanchang, loc: Location, now: Date, zodiac: Zodiac = 'vedic', clock: Date = now): DayView {
  const noonish = day.sunrise ?? new Date(`${day.date}T12:00:00Z`)
  const shortDate = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: MONTH, timeZone: loc.tz }).format(noonish)

  const tithi = activeAt(day.tithi, now)
  const te = entry('tithi', tithi.index)
  const nextTithi = following(day.tithi, tithi, day)
  const state = t(day.moon.waxing ? 'stateWaxing' : 'stateWaning')

  // ── Day facts: one row each, plain English first, Sanskrit name beneath ─────────
  // The lunar day is not repeated here — the hero above already shows it.
  const ends = (end: Date) => until(end, day, loc)
  const fact = (term: Term, svg: string, label: string, value: string, sanskrit: string, right = '', next = ''): Fact =>
    ({ term, icon: svg, label, value, sanskrit, right, next })
  /** A row for a changing element: the span in force now, its end, and what follows it. */
  const element = (term: Term, svg: string, label: string, spans: Span[], name: (i: number) => { title: string; name: string }) => {
    const s = activeAt(spans, now)
    const n = following(spans, s, day)
    return fact(term, svg, label, name(s.index).title, name(s.index).name, ends(s.end), n ? t('then', { name: name(n.index).title }) : '')
  }
  const r = day.rhythm
  const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
  const vara = entry('vara', day.vara)
  const m = day.masa
  const month = content.masa[String(m.purnimanta) as '1']
  // Signs sit with their body — the Moon's on the moon card, the Sun's on the sun card. The
  // English name is already a plain word; the Sanskrit one (or "Western sign") follows it.
  const signs = day.signs[zodiac]
  const signLine = (spans: Span[], key: 'moonIn' | 'sunIn'): SignLine => {
    const s = activeAt(spans, now)
    const n = following(spans, s, day)
    const e = content.rashi[String(s.index) as '1']
    return {
      text: t(key, { sign: e.title }),
      sanskrit: zodiac === 'vedic' ? e.name : t('westernZodiac'),
      until: ends(s.end),
      next: n ? t('then', { name: content.rashi[String(n.index) as '1'].title }) : '',
    }
  }

  // Eclipses and Sankranti on this day lead the facts (SPEC 4.11). Pushya and Siddhi are time
  // windows: they sit in the time list below (user, 2026-10-09: looked for there, not found).
  const marks = day.marks
    .filter((mk) => mk.kind === 'eclipse' || mk.kind === 'sankranti')
    .map((mk): Fact => {
      const x = markText(mk, loc, zodiac)
      return { term: x.term, icon: x.svg, label: x.label, value: x.title, sanskrit: x.sanskrit, right: x.when, next: x.note }
    })
  const facts = [
    ...marks,
    ...(day.parana ? [paranaFact(day, loc)] : []),
    fact('vara', icon.vara, t('labelWeekday'), vara.title, vara.name),
    fact('masa', icon.month, t('labelMonth'), m.adhika ? t('extraMonth') : month.title, m.adhika ? t('adhika', { name: month.name }) : month.name),
    element('nakshatra', icon.nakshatra, t('labelStar'), day.nakshatra, (i) => entry('nakshatra', i)),
    fact('rhythm', icon.leaf, t('legendSeason'), ritu.title, ritu.name, t('seasonDay', { day: r.rituDay, length: r.rituLength })),
  ]
  // Yoga and karana are poetic names with little everyday meaning for a Western reader, so
  // they sit behind "More details".
  const moreFacts = [
    element('yoga', icon.yoga, t('labelYoga'), day.yoga, (i) => entry('yoga', i)),
    element('karana', icon.karana, t('labelKarana'), day.karana, (i) => entry('karana', i)),
  ]

  // ── Calm / good / avoid windows ─────────────────────────────────────────────
  const inside = (w: Interval | null) => !!w && clock >= w.start && clock < w.end
  const shown = shownWindows(day)
  const { brahma, abhijit, clash } = shown
  const avoids = [['rahuKaal', shown.rahuKaal], ['yamaganda', shown.yamaganda], ['gulika', shown.gulika]] as const
  // Inside the cancelled part neither window is in force, so the dial's centre says nothing.
  const nowWindows = ([['avoid', avoids.some(([, w]) => inside(w))], ['good', inside(abhijit)], ['calm', inside(brahma)]] as const)
    .filter(([, on]) => on)
    .map(([k]) => k as WindowKind)

  const midday = day.sunrise && day.sunset ? new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2) : now
  const windowList = [
    { kind: 'calm', term: 'brahma', w: brahma, at: brahma?.start ?? now, none: t('none') },
    { kind: 'good', term: 'abhijit', w: abhijit, at: abhijit?.start ?? midday, none: day.vara === 3 ? t('notOnWednesdays') : t('none') },
    ...avoids.map(([term, w]) => ({ kind: 'avoid', term, w, at: w?.start ?? now, none: t('none') }) as const),
  ] as const
  // The day's favoured window (Pushya over Amrit over Sarvartha Siddhi), named by its tradition.
  const favoured = shownMarks(day.marks).flatMap((mk) => (mk.kind === 'pushya' || mk.kind === 'siddhi' ? [mk] : []))
  const favouredRows = favoured.map((mk) => {
    const x = markText(mk, loc, zodiac)
    return { kind: 'favoured', term: x.term, w: { start: mk.start, end: mk.end }, at: mk.start, none: '', name: x.label, sanskrit: x.sanskrit } as const
  })
  // In time order — the calm, good and avoid rows are also the dial's colour key.
  const windows = [...windowList, ...favouredRows]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((row): WindowRow => {
      const { kind, term, w, none } = row
      const [name, sanskrit] = 'name' in row ? [row.name, row.sanskrit] : terms[term]
      const overlap = clash && kind === 'good' ? { text: t('cancelOut', { name: terms[clash.term][1] }), start: time(clash.start, loc), end: time(clash.end, loc) } : null
      return { kind, term, name, sanskrit, start: w ? time(w.start, loc) : '', end: w ? time(w.end, loc) : '', none: w ? '' : none, overlap, active: inside(w) }
    })

  // ── Choghadiya: hour by hour, folded under the windows ──────────────────────
  // Between midnight and sunrise last night's parts are still running: the ones left lead the list.
  const before = day.sunrise && clock < day.sunrise ? day.choghadiyaBefore.filter((p) => p.end > clock) : []
  const choghadiya = [...before.map((p) => ({ p, part: 'before' as const })), ...day.choghadiya.map((p) => ({ p, part: p.night ? ('night' as const) : ('day' as const) }))].map(
    ({ p, part }): ChoghadiyaRow => {
      const e = content.choghadiya[p.name]
      return { name: e.title, sanskrit: e.name, start: time(p.start, loc), end: time(p.end, loc), rating: CHOGHADIYA_RATING[p.name], part, current: inside(p) }
    },
  )

  // ── What comes next: "Sunset in 4 h 48 min" ────────────────────────────────
  let next: DayView['next'] = null
  if (day.sunrise && day.sunset) {
    const [label, at] =
      clock < day.sunrise
        ? (['sunriseInLabel', day.sunrise] as const)
        : clock < day.sunset
          ? (['sunsetInLabel', day.sunset] as const)
          : (['sunriseInLabel', day.nextSunrise] as const)
    if (at) next = { label: t(label), in: duration(at.getTime() - clock.getTime()) }
  }

  // ── Tradition card: only on special days — the season row covers ordinary ones ──
  let tradition: DayView['tradition'] = null
  if (r.events.some((e) => e.kind === 'ritu')) tradition = { title: t('season', { title: ritu.title, name: ritu.name }), meaning: ritu.meaning }
  if (r.events.some((e) => e.kind === 'ayana')) tradition = content.rhythm[r.ayana]
  if (r.restDay) tradition = content.rhythm[r.restDay === 'fullMoon' ? 'restFullMoon' : 'restNewMoon']
  // Ekadashi gets the card only when the moon card does not already say it (tithi 11 or 26).
  if (day.ekadashi && !(tithi.index === 11 || tithi.index === 26)) tradition = content.rhythm.ekadashi
  if (tradition) tradition = { title: tradition.title, meaning: tradition.meaning }

  return {
    shortDate,
    moon: { illumination: day.moon.illumination, waxing: day.moon.waxing, label: t('lit', { state, percent: percent(day.moon.illumination) }) },
    tithi: {
      index: tithi.index,
      title: te.title,
      name: te.name,
      percent: percent(day.moon.illumination),
      progress: progress(tithi, now),
      // The bar under the moon is unlabeled on its own, so one short line says what it measures.
      ends:
        // "Ends at 1:24 AM tomorrow": the "until" wording minus its own "until".
        t('lunarDayEnds', { when: until(tithi.end, day, loc).replace(t('until', { time: '' }), '') }) +
        (nextTithi ? `, ${t('then', { name: entry('tithi', nextTithi.index).title })}` : ''),
      meaning: te.meaning,
    },
    moonSign: signLine(signs.moon, 'moonIn'),
    sunSign: signLine(signs.sun, 'sunIn'),
    sunrise: time(day.sunrise, loc),
    sunset: time(day.sunset, loc),
    dial: sunDial(day, loc, clock, next, shown),
    nowWindows,
    next,
    windows,
    choghadiya,
    choghadiyaNow: choghadiya.find((c) => c.current) ?? null,
    facts,
    moreFacts,
    tradition,
    polar: !day.sunrise || !day.sunset,
  }
}

type Shown = Record<'brahma' | 'abhijit' | 'rahuKaal' | 'yamaganda' | 'gulika', Interval | null> & {
  clash: (Interval & { term: 'rahuKaal' | 'yamaganda' | 'gulika' }) | null
}

/**
 * The windows as the screen shows them. The good time sits at solar noon, and on most weekdays
 * one time to avoid starts or ends inside it (Rahu Kaal on Fridays, Yamaganda on Sundays and
 * Mondays, Gulika on Tuesdays). The shared part counts as neither: the two cancel out (user,
 * 2026-10-06), so both rows, their dial arcs and "Now" leave it out. It always lies at one end
 * of each window, so what is left of each is one interval.
 */
export function shownWindows(day: DayPanchang): Shown {
  const { brahma, abhijit, rahuKaal, yamaganda, gulika } = day.windows
  const shown: Shown = { brahma, abhijit, rahuKaal, yamaganda, gulika, clash: null }
  if (!abhijit) return shown
  for (const term of ['rahuKaal', 'yamaganda', 'gulika'] as const) {
    const w = day.windows[term]
    if (!w || !(abhijit.start < w.end && w.start < abhijit.end)) continue
    const clash = { term, start: abhijit.start > w.start ? abhijit.start : w.start, end: abhijit.end < w.end ? abhijit.end : w.end }
    const without = (x: Interval): Interval | null => {
      const left = x.start < clash.start ? { start: x.start, end: clash.start } : { start: clash.end, end: x.end }
      return left.start < left.end ? left : null
    }
    return { ...shown, abhijit: without(abhijit), [term]: without(w), clash }
  }
  return shown
}

/** "Tomorrow, 7:32–9:46 AM" on the Ekadashi day, "Today, …" on the day after. */
function paranaFact(day: DayPanchang, loc: Location): Fact {
  const p = day.parana!
  const sameDay = civilDate(loc.tz, p.start) === civilDate(loc.tz, p.end)
  const range = sameDay ? `${time(p.start, loc)}–${time(p.end, loc)}` : t('paranaAfter', { time: time(p.start, loc) })
  const value = t(civilDate(loc.tz, p.start) === day.date ? 'paranaToday' : 'paranaTomorrow', { range })
  return { term: 'parana', icon: icon.dawn, label: t('labelParana'), value, sanskrit: 'Parana', right: '', next: '' }
}

// A 24-hour clock face, live like the moon: solar noon at the top, solar midnight at the
// bottom, morning on the left, evening on the right; the hour numbers sit at their clock
// times, so "12" is off the top by the gap between clock noon and solar noon. The light part
// of the ring is the day. Calm and good windows run on a lane just outside the ring, the three
// times to avoid on one just inside; where the good time and one to avoid cancel out the ring
// has neither.
// By day the sun travels outside the ring, joined to it by a thin line at now; at night it is
// not drawn (the centre says "Sunrise in …"), so no room is kept for it below the ring.
function sunDial(day: DayPanchang, loc: Location, now: Date, next: DayView['next'], shown: Shown): string {
  if (!day.sunrise || !day.sunset) return ''
  const { brahma, abhijit, rahuKaal, yamaganda, gulika } = shown
  // As wide as the sun's path, so the ring is as large as the card allows; it ends just below
  // the ring, where the sunrise/sunset labels stand in the corners, level with the ring's bottom.
  const W = 240, cx = W / 2, cy = 120, R = 82, LANE = 4, SUN = 109, H = cy + R + LANE + 6
  const noon = (day.sunrise.getTime() + day.sunset.getTime()) / 2
  const f = (n: number) => n.toFixed(1)
  const at = (d: Date, r = R) => {
    const a = ((d.getTime() - noon) / 86_400_000) * 2 * Math.PI
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const
  }
  const arc = (from: Date, to: Date, cls: string, extra = '', r = R) => {
    const [x1, y1] = at(from, r), [x2, y2] = at(to, r)
    const large = to.getTime() - from.getTime() > 43_200_000 ? 1 : 0
    return `<path class="${cls}" ${extra} d="M ${f(x1)} ${f(y1)} A ${r} ${r} 0 ${large} 1 ${f(x2)} ${f(y2)}"/>`
  }
  const seg = (w: Interval | null, cls: string, r: number) => (w ? arc(w.start, w.end, cls, '', r) : '')
  // Clock face inside the ring: a tick every hour, longer with a number every three hours.
  const [y, mo, d] = day.date.split('-').map(Number)
  const face = Array.from({ length: 24 }, (_, h) => {
    const t = zonedTimeToUtc(loc.tz, y, mo, d, h, 0)
    const major = h % 3 === 0
    const [x1, y1] = at(t, R - 9), [x2, y2] = at(t, R - (major ? 15 : 12))
    const [nx, ny] = at(t, R - 24)
    return `<path class="tick${major ? ' major' : ''}" d="M ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)}"/>` +
      (major ? `<text class="hour" x="${f(nx)}" y="${f(ny)}">${h}</text>` : '')
  }).join('')
  // The horizon: short ticks just outside the ring where the sun rises and sets. Their names
  // and times stand in the bottom corners, level with the ring's bottom, clear of the sun's path.
  const [rx, ry] = at(day.sunrise), [setx, sety] = at(day.sunset)
  // The same sizes as the dial's centre text (4 and 5.6 cqi of 240 units): name like
  // "Sunset in", time like "6 h 29 min".
  const NAME = 9.6, TIME = 13.4
  const corner = (x: number, anchor: string, name: string, when: string) =>
    `<text class="rise-name" text-anchor="${anchor}" font-size="${NAME}" x="${x}" y="${f(H - TIME - 2 - NAME / 2)}">${name}</text>` +
    `<text class="rise-time" text-anchor="${anchor}" font-size="${TIME}" x="${x}" y="${f(H - TIME / 2)}">${when}</text>`
  // Low on the dial (summer mornings and evenings) the sun's path crosses the labels' row; there
  // the sun rides on the ring itself, without its line, until it has climbed clear.
  const labelTop = H - TIME - NAME - 6
  const low = at(now, SUN)[1] + 9 > labelTop
  const [sx, sy] = at(now, low ? R : SUN), [lx1, ly1] = at(now, SUN - 10), [lx2, ly2] = at(now, R + LANE + 5)
  const up = now >= day.sunrise && now < day.sunset
  const label = `${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}.${next ? ` ${next.label} ${next.in}` : ''}`
  return `<svg class="dial" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
    <defs><linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="${cx - R}" y1="0" x2="${cx + R}" y2="0"><stop offset="0" stop-color="var(--color-arc-a)"/><stop offset="1" stop-color="var(--color-arc-b)"/></linearGradient></defs>
    <circle class="ring-night" cx="${cx}" cy="${cy}" r="${R}"/>
    ${arc(day.sunrise, day.sunset, 'ring-day', 'stroke="url(#sky)"')}
    ${face}
    <path class="horizon" d="M ${f(rx - 18)} ${f(ry)} H ${f(rx - 4)} M ${f(setx + 4)} ${f(sety)} H ${f(setx + 18)}"/>
    ${corner(2, 'start', t('sunrise'), time(day.sunrise, loc))}${corner(W - 2, 'end', t('sunset'), time(day.sunset, loc))}
    ${seg(brahma, 'mark-calm', R + LANE)}${seg(abhijit, 'mark-good', R + LANE)}${[rahuKaal, yamaganda, gulika].map((w) => seg(w, 'mark-avoid', R - LANE)).join('')}
    ${up && !low ? `<path class="sun-line" d="M ${f(lx1)} ${f(ly1)} L ${f(lx2)} ${f(ly2)}"/>` : ''}${up ? `<circle class="sun" cx="${f(sx)}" cy="${f(sy)}" r="7"/>` : ''}
  </svg>`
}
