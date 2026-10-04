// P3 mockup — Day screen (SPEC 5.1), filled live from the calculation core.
// v4 "dashboard" direction (user's reference image): framed hero with a realistic moon,
// six icon tiles, sun arc, good/avoid cards.
import { computeDay } from '../src/core/panchang'
import { zonedTimeToUtc } from '../src/core/time'
import type { Interval } from '../src/core/types'
import { realisticMoon } from '../src/ui/moon'
import { content, entry, percent, progress, sheet, t, time, until } from '../src/ui/format'
import { date, icon, link, mount, params, tabs, today, vilnius as loc } from './common'

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
const tithiNext = day.tithi[1]
const te = entry('tithi', tithi.index)
const state = t(day.moon.waxing ? 'stateWaxing' : 'stateWaning')
const lit = t('lit', { state, percent: percent(day.moon.illumination) })

// ── Six tiles ────────────────────────────────────────────────────────────────
const tile = (svg: string, label: string, value: string, sub = '', cls = '') =>
  `<li class="card tile ${cls}">${svg}<span class="label">${label}</span><strong>${value}</strong>${sub ? `<span class="until num">${sub}</span>` : ''}</li>`
const short = (end: Date) => until(end, day, loc).replace(/^until /, '→ ')

const r = day.rhythm
const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
let special = tile(icon.leaf, t('legendSeason'), ritu.name, ritu.title)
if (day.rhythm.restDay) special = tile(icon.leaf, t('restDay'), day.rhythm.restDay === 'fullMoon' ? 'Purnima' : 'Amavasya', '', 'special')
if (day.ekadashi) special = tile(icon.leaf, t('legendFasting'), 'Ekadashi', content.rhythm.ekadashi.title.split(' — ')[1] ?? '', 'special')

const nak = day.nakshatra[0]
const tiles = [
  tile(icon.tithi, 'Tithi', te.name.split(' ').at(-1)!, short(tithi.end)),
  tile(icon.vara, 'Vara', entry('vara', day.vara).name),
  tile(icon.nakshatra, 'Nakshatra', entry('nakshatra', nak.index).name, short(nak.end)),
  tile(icon.yoga, 'Yoga', entry('yoga', day.yoga[0].index).name, short(day.yoga[0].end)),
  tile(icon.karana, 'Karana', entry('karana', day.karana[0].index).name, short(day.karana[0].end)),
  special,
]

// ── Sun arc ──────────────────────────────────────────────────────────────────
const { brahma, abhijit, rahuKaal } = day.windows
function sunArc(): string {
  if (!day.sunrise || !day.sunset) return ''
  const W = 220, R = 96, cx = W / 2, cy = 104
  const rise = day.sunrise.getTime(), set = day.sunset.getTime()
  const point = (d: Date) => {
    const f = Math.min(1, Math.max(0, (d.getTime() - rise) / (set - rise)))
    const a = Math.PI * (1 - f)
    return [cx + R * Math.cos(a), cy - R * Math.sin(a)] as const
  }
  const seg = (w: Interval | null, cls: string) => {
    if (!w) return ''
    const [x1, y1] = point(w.start), [x2, y2] = point(w.end)
    return `<path class="${cls}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`
  }
  const daytime = now.getTime() > rise && now.getTime() < set
  const [sx, sy] = point(now)
  return `<svg class="arc" viewBox="0 0 ${W} ${cy + 4}" role="img" aria-label="${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}">
    <defs><linearGradient id="sky" x1="0" x2="1"><stop offset="0" stop-color="var(--color-arc-a)"/><stop offset="1" stop-color="var(--color-arc-b)"/></linearGradient></defs>
    <line class="horizon" x1="0" y1="${cy}" x2="${W}" y2="${cy}"/>
    <path class="path" stroke="url(#sky)" d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}"/>
    ${seg(abhijit, 'mark-good')}${seg(rahuKaal, 'mark-avoid')}
    ${daytime ? `<circle class="sun" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="8"/>` : ''}
  </svg>`
}

/** "12:44–13:29"; breaks only at the dash, never inside a time (matters with 12-hour clocks). */
const range = (w: Interval) => `<span class="nw">${time(w.start, loc)}–</span><span class="nw">${time(w.end, loc)}</span>`

const wcard = (kind: 'good' | 'avoid', svg: string, name: string, w: Interval | null, none = '') =>
  w
    ? `<li class="card wcard ${kind}">${svg}<div><small>${name}</small><b class="num">${range(w)}</b></div></li>`
    : `<li class="card wcard none">${svg}<div><small>${name}</small><span class="none-text">${none}</span></div></li>`

// ── Tradition card: what is special today, else the season ────────────────────
let tradition = `<div class="head">${icon.leaf}<h3>${t('season', { title: ritu.title, name: ritu.name })} · <span class="num">${t('seasonDay', { day: r.rituDay, length: r.rituLength })}</span></h3></div><p>${ritu.meaning}</p>`
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

  <section class="hero" aria-label="${te.name}">
    ${realisticMoon(day.moon.illumination, day.moon.waxing, 150, lit)}
    <h2>${te.name}</h2>
    <p class="sub num">${te.title} · ${percent(day.moon.illumination)} % lit</p>
    <div class="track" aria-hidden="true"><span style="width:${(progress(tithi, now) * 100).toFixed(1)}%"></span></div>
    <p class="track-label num"><span>${until(tithi.end, day, loc)}</span>${tithiNext ? `<span>${t('then', { name: entry('tithi', tithiNext.index).name })}</span>` : ''}</p>
    <p class="meaning">${te.meaning}</p>
  </section>

  <ul class="tiles">${tiles.join('')}</ul>

  <section class="card arcbox" aria-labelledby="s-sun">
    <h2 id="s-sun">${t('sectionRhythm')}</h2>
    <div class="arcwrap">
      <div class="arc-end">${icon.sunrise}<small>${t('sunrise')}</small><b class="num">${time(day.sunrise, loc)}</b></div>
      ${sunArc()}
      <div class="arc-end">${icon.sunset}<small>${t('sunset')}</small><b class="num">${time(day.sunset, loc)}</b></div>
    </div>
  </section>

  <ul class="wcards">
    ${wcard('good', icon.clock, t('abhijit'), abhijit, day.vara === 3 ? t('notOnWednesdays') : t('none'))}
    ${wcard('avoid', icon.warn, t('rahuKaal'), rahuKaal, t('none'))}
  </ul>
  ${brahma ? `<div class="card brahma"><span>${icon.dawn}${t('brahma')}</span><b class="num">${range(brahma)}</b></div>` : ''}

  <section class="card tradition" aria-label="${t('sectionTradition')}">${tradition}</section>

  <p class="footnote">${t('footer', { city: loc.name })} ${sheet('times', { city: loc.name }).split('. ')[1] ?? ''}</p>
</main>
${tabs('day')}
`)
