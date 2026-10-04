// P3 mockup — Day screen (SPEC 5.1), filled live from the calculation core.
// v4 "dashboard" direction (user's reference image): framed hero with a realistic moon,
// 24-hour sun dial with its calm/good/avoid rows, plain-English day-fact rows. Anything
// marked data-sheet opens its explanation (mockups/common.ts).
import { computeDay } from '../src/core/panchang'
import { addDays, zonedTimeToUtc } from '../src/core/time'
import type { Interval } from '../src/core/types'
import { realisticMoon } from '../src/ui/moon'
import { content, entry, percent, progress, t, time, until } from '../src/ui/format'
import { date, icon, link, mount, params, tabs, terms, today, vilnius as loc } from './common'

const day = computeDay(date, loc)

// ?at=HH:MM shows the screen as it looks at that local time (mockup only).
const at = params.get('at')?.split(':').map(Number)
const [yy, mm, dd] = date.split('-').map(Number)
const now = at
  ? zonedTimeToUtc(loc.tz, yy, mm, dd, at[0], at[1] ?? 0)
  : date === today
    ? new Date()
    : (day.sunrise ?? new Date(`${date}T12:00:00Z`))

const shortDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: loc.tz }).format(
  day.sunrise ?? new Date(`${date}T12:00:00Z`),
)

const tithi = day.tithi[0]
const te = entry('tithi', tithi.index)
const state = t(day.moon.waxing ? 'stateWaxing' : 'stateWaning')
const lit = t('lit', { state, percent: percent(day.moon.illumination) })
// The bar under the moon is unlabeled on its own, so one short line says what it measures.
const tithiEnds = t('lunarDayEnds', { when: until(tithi.end, day, loc).replace(/^until /, '') })

// ── Day facts: one row each, plain English first, Sanskrit name small ───────────
// The lunar day is not repeated here — the hero above already shows it.
const fact = (term: string, svg: string, label: string, value: string, sanskrit: string, right = '') =>
  `<li class="fact" data-sheet="${term}">${svg}<div><span class="label">${label}</span><strong>${value}</strong><span class="sk">${sanskrit}</span></div>${right ? `<span class="right num">${right}</span>` : ''}</li>`
const ends = (end: Date) => until(end, day, loc)

const r = day.rhythm
const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
const nak = day.nakshatra[0]
const vara = entry('vara', day.vara)
const facts = [
  fact('vara', icon.vara, t('labelWeekday'), vara.title, vara.name),
  fact('nakshatra', icon.nakshatra, t('labelStar'), entry('nakshatra', nak.index).title, entry('nakshatra', nak.index).name, ends(nak.end)),
  fact('rhythm', icon.leaf, t('legendSeason'), ritu.title, ritu.name, t('seasonDay', { day: r.rituDay, length: r.rituLength })),
]
// Yoga and karana are poetic names with little everyday meaning for a Western reader, so
// they sit behind "More details".
const moreFacts = [
  fact('yoga', icon.yoga, t('labelYoga'), entry('yoga', day.yoga[0].index).title, entry('yoga', day.yoga[0].index).name, ends(day.yoga[0].end)),
  fact('karana', icon.karana, t('labelKarana'), entry('karana', day.karana[0].index).title, entry('karana', day.karana[0].index).name, ends(day.karana[0].end)),
]
// Rest days, Ekadashi and season changes get their own card further down, not a row here.

// ── Sun dial ─────────────────────────────────────────────────────────────────
// A 24-hour dial, live like the moon: solar noon at the top, solar midnight at the bottom,
// morning on the left, evening on the right. The light part of the ring is the day; it
// grows in summer and shrinks in winter. Good / calm / avoid windows sit on the ring at
// their times, the sun sits at now, and the centre says what comes next.
const { brahma, abhijit, rahuKaal } = day.windows
const sunriseAfter = computeDay(addDays(date, 1), loc).sunrise

const duration = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60), m = total % 60
  return h ? t('hoursMinutes', { h, m }) : t('minutes', { m })
}

const inside = (w: Interval | null) => !!w && now >= w.start && now < w.end
const nowWindow = inside(abhijit)
  ? `<span class="dial-now good">${t('nowGood')}</span>`
  : inside(rahuKaal)
    ? `<span class="dial-now avoid">${t('nowAvoid')}</span>`
    : inside(brahma)
      ? `<span class="dial-now calm">${t('nowCalm')}</span>`
      : ''

let nextLabel = '', nextIn = ''
if (day.sunrise && day.sunset) {
  const [label, at] =
    now < day.sunrise
      ? (['sunriseInLabel', day.sunrise] as const)
      : now < day.sunset
        ? (['sunsetInLabel', day.sunset] as const)
        : (['sunriseInLabel', sunriseAfter] as const)
  if (at) {
    nextLabel = t(label)
    nextIn = duration(at.getTime() - now.getTime())
  }
}

function sunDial(): string {
  if (!day.sunrise || !day.sunset) return ''
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
  return `<svg class="dial" viewBox="0 0 ${S} ${S}" role="img" aria-label="${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}. ${nextLabel} ${nextIn}">
    <defs><linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="${c - R}" y1="0" x2="${c + R}" y2="0"><stop offset="0" stop-color="var(--color-arc-a)"/><stop offset="1" stop-color="var(--color-arc-b)"/></linearGradient></defs>
    <circle class="ring-night" cx="${c}" cy="${c}" r="${R}"/>
    ${arc(day.sunrise, day.sunset, 'ring-day', 'stroke="url(#sky)"')}
    <path class="horizon" d="M ${f(rx - 16)} ${f(hy)} H ${f(rx - 3)} M ${f(setx + 3)} ${f(hy)} H ${f(setx + 16)}"/>
    ${seg(brahma, 'mark-calm')}${seg(abhijit, 'mark-good')}${seg(rahuKaal, 'mark-avoid')}
    <circle class="sun${up ? '' : ' below'}" cx="${f(sx)}" cy="${f(sy)}" r="9"/>
  </svg>`
}

/** "12:44–13:29"; breaks only at the dash, never inside a time (matters with 12-hour clocks). */
const range = (w: Interval) => `<span class="nw">${time(w.start, loc)}–</span><span class="nw">${time(w.end, loc)}</span>`

// The dial's calm / good / avoid rows in time order — they are also its colour key.
const midday = day.sunrise && day.sunset ? new Date((day.sunrise.getTime() + day.sunset.getTime()) / 2) : now
const windows = [
  { kind: 'calm', term: 'brahma', w: brahma, at: brahma?.start ?? now, none: t('none') },
  { kind: 'good', term: 'abhijit', w: abhijit, at: abhijit?.start ?? midday, none: day.vara === 3 ? t('notOnWednesdays') : t('none') },
  { kind: 'avoid', term: 'rahuKaal', w: rahuKaal, at: rahuKaal?.start ?? now, none: t('none') },
] as const
const windowRows = [...windows]
  .sort((a, b) => a.at.getTime() - b.at.getTime())
  .map(({ kind, term, w, none }) => {
    const [name, sanskrit] = terms[term]
    return `<li class="win ${kind}${w ? '' : ' none'}" data-sheet="${term}"><i aria-hidden="true"></i><div><b>${name}</b><span class="sk">${sanskrit}</span></div><span class="when num">${w ? range(w) : none}</span></li>`
  })
  .join('')

// ── Tradition card: only on special days — the season row above covers ordinary ones ──
const card = (title: string, meaning: string) => `<div class="head">${icon.leaf}<h3>${title}</h3></div><p>${meaning}</p>`
let tradition = ''
if (r.events.some((e) => e.kind === 'ritu')) tradition = card(t('season', { title: ritu.title, name: ritu.name }), ritu.meaning)
if (r.events.some((e) => e.kind === 'ayana')) tradition = card(content.rhythm[r.ayana].title, content.rhythm[r.ayana].meaning)
if (day.rhythm.restDay) {
  const rest = content.rhythm[day.rhythm.restDay === 'fullMoon' ? 'restFullMoon' : 'restNewMoon']
  tradition = `<div class="head">${icon.leaf}<h3>${rest.title}</h3></div><p>${rest.meaning}</p>`
}
if (day.ekadashi && !(tithi.index === 11 || tithi.index === 26)) {
  tradition = `<div class="head">${icon.leaf}<h3>${content.rhythm.ekadashi.title}</h3></div><p>${content.rhythm.ekadashi.meaning}</p>`
}

mount(`
<main class="screen">
  <header class="appbar">
    <a class="chip" href="${link('location.html')}">${icon.navigate}<span>${loc.name}, LT</span></a>
    <div class="datechip">
      <button aria-label="${t('previousDay')}">${icon.left}</button>
      <span class="num">${shortDate}</span>
      <button aria-label="${t('nextDay')}">${icon.right}</button>
    </div>
  </header>
  ${date !== today ? `<a class="today-link" href="${link('day.html').replace(/date=[^&]*&?/, '')}">${t('today')} →</a>` : ''}

  <section class="hero" aria-label="${te.name}" data-sheet="tithi">
    ${realisticMoon(day.moon.illumination, day.moon.waxing, 150, lit)}
    <h2>${te.title}</h2>
    <p class="sub num"><b>${te.name}</b> · ${percent(day.moon.illumination)} % lit</p>
    <div class="track" aria-hidden="true"><span style="width:${(progress(tithi, now) * 100).toFixed(1)}%"></span></div>
    <p class="track-label num">${tithiEnds}</p>
    <p class="meaning">${te.meaning}</p>
  </section>

  <section class="card arcbox" aria-labelledby="s-sun">
    <h2 id="s-sun">${t('sectionRhythm')}</h2>
    <div class="arcwrap">
      <div class="arc-end">${icon.sunrise}<small>${t('sunrise')}</small><b class="num">${time(day.sunrise, loc)}</b></div>
      <div class="dial-wrap">
        ${sunDial()}
        <div class="dial-center">${nowWindow}${nextLabel ? `<small>${nextLabel}</small><b class="num">${nextIn}</b>` : ''}</div>
      </div>
      <div class="arc-end">${icon.sunset}<small>${t('sunset')}</small><b class="num">${time(day.sunset, loc)}</b></div>
    </div>
    <ul class="wins">${windowRows}</ul>
  </section>

  <div class="card facts">
    <ul>${facts.join('')}</ul>
    <details class="more"><summary>${t('moreDetails')}${icon.down}</summary><ul>${moreFacts.join('')}</ul></details>
  </div>

  ${tradition ? `<section class="card tradition" aria-label="${t('sectionTradition')}" data-sheet="rhythm">${tradition}</section>` : ''}

</main>
${tabs('day')}
`)
