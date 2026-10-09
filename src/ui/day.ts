// Day screen (SPEC 5.1) as plain data: every text and shape the screen shows, computed from
// one DayPanchang. The app's Day.svelte and the P3 mockup both render this, so the approved
// mockup and the app cannot drift apart, and tests can compare the screen with the engine.
import { addDays, civilDate, tzOffsetMinutes, zonedTimeToUtc } from '../core/time'
import { CHOGHADIYA_RATING, type DayPanchang, type Interval, type Location, type Span } from '../core/types'
import { LOCALE, MONTH, content, entry, lead, percent, progress, t, time, tradition as traditionOf, until, type Lead } from './format'
import { icon } from './icons'
import { markText, shownMarks } from './marks'
import { terms, type Term } from './terms'

/**
 * `next`: "then …" when the element changes before the Panchang day ends (next sunrise).
 * `lead`, here and on every tappable thing below: what it means on this day, shown first in its
 * sheet, above the general text (user, 2026-10-10: a general text read on a given day misleads).
 */
export type Fact = { term: Term; icon: string; label: string; value: string; sanskrit: string; right: string; next: string; lead?: Lead }
export type Zodiac = 'vedic' | 'western'
export type WindowKind = 'calm' | 'good' | 'avoid'
/** A stretch of the day's track: 0 = the track's start (Brahma Muhurta), 1 = the next sunrise. */
export type TrackPart = { from: number; to: number }
/**
 * One row of the day's time list. Nothing is cut where windows overlap, as on Drik (user,
 * 2026-10-10): every row carries its place on one shared day `track`, and a calm, good or
 * favoured row marks the parts a time to avoid shares with it (`clashes`), so the overlap is
 * seen down the list. `favoured`: a Pushya or Siddhi window (SPEC 4.11), not drawn on the dial.
 */
export type WindowRow = {
  kind: WindowKind | 'favoured'; term: Term; name: string; sanskrit: string; start: string; end: string; none: string
  track: (TrackPart & { clashes: TrackPart[] }) | null; active: boolean; lead: Lead
}

/**
 * One Choghadiya part as a row: "Gain · Labh  11:42 AM–1:06 PM", `current` while it runs.
 * `part`: 'before' = last night's parts still to run before this sunrise (shown only then).
 */
export type ChoghadiyaRow = { name: string; sanskrit: string; start: string; end: string; rating: 'good' | 'neutral' | 'avoid'; part: 'before' | 'day' | 'night'; current: boolean; lead: Lead }

/** "Moon in Cancer · Karka", with "until …" and "then …" — shown on the moon card and the sun card. */
export type SignLine = { text: string; sanskrit: string; until: string; next: string; lead: Lead }

export type DayView = {
  shortDate: string
  moon: { illumination: number; waxing: boolean; label: string }
  tithi: { index: number; title: string; name: string; percent: number; progress: number; ends: string; meaning: string; lead: Lead }
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
  /** The shared day track: daylight from `dawn` to `dusk`, and `now` while the clock is on it. */
  track: { dawn: number; dusk: number; now: number | null }
  /**
   * The 16 Choghadiya parts, sunrise to next sunrise — before sunrise led by what is left of
   * last night; `choghadiyaNow` is the one at the dial's time.
   */
  choghadiya: ChoghadiyaRow[]
  choghadiyaNow: ChoghadiyaRow | null
  facts: Fact[]
  moreFacts: Fact[]
  tradition: { title: string; meaning: string; lead: Lead } | null
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
  // Pieces of the day-specific sheet lines.
  const range = (w: Interval) => `${time(w.start, loc)}–${time(w.end, loc)}`
  const minutes = (ms: number) => Math.round(ms / 60_000)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  /** "18:36", "18:36 tomorrow", "18:36 yesterday", or "Sunday 18:36": a moment named without doubt about the day. */
  const stamp = (x: Date) => {
    const on = civilDate(loc.tz, x)
    if (on === day.date) return time(x, loc)
    if (on === addDays(day.date, 1)) return lead('atTomorrow', { time: time(x, loc) })
    if (on === addDays(day.date, -1)) return lead('atYesterday', { time: time(x, loc) })
    return `${new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: loc.tz }).format(x)} ${time(x, loc)}`
  }
  const weekday = cap(new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: loc.tz }).format(noonish))
  /** Which half of which lunar day a half-day span (a karana) is. */
  const halfOf = (s: Span) => {
    const lunarDay = activeAt(day.tithi, new Date((s.start.getTime() + s.end.getTime()) / 2))
    const first = Math.abs(s.start.getTime() - lunarDay.start.getTime()) < 120_000
    return { half: lead(first ? 'firstHalf' : 'secondHalf'), tithi: lunarDay.index, title: entry('tithi', lunarDay.index).name }
  }
  const joined = (...parts: string[]) => parts.filter(Boolean).join(' ')
  /** "Autumn · Sharad" and its meaning: what a row's sheet opens on before the term itself. */
  const leadOf = (e: { title: string; name: string; meaning: string }) => ({ title: `${e.title} · ${e.name}`, text: e.meaning })
  /**
   * A row for a changing element: the span in force now, its end, and what follows it; its
   * sheet opens on what this one means (user, 2026-10-10: the meanings were never shown).
   */
  const element = (term: Term, svg: string, label: string, spans: Span[], name: (i: number) => { title: string; name: string; meaning: string }) => {
    const s = activeAt(spans, now)
    const n = following(spans, s, day)
    return { ...fact(term, svg, label, name(s.index).title, name(s.index).name, ends(s.end), n ? t('then', { name: name(n.index).title }) : ''), lead: leadOf(name(s.index)) }
  }
  const r = day.rhythm
  const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
  const vara = entry('vara', day.vara)
  const m = day.masa
  const month = content.masa[String(m.purnimanta) as '1']
  // Signs sit with their body — the Moon's on the moon card, the Sun's on the sun card. The
  // English name is already a plain word; the Sanskrit one (or "Western sign") follows it.
  const signs = day.signs[zodiac]
  const rashi = (i: number) => content.rashi[String(i) as '1']
  const otherZodiac = day.signs[zodiac === 'vedic' ? 'western' : 'vedic']
  const signLine = (body: 'moon' | 'sun'): SignLine => {
    const spans = signs[body]
    const s = activeAt(spans, now)
    const n = following(spans, s, day)
    const e = rashi(s.index)
    // The sheet: where the body is and until when, where the other zodiac puts it, what the sign means.
    const other = activeAt(otherZodiac[body], now).index
    return {
      text: t(body === 'moon' ? 'moonIn' : 'sunIn', { sign: e.title }),
      sanskrit: zodiac === 'vedic' ? e.name : t('westernZodiac'),
      until: ends(s.end),
      next: n ? t('then', { name: rashi(n.index).title }) : '',
      lead: {
        title: `${e.title} · ${e.name}`,
        text: joined(
          // "until Oct 17" ends in a dot in Lithuanian ("spalio 17 d."): the sentence adds its own.
          lead(body === 'moon' ? 'moonSign' : 'sunSign', { sign: e.title, until: ends(s.end).replace(/\.$/, '') }),
          other !== s.index ? lead('otherZodiac', { zodiac: lead(zodiac === 'vedic' ? 'western' : 'vedic'), sign: rashi(other).title }) : '',
          e.meaning,
        ),
      },
    }
  }
  /** An eclipse's sheet: what is seen here and when, then what tradition does. */
  const eclipseLead = (mk: Extract<DayPanchang['marks'][number], { kind: 'eclipse' }>): Lead => {
    const seen = mk.seen
    const peakSeen = !!seen && mk.peak >= seen.start && mk.peak <= seen.end
    return {
      title: markText(mk, loc, zodiac).title,
      text: joined(
        seen ? lead('eclipse', { range: range(seen) }) : markText(mk, loc, zodiac).note,
        seen ? lead(peakSeen ? 'eclipsePeak' : 'eclipsePeakUnseen', { time: stamp(mk.peak) }) : '',
        traditionOf('eclipse'),
      ),
    }
  }

  // Eclipses and Sankranti on this day lead the facts (SPEC 4.11). Pushya and Siddhi are time
  // windows: they sit in the time list below (user, 2026-10-09: looked for there, not found).
  const marks = day.marks
    .filter((mk) => mk.kind === 'eclipse' || mk.kind === 'sankranti')
    .map((mk): Fact => {
      const x = markText(mk, loc, zodiac)
      const sheetLead =
        mk.kind === 'eclipse'
          ? eclipseLead(mk)
          : { title: '', text: joined(lead('sankranti', { time: stamp(mk.at), sign: rashi(mk.sign).title }), rashi(mk.sign).meaning) }
      return { term: x.term, icon: x.svg, label: x.label, value: x.title, sanskrit: x.sanskrit, right: x.when, next: x.note, lead: sheetLead }
    })
  const facts = [
    ...marks,
    ...(day.parana ? [paranaFact(day, loc)] : []),
    { ...fact('vara', icon.vara, t('labelWeekday'), vara.title, vara.name), lead: leadOf(vara) },
    {
      ...fact('masa', icon.month, t('labelMonth'), m.adhika ? t('extraMonth') : month.title, m.adhika ? t('adhika', { name: month.name }) : month.name),
      lead: { title: `${month.name} · ${month.title}`, text: month.meaning },
    },
    element('nakshatra', icon.nakshatra, t('labelStar'), day.nakshatra, (i) => entry('nakshatra', i)),
    // Its sheet opens on this season, then the six (user, 2026-10-10: it opened the whole rhythm).
    { ...fact('ritu', icon.leaf, t('legendSeason'), ritu.title, ritu.name, t('seasonDay', { day: r.rituDay, length: r.rituLength })), lead: leadOf(ritu) },
  ]
  // Yoga and karana are poetic names with little everyday meaning for a Western reader, so
  // they sit behind "More details".
  const moreFacts = [
    element('yoga', icon.yoga, t('labelYoga'), day.yoga, (i) => entry('yoga', i)),
    karanaFact(),
  ]
  /** The karana row's sheet also says which half of which lunar day it is. */
  function karanaFact(): Fact {
    const row = element('karana', icon.karana, t('labelKarana'), day.karana, (i) => entry('karana', i))
    return { ...row, lead: { ...row.lead, text: joined(cap(lead('karana', halfOf(activeAt(day.karana, now)))), row.lead.text) } }
  }

  // ── The time list: calm, good, avoid and favoured windows, whole, in time order ──
  const inside = (w: Interval | null) => !!w && clock >= w.start && clock < w.end
  const { brahma, abhijit, rahuKaal, yamaganda, gulika } = day.windows
  const nowWindows = ([['avoid', [rahuKaal, yamaganda, gulika].some(inside)], ['good', inside(abhijit)], ['calm', inside(brahma)]] as const)
    .filter(([, on]) => on)
    .map(([k]) => k as WindowKind)

  // The Panchang day runs sunrise to next sunrise; without them (polar day or night), the civil day.
  const [y, mo, d] = day.date.split('-').map(Number)
  const dayFrom = day.sunrise ?? zonedTimeToUtc(loc.tz, y, mo, d, 0, 0)
  const dayTo = day.nextSunrise ?? zonedTimeToUtc(loc.tz, y, mo, d + 1, 0, 0)
  const inDay = (w: Interval): Interval | null => {
    const start = w.start > dayFrom ? w.start : dayFrom, end = w.end < dayTo ? w.end : dayTo
    return start < end ? { start, end } : null
  }
  /** The Panchang day's parts of an element: Bhadra is the Vishti karana, Vyatipata and Vaidhriti yogas 17 and 27. */
  const partsOf = (spans: Span[], index: number) => spans.filter((s) => s.index === index).flatMap((s) => (inDay(s) ? [{ s, w: inDay(s)! }] : []))

  // Each row's sheet opens on today: its times and why they fall there, then what tradition does.
  type Row = { kind: WindowRow['kind']; term: Term; w: Interval | null; none: string; lead: string; name?: string; sanskrit?: string }
  const daylight = day.sunrise && day.sunset ? day.sunset.getTime() - day.sunrise.getTime() : 0
  /** Rahu Kaal, Yamaganda, Gulika: which of the eight parts of daylight this weekday gives them. */
  const eighth = (term: 'rahuKaal' | 'yamaganda' | 'gulika', w: Interval | null) =>
    w && day.sunrise && day.sunset
      ? lead('part', {
          range: range(w), sunrise: time(day.sunrise, loc), sunset: time(day.sunset, loc), minutes: minutes(daylight / 8), weekday, name: terms[term][1],
          n: Math.round((w.start.getTime() - day.sunrise.getTime()) / (daylight / 8)) + 1,
        })
      : ''
  const rows: Row[] = [
    {
      kind: 'calm', term: 'brahma', w: brahma, none: t('none'),
      lead: brahma && day.sunrise ? lead('brahma', { range: range(brahma), minutes: minutes(brahma.end.getTime() - brahma.start.getTime()), sunrise: time(day.sunrise, loc) }) : '',
    },
    {
      kind: 'good', term: 'abhijit', w: abhijit, none: day.vara === 3 ? t('notOnWednesdays') : t('none'),
      lead: abhijit ? lead('abhijit', { range: range(abhijit), minutes: minutes(abhijit.end.getTime() - abhijit.start.getTime()) }) : day.vara === 3 ? lead('abhijitWednesday') : '',
    },
    ...(['rahuKaal', 'yamaganda', 'gulika'] as const).map((term): Row => ({ kind: 'avoid', term, w: day.windows[term], none: t('none'), lead: eighth(term, day.windows[term]) })),
    // Times to avoid that are not daily (user, 2026-10-10): too many days to mark on the month.
    ...partsOf(day.karana, 7).map(({ s, w }): Row => ({ kind: 'avoid', term: 'bhadra', w, none: '', lead: lead('bhadra', { range: range(w), ...halfOf(s) }) })),
    ...([[17, 'vyatipata'], [27, 'vaidhriti']] as const).flatMap(([n, term]) =>
      partsOf(day.yoga, n).map(({ s, w }): Row => ({ kind: 'avoid', term, w, none: '', lead: lead('yoga', { from: stamp(s.start), to: stamp(s.end), n }) })),
    ),
    ...day.marks.flatMap((mk): Row[] =>
      mk.kind === 'eclipse' && mk.seen
        ? [{ kind: 'avoid', term: 'eclipse', w: mk.seen, none: '', lead: eclipseLead(mk).text, name: t('labelEclipse'), sanskrit: markText(mk, loc, zodiac).sanskrit }]
        : [],
    ),
    // The day's favoured window (Pushya over Amrit over Sarvartha Siddhi), named by its tradition.
    ...shownMarks(day.marks).flatMap((mk): Row[] => {
      if (mk.kind !== 'pushya' && mk.kind !== 'siddhi') return []
      const x = markText(mk, loc, zodiac)
      const w = { start: mk.start, end: mk.end }
      const star = entry('nakshatra', activeAt(day.nakshatra, new Date(mk.start.getTime() + 60_000)).index).name
      const why = mk.kind === 'pushya' ? lead('pushya', { weekday, range: range(w) }) : lead('siddhi', { weekday, star, yoga: x.sanskrit, range: range(w) })
      return [{ kind: 'favoured', term: x.term, w, none: '', lead: why, name: x.label, sanskrit: x.sanskrit }]
    }),
  ]

  // One track for every row: from Brahma Muhurta, before sunrise, to the next sunrise.
  const t0 = Math.min(dayFrom.getTime(), brahma?.start.getTime() ?? Infinity), t1 = dayTo.getTime()
  const at = (x: Date) => Math.min(1, Math.max(0, (x.getTime() - t0) / (t1 - t0)))
  const part = (w: Interval): TrackPart | null => (at(w.start) < at(w.end) ? { from: at(w.start), to: at(w.end) } : null)
  const avoids = rows.flatMap((r) => (r.kind === 'avoid' && r.w ? [r.w] : []))
  const clashesWith = (w: Interval) =>
    avoids.flatMap((a) => (a.start < w.end && w.start < a.end ? (part({ start: a.start > w.start ? a.start : w.start, end: a.end < w.end ? a.end : w.end }) ?? []) : []))

  // In time order — the calm, good and avoid rows are also the dial's colour key.
  const midday = day.sunrise && day.sunset ? new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2) : now
  const windows = rows
    .sort((a, b) => (a.w?.start ?? midday).getTime() - (b.w?.start ?? midday).getTime())
    .map(({ kind, term, w, none, name, sanskrit, lead: today }): WindowRow => {
      const [plain, sk] = name !== undefined ? [name, sanskrit ?? ''] : terms[term]
      const p = w && part(w)
      return {
        kind, term, name: plain, sanskrit: sk,
        start: w ? time(w.start, loc) : '', end: w ? time(w.end, loc) : '', none: w ? '' : none,
        track: p ? { ...p, clashes: kind === 'avoid' ? [] : clashesWith(w) } : null,
        active: inside(w),
        // An eclipse's own lead already ends with what tradition does.
        lead: { title: '', text: term === 'eclipse' ? today : joined(today, traditionOf(term)) },
      }
    })
  const track = {
    dawn: day.sunrise ? at(day.sunrise) : 0,
    dusk: day.sunset ? at(day.sunset) : 0,
    now: clock.getTime() >= t0 && clock.getTime() < t1 ? at(clock) : null,
  }

  // ── Choghadiya: hour by hour, folded under the windows ──────────────────────
  // Between midnight and sunrise last night's parts are still running: the ones left lead the list.
  const before = day.sunrise && clock < day.sunrise ? day.choghadiyaBefore.filter((p) => p.end > clock) : []
  const choghadiya = [...before.map((p) => ({ p, part: 'before' as const })), ...day.choghadiya.map((p) => ({ p, part: p.night ? ('night' as const) : ('day' as const) }))].map(
    ({ p, part }): ChoghadiyaRow => {
      const e = content.choghadiya[p.name]
      const first = day.choghadiya[0] ? content.choghadiya[day.choghadiya[0].name].title : ''
      return {
        name: e.title, sanskrit: e.name, start: time(p.start, loc), end: time(p.end, loc), rating: CHOGHADIYA_RATING[p.name], part, current: inside(p),
        lead: { title: `${e.title} · ${e.name}`, text: joined(lead('choghadiya', { range: range(p), weekday, first }), e.meaning) },
      }
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
  // Its sheet opens on why today is special: "New moon today at 18:49".
  let card: { title: string; meaning: string } | null = null
  let why = ''
  const ritu1 = r.events.find((e) => e.kind === 'ritu')
  const ayana1 = r.events.find((e) => e.kind === 'ayana')
  if (ritu1) {
    card = { title: t('season', { title: ritu.title, name: ritu.name }), meaning: ritu.meaning }
    why = lead('rituBegins', { season: ritu.title, time: time(ritu1.at, loc) })
  }
  if (ayana1) {
    card = content.rhythm[r.ayana]
    why = lead('ayanaBegins', { time: time(ayana1.at, loc) })
  }
  if (r.restDay) {
    card = content.rhythm[r.restDay === 'fullMoon' ? 'restFullMoon' : 'restNewMoon']
    why = r.restDay === 'newMoon' && day.newMoon ? lead('restNewMoon', { time: time(day.newMoon, loc) }) : day.fullMoon ? lead('restFullMoon', { when: time(day.fullMoon, loc) }) : ''
  }
  // Ekadashi gets the card only when the moon card does not already say it (tithi 11 or 26).
  if (day.ekadashi && !(tithi.index === 11 || tithi.index === 26)) {
    card = content.rhythm.ekadashi
    why = lead('ekadashi')
  }
  const tradition: DayView['tradition'] = card ? { title: card.title, meaning: card.meaning, lead: { title: card.title, text: joined(why, card.meaning) } } : null
  const tithiEnds =
    // "Ends at 1:24 AM tomorrow": the "until" wording minus its own "until".
    t('lunarDayEnds', { when: until(tithi.end, day, loc).replace(t('until', { time: '' }), '') }) +
    (nextTithi ? `, ${t('then', { name: entry('tithi', nextTithi.index).title })}` : '')

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
      ends: tithiEnds,
      meaning: te.meaning,
      lead: {
        title: `${te.title} · ${te.name}`,
        text: joined(lead('tithi', { n: tithi.index, half: lead(tithi.index <= 15 ? 'waxingHalf' : 'waningHalf'), ends: tithiEnds }), te.meaning),
      },
    },
    moonSign: signLine('moon'),
    sunSign: signLine('sun'),
    sunrise: time(day.sunrise, loc),
    sunset: time(day.sunset, loc),
    dial: sunDial(day, loc, clock, next),
    nowWindows,
    next,
    windows,
    track,
    choghadiya,
    choghadiyaNow: choghadiya.find((c) => c.current) ?? null,
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
  const today = civilDate(loc.tz, p.start) === day.date
  const value = t(today ? 'paranaToday' : 'paranaTomorrow', { range })
  // Morning (the first fifth of daylight) unless Hari Vasara pushed it to the afternoon.
  const sunrise = today ? day.sunrise : day.nextSunrise
  const morning = !sunrise || p.end.getTime() - sunrise.getTime() <= 6 * 3_600_000
  return { term: 'parana', icon: icon.dawn, label: t('labelParana'), value, sanskrit: 'Parana', right: '', next: '', lead: { title: '', text: lead(morning ? 'paranaMorning' : 'paranaAfternoon', { when: value }) } }
}

// A 24-hour clock face, live like the moon: solar noon at the top, solar midnight at the
// bottom, morning on the left, evening on the right; the hour numbers sit at their clock
// times, so "12" is off the top by the gap between clock noon and solar noon. The light part
// of the ring is the day. Calm and good windows run on a lane just outside the ring, the three
// daily times to avoid on one just inside, each whole (the lanes show where they overlap).
// By day the sun travels outside the ring, joined to it by a thin line at now; at night it is
// not drawn (the centre says "Sunrise in …"), so no room is kept for it below the ring.
function sunDial(day: DayPanchang, loc: Location, now: Date, next: DayView['next']): string {
  if (!day.sunrise || !day.sunset) return ''
  const { brahma, abhijit, rahuKaal, yamaganda, gulika } = day.windows
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
