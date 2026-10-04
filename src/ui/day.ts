// Day screen (SPEC 5.1) as plain data: every text and shape the screen shows, computed from
// one DayPanchang. The app's Day.svelte and the P3 mockup both render this, so the approved
// mockup and the app cannot drift apart, and tests can compare the screen with the engine.
import { civilDate } from '../core/time'
import type { DayPanchang, Interval, Location, Span } from '../core/types'
import { LOCALE, content, entry, percent, progress, t, time, until } from './format'
import { icon } from './icons'
import { markText } from './marks'
import { terms, type Term } from './terms'

/** `next`: "then …" when the element changes before the Panchang day ends (next sunrise). */
export type Fact = { term: Term; icon: string; label: string; value: string; sanskrit: string; right: string; next: string }
export type Zodiac = 'vedic' | 'western'
export type WindowKind = 'calm' | 'good' | 'avoid'
export type WindowRow = { kind: WindowKind; term: Term; name: string; sanskrit: string; start: string; end: string; none: string; active: boolean }

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
  nowWindow: WindowKind | null
  next: { label: string; in: string } | null
  windows: WindowRow[]
  facts: Fact[]
  moreFacts: Fact[]
  tradition: { title: string; meaning: string } | null
  polar: boolean
}

const NOW_LABEL = { good: 'nowGood', avoid: 'nowAvoid', calm: 'nowCalm' } as const
export const nowLabel = (k: WindowKind) => t(NOW_LABEL[k])

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

export function dayView(day: DayPanchang, loc: Location, now: Date, zodiac: Zodiac = 'vedic'): DayView {
  const noonish = day.sunrise ?? new Date(`${day.date}T12:00:00Z`)
  const shortDate = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: loc.tz }).format(noonish)

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
  const inside = (w: Interval | null) => !!w && now >= w.start && now < w.end
  const nowWindow: WindowKind | null = inside(abhijit) ? 'good' : inside(rahuKaal) ? 'avoid' : inside(brahma) ? 'calm' : null

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
      return { kind, term, name, sanskrit, start: w ? time(w.start, loc) : '', end: w ? time(w.end, loc) : '', none: w ? '' : none, active: kind === nowWindow }
    })

  // ── What comes next: "Sunset in 4 h 48 min" ────────────────────────────────
  let next: DayView['next'] = null
  if (day.sunrise && day.sunset) {
    const [label, at] =
      now < day.sunrise
        ? (['sunriseInLabel', day.sunrise] as const)
        : now < day.sunset
          ? (['sunsetInLabel', day.sunset] as const)
          : (['sunriseInLabel', day.nextSunrise] as const)
    if (at) next = { label: t(label), in: duration(at.getTime() - now.getTime()) }
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
        t('lunarDayEnds', { when: until(tithi.end, day, loc).replace(/^until /, '') }) +
        (nextTithi ? `, ${t('then', { name: entry('tithi', nextTithi.index).title })}` : ''),
      meaning: te.meaning,
    },
    moonSign: signLine(signs.moon, 'moonIn'),
    sunSign: signLine(signs.sun, 'sunIn'),
    sunrise: time(day.sunrise, loc),
    sunset: time(day.sunset, loc),
    dial: sunDial(day, loc, now, next),
    nowWindow,
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

// A 24-hour dial, live like the moon: solar noon at the top, solar midnight at the bottom,
// morning on the left, evening on the right. The light part of the ring is the day; it
// grows in summer and shrinks in winter. Good / calm / avoid windows sit on the ring at
// their times, the sun sits at now.
function sunDial(day: DayPanchang, loc: Location, now: Date, next: DayView['next']): string {
  if (!day.sunrise || !day.sunset) return ''
  const { brahma, abhijit, rahuKaal } = day.windows
  const S = 200, c = S / 2, R = 84
  const noon = (day.sunrise.getTime() + day.sunset.getTime()) / 2
  const f = (n: number) => n.toFixed(1)
  const at = (d: Date) => {
    const a = ((d.getTime() - noon) / 86_400_000) * 2 * Math.PI
    return [c + R * Math.sin(a), c - R * Math.cos(a)] as const
  }
  const arc = (from: Date, to: Date, cls: string, extra = '') => {
    const [x1, y1] = at(from), [x2, y2] = at(to)
    const large = to.getTime() - from.getTime() > 43_200_000 ? 1 : 0
    return `<path class="${cls}" ${extra} d="M ${f(x1)} ${f(y1)} A ${R} ${R} 0 ${large} 1 ${f(x2)} ${f(y2)}"/>`
  }
  const seg = (w: Interval | null, cls: string) => (w ? arc(w.start, w.end, cls) : '')
  // The horizon: short ticks just outside the ring where the sun rises and sets.
  const [rx, hy] = at(day.sunrise), [setx] = at(day.sunset)
  const [sx, sy] = at(now)
  const up = now >= day.sunrise && now < day.sunset
  const label = `${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}.${next ? ` ${next.label} ${next.in}` : ''}`
  return `<svg class="dial" viewBox="0 0 ${S} ${S}" role="img" aria-label="${label}">
    <defs><linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="${c - R}" y1="0" x2="${c + R}" y2="0"><stop offset="0" stop-color="var(--color-arc-a)"/><stop offset="1" stop-color="var(--color-arc-b)"/></linearGradient></defs>
    <circle class="ring-night" cx="${c}" cy="${c}" r="${R}"/>
    ${arc(day.sunrise, day.sunset, 'ring-day', 'stroke="url(#sky)"')}
    <path class="horizon" d="M ${f(rx - 16)} ${f(hy)} H ${f(rx - 3)} M ${f(setx + 3)} ${f(hy)} H ${f(setx + 16)}"/>
    ${seg(brahma, 'mark-calm')}${seg(abhijit, 'mark-good')}${seg(rahuKaal, 'mark-avoid')}
    <circle class="sun${up ? '' : ' below'}" cx="${f(sx)}" cy="${f(sy)}" r="9"/>
  </svg>`
}
