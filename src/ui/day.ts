// Day screen (SPEC 5.1) as plain data: every text and shape the screen shows, computed from
// one DayPanchang. The app's Day.svelte and the P3 mockup both render this, so the approved
// mockup and the app cannot drift apart, and tests can compare the screen with the engine.
import { civilDate, tzOffsetMinutes, zonedTimeToUtc } from '../core/time'
import type { DayPanchang, Interval, Location, Span } from '../core/types'
import { LOCALE, MONTH, content, entry, percent, progress, t, time, until } from './format'
import { icon } from './icons'
import { markText } from './marks'
import { terms, type Term } from './terms'

/** `next`: "then …" when the element changes before the Panchang day ends (next sunrise). */
export type Fact = { term: Term; icon: string; label: string; value: string; sanskrit: string; right: string; next: string }
export type Zodiac = 'vedic' | 'western'
export type WindowKind = 'calm' | 'good' | 'avoid'
/**
 * `overlap`: "12:43–1:03 PM falls in Rahu Kaal" when Abhijit and Rahu Kaal share time (every
 * Friday); `split`: that shared part as fractions [from, to] of the window, for its colour bar.
 */
export type WindowRow = {
  kind: WindowKind; term: Term; name: string; sanskrit: string; start: string; end: string; none: string
  overlap: string; split: [number, number] | null; active: boolean
}

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

  // Eclipses, Sankranti and Guru/Ravi Pushya on this day lead the facts (SPEC 4.11).
  const marks = day.marks.map((mk): Fact => {
    const x = markText(mk, loc, zodiac)
    // A favoured day's row is labelled "Favoured for beginnings"; its value is the window.
    if (mk.kind === 'pushya') return { term: x.term, icon: x.svg, label: x.label, value: x.when, sanskrit: x.sanskrit, right: '', next: '' }
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
  const { brahma, abhijit, rahuKaal } = day.windows
  const inside = (w: Interval | null) => !!w && clock >= w.start && clock < w.end
  const nowWindows = ([['avoid', rahuKaal], ['good', abhijit], ['calm', brahma]] as const).filter(([, w]) => inside(w)).map(([k]) => k as WindowKind)
  // On Fridays Rahu Kaal (the 4th eighth of the day) ends at solar noon, inside Abhijit (noon ±
  // a fifteenth of the day); on Wednesdays it starts there. Both are real — the overlap is said.
  const shared = abhijit && rahuKaal && abhijit.start < rahuKaal.end && rahuKaal.start < abhijit.end
    ? { start: abhijit.start > rahuKaal.start ? abhijit.start : rahuKaal.start, end: abhijit.end < rahuKaal.end ? abhijit.end : rahuKaal.end }
    : null

  const midday = day.sunrise && day.sunset ? new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2) : now
  const windowList = [
    { kind: 'calm', term: 'brahma', w: brahma, at: brahma?.start ?? now, none: t('none') },
    { kind: 'good', term: 'abhijit', w: abhijit, at: abhijit?.start ?? midday, none: day.vara === 3 ? t('notOnWednesdays') : t('none') },
    { kind: 'avoid', term: 'rahuKaal', w: rahuKaal, at: rahuKaal?.start ?? now, none: t('none') },
  ] as const
  // In time order — the rows are also the dial's colour key.
  const windows = [...windowList]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map(({ kind, term, w, none }): WindowRow => {
      const [name, sanskrit] = terms[term]
      const mine = shared && kind === 'good' && w ? shared : null
      const overlap = mine ? t('overlapsRahu', { range: `${time(mine.start, loc)}–${time(mine.end, loc)}` }) : ''
      const frac = (d: Date) => (d.getTime() - w!.start.getTime()) / (w!.end.getTime() - w!.start.getTime())
      const split: WindowRow['split'] = mine ? [frac(mine.start), frac(mine.end)] : null
      return { kind, term, name, sanskrit, start: w ? time(w.start, loc) : '', end: w ? time(w.end, loc) : '', none: w ? '' : none, overlap, split, active: nowWindows.includes(kind) }
    })

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
    dial: sunDial(day, loc, clock, next),
    nowWindows,
    next,
    windows,
    facts,
    moreFacts,
    tradition,
    polar: !day.sunrise || !day.sunset,
  }
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
// of the ring is the day. Calm and good windows run on a lane just outside the ring, avoid on
// one just inside, so windows that share time (Friday's Abhijit and Rahu Kaal) both show.
// The sun travels outside the ring, joined to it by a thin line at now.
function sunDial(day: DayPanchang, loc: Location, now: Date, next: DayView['next']): string {
  if (!day.sunrise || !day.sunset) return ''
  const { brahma, abhijit, rahuKaal } = day.windows
  // As wide as the sun's path, so the ring is as large as the card allows; a little taller, for
  // the sunrise/sunset labels in the bottom corners, below the ring and clear of the sun.
  const W = 240, H = 252, cx = W / 2, cy = 120, R = 82, LANE = 4, SUN = 109
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
  // Sized from the character count to fill a fixed width (markup is built before layout, so
  // text cannot be measured), capped so short times stay sane.
  // The widths keep both lines outside the sun's path (radius SUN + its 7 + a gap).
  const fit = (text: string, room: number, em: number, max: number) => Math.min(max, room / (text.length * em))
  const corner = (x: number, anchor: string, name: string, when: string) => {
    const n = fit(name, 44, 0.52, 11), w = fit(when, 56, 0.6, 15), bottom = H - 2
    return `<text class="rise-name" text-anchor="${anchor}" font-size="${f(n)}" x="${x}" y="${f(bottom - w - 2 - n / 2)}">${name}</text>` +
      `<text class="rise-time" text-anchor="${anchor}" font-size="${f(w)}" x="${x}" y="${f(bottom - w / 2)}">${when}</text>`
  }
  const [sx, sy] = at(now, SUN), [lx1, ly1] = at(now, SUN - 10), [lx2, ly2] = at(now, R + LANE + 5)
  const up = now >= day.sunrise && now < day.sunset
  const label = `${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}.${next ? ` ${next.label} ${next.in}` : ''}`
  return `<svg class="dial" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
    <defs><linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="${cx - R}" y1="0" x2="${cx + R}" y2="0"><stop offset="0" stop-color="var(--color-arc-a)"/><stop offset="1" stop-color="var(--color-arc-b)"/></linearGradient></defs>
    <circle class="ring-night" cx="${cx}" cy="${cy}" r="${R}"/>
    ${arc(day.sunrise, day.sunset, 'ring-day', 'stroke="url(#sky)"')}
    ${face}
    <path class="horizon" d="M ${f(rx - 18)} ${f(ry)} H ${f(rx - 4)} M ${f(setx + 4)} ${f(sety)} H ${f(setx + 18)}"/>
    ${corner(2, 'start', t('sunrise'), time(day.sunrise, loc))}${corner(W - 2, 'end', t('sunset'), time(day.sunset, loc))}
    ${seg(brahma, 'mark-calm', R + LANE)}${seg(abhijit, 'mark-good', R + LANE)}${seg(rahuKaal, 'mark-avoid', R - LANE)}
    <path class="sun-line${up ? '' : ' below'}" d="M ${f(lx1)} ${f(ly1)} L ${f(lx2)} ${f(ly2)}"/>
    <circle class="sun${up ? '' : ' below'}" cx="${f(sx)}" cy="${f(sy)}" r="7"/>
  </svg>`
}
