// Day screen (SPEC 5.1) as plain data: every text the screen shows, computed from one
// DayPanchang, so tests can compare the screen with the engine. The day's times are the day
// clock's (src/ui/verdict.ts, DayClock.svelte).
import { addDays, civilDate } from '../core/time'
import { type DayPanchang, type Interval, type Location, type Span } from '../core/types'
import { LOCALE, barDate, content, entry, lead, percent, progress, t, time, tradition as traditionOf, until, type Lead } from './format'
import { icon } from './icons'
import { markText } from './marks'
import type { Term } from './terms'

/**
 * `next`: "then …" when the element changes before the Panchang day ends (next sunrise).
 * `lead`, here and on every tappable thing below: what it means on this day, shown first in its
 * sheet, above the general text (user, 2026-10-10: a general text read on a given day misleads).
 */
export type Fact = { term: Term; icon: string; label: string; value: string; sanskrit: string; right: string; next: string; lead?: Lead }
export type Zodiac = 'vedic' | 'western'
/** "Moon in Cancer · Karka", with "until …" and "then …" — shown on the moon card and the sun card. */
export type SignLine = { text: string; sanskrit: string; until: string; next: string; lead: Lead }

export type DayView = {
  shortDate: string
  moon: { illumination: number; waxing: boolean; label: string }
  tithi: { index: number; title: string; name: string; percent: number; progress: number; ends: string; meaning: string; lead: Lead }
  moonSign: SignLine
  sunSign: SignLine
  facts: Fact[]
  moreFacts: Fact[]
  tradition: { title: string; meaning: string; lead: Lead } | null
}

/** The moment the screen describes: now for today, otherwise that day's sunrise. */
export function momentFor(day: DayPanchang, loc: Location, now: Date): Date {
  if (civilDate(loc.tz, now) === day.date) return now
  return day.sunrise ?? new Date(`${day.date}T12:00:00Z`)
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
  const shortDate = barDate(day.date)

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
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  /** "18:36", "18:36 tomorrow", "18:36 yesterday", or "Sunday 18:36": a moment named without doubt about the day. */
  const stamp = (x: Date) => {
    const on = civilDate(loc.tz, x)
    if (on === day.date) return time(x, loc)
    if (on === addDays(day.date, 1)) return lead('atTomorrow', { time: time(x, loc) })
    if (on === addDays(day.date, -1)) return lead('atYesterday', { time: time(x, loc) })
    return `${new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: loc.tz }).format(x)} ${time(x, loc)}`
  }
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

  // Eclipses and Sankranti on this day lead the facts (SPEC 4.11).
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
    facts,
    moreFacts,
    tradition,
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
