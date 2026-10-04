// P3 mockup — Day screen (SPEC 5.1), filled live from the calculation core.
// v2 (user reference image): centred moon hero, at-a-glance tiles, sun arc, window cards.
import { computeDay } from '../src/core/panchang'
import type { Interval } from '../src/core/types'
import { content, entry, moonSvg, percent, progress, sheet, t, time, until } from '../src/ui/format'
import { date, icon, link, mount, params, tabs, today, vilnius as loc } from './common'
import { zonedTimeToUtc } from '../src/core/time'

const day = computeDay(date, loc)
// ?at=HH:MM shows the screen as it looks at that local time (mockup only).
const at = params.get('at')?.split(':').map(Number)
const [yy, mm, dd] = date.split('-').map(Number)
const now = at ? zonedTimeToUtc(loc.tz, yy, mm, dd, at[0], at[1] ?? 0) : date === today ? new Date() : day.sunrise ?? new Date(`${date}T12:00:00Z`)

const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.tz }).format(
  day.sunrise ?? new Date(`${date}T12:00:00Z`),
)

const tithi = day.tithi[0]
const tithiNext = day.tithi[1]
const te = entry('tithi', tithi.index)
const state = t(day.moon.waxing ? 'stateWaxing' : 'stateWaning')
const lit = t('lit', { state, percent: percent(day.moon.illumination) })

/** At-a-glance tile: what it is, the plain-English title, the Sanskrit name and when it changes. */
function tile(label: string, group: 'nakshatra' | 'yoga' | 'karana', spans: typeof day.yoga) {
  const [first, next] = spans
  const e = entry(group, first.index)
  const then = next ? `<span class="then">${t('then', { name: entry(group, next.index).name })}</span>` : ''
  return `<li class="tile"><span class="label">${label}</span><h3>${e.title}</h3>
    <p class="detail">${e.name}<br><span class="num">${until(first.end, day, loc)}</span>${then ? '<br>' + then : ''}</p></li>`
}

const vara = entry('vara', day.vara)
const flags: string[] = []
// When the lunar day itself is Ekadashi the hero text already says so — keep the tile short.
const tithiIsEkadashi = tithi.index === 11 || tithi.index === 26
if (day.ekadashi)
  flags.push(`<li class="tile wide flagged"><span class="flag">${content.rhythm.ekadashi.name}</span><h3>${content.rhythm.ekadashi.title}</h3>${tithiIsEkadashi ? '' : `<p class="detail">${content.rhythm.ekadashi.meaning}</p>`}</li>`)
if (day.rhythm.restDay) {
  const rest = content.rhythm[day.rhythm.restDay === 'fullMoon' ? 'restFullMoon' : 'restNewMoon']
  flags.push(`<li class="tile wide flagged"><span class="flag">${t('restDay')}</span><h3>${rest.title}</h3><p class="detail">${rest.meaning}</p></li>`)
}

// ── Sun arc: sunrise on the left horizon, sunset on the right ──────────────────
const { brahma, abhijit, rahuKaal } = day.windows
function sunArc(): string {
  if (!day.sunrise || !day.sunset) return ''
  const W = 300, R = 120, cx = W / 2, cy = 132
  const rise = day.sunrise.getTime(), set = day.sunset.getTime()
  const at = (d: Date) => {
    const f = Math.min(1, Math.max(0, (d.getTime() - rise) / (set - rise)))
    const a = Math.PI * (1 - f)
    return [cx + R * Math.cos(a), cy - R * Math.sin(a)] as const
  }
  const seg = (w: Interval | null, cls: string) => {
    if (!w) return ''
    const [x1, y1] = at(w.start), [x2, y2] = at(w.end)
    return `<path class="${cls}" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`
  }
  const daytime = now.getTime() > rise && now.getTime() < set
  const [sx, sy] = at(now)
  const elapsed = daytime ? `<path class="elapsed" d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${sx.toFixed(1)} ${sy.toFixed(1)}"/>` : ''
  const sun = daytime ? `<circle class="sun" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="7"/>` : ''
  return `<svg class="arc" viewBox="0 0 ${W} ${cy + 6}" role="img" aria-label="${t('sunrise')} ${time(day.sunrise, loc)}, ${t('sunset')} ${time(day.sunset, loc)}">
    <line class="horizon" x1="0" y1="${cy}" x2="${W}" y2="${cy}"/>
    <path class="path" d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}"/>
    ${elapsed}${seg(abhijit, 'good')}${seg(rahuKaal, 'avoid')}${sun}
  </svg>`
}

const card = (kind: 'good' | 'avoid', label: string, name: string, w: Interval | null, none = '') =>
  w
    ? `<li class="wcard ${kind}"><span class="swatch w ${kind}"></span><span class="label">${label}</span><h3>${name}</h3><p class="num">${time(w.start, loc)}–${time(w.end, loc)}</p></li>`
    : none
      ? `<li class="wcard none"><span class="label">${label}</span><h3>${name}</h3><p class="quiet">${none}</p></li>`
      : ''

// Season card.
const r = day.rhythm
const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
const ayana = content.rhythm[r.ayana]

mount(`
<main class="screen">
  <header class="topbar">
    <a class="place" href="${link('location.html')}">${icon.pin}<span>${loc.name}</span>${icon.down}</a>
    ${date !== today ? `<a class="pill" href="${link('day.html').replace(/date=[^&]*&?/, '')}">${t('today')}</a>` : ''}
  </header>
  <div class="datebar">
    <button class="icon-btn" aria-label="${t('previousDay')}">${icon.left}</button>
    <h1>${longDate}</h1>
    <button class="icon-btn" aria-label="${t('nextDay')}">${icon.right}</button>
  </div>

  <div class="hero2">
    <div class="halo">${moonSvg(day.moon.illumination, day.moon.waxing, 168, lit)}</div>
    <h2>${te.title}</h2>
    <p class="sanskrit">${te.name} · <span class="num">${lit}</span></p>
    <div class="track" aria-hidden="true"><span style="width:${(progress(tithi, now) * 100).toFixed(1)}%"></span></div>
    <p class="track-label num"><span>${until(tithi.end, day, loc)}</span>${tithiNext ? `<span>${t('then', { name: entry('tithi', tithiNext.index).name })}</span>` : ''}</p>
    <p class="meaning">${te.meaning}</p>
  </div>

  <section aria-labelledby="s-day">
    <h2 id="s-day">${t('sectionDay')}</h2>
    <ul class="tiles">
      ${flags.join('')}
      ${tile(t('labelStar'), 'nakshatra', day.nakshatra)}
      ${tile(t('labelYoga'), 'yoga', day.yoga)}
      ${tile(t('labelKarana'), 'karana', day.karana)}
      <li class="tile"><span class="label">${t('labelWeekday')}</span><h3>${vara.title}</h3><p class="detail">${vara.name}</p></li>
    </ul>
  </section>

  <section aria-labelledby="s-sky">
    <h2 id="s-sky">${t('sectionRhythm')}</h2>
    ${sunArc()}
    <dl class="arc-times num">
      <div><dt>${t('sunrise')}</dt><dd>${time(day.sunrise, loc)}</dd></div>
      <div class="end"><dt>${t('sunset')}</dt><dd>${time(day.sunset, loc)}</dd></div>
    </dl>
    <ul class="wcards">
      ${card('good', t('windowGood'), t('abhijit'), abhijit, day.vara === 3 ? t('notOnWednesdays') : '')}
      ${card('avoid', t('windowAvoid'), t('rahuKaal'), rahuKaal)}
    </ul>
    <ul class="rows windows" style="margin-top:var(--space-sm)">
      ${brahma ? `<li class="row"><span class="swatch w calm"></span><div><h3>${t('brahma')}</h3><p class="detail">${t('windowCalm')}</p></div><span class="when num">${time(brahma.start, loc)}–${time(brahma.end, loc)}</span></li>` : ''}
      <li class="row"><span class="swatch moonmark"></span><div><h3>${t('moonrise')} · ${t('moonset')}</h3><p class="detail num">${time(day.moonrise, loc)} · ${time(day.moonset, loc)}</p></div><span></span></li>
    </ul>
  </section>

  <section aria-labelledby="s-trad">
    <h2 id="s-trad">${t('sectionTradition')}</h2>
    <div class="rhythm"><h3>${t('season', { title: ritu.title, name: ritu.name })}</h3>
      <p class="num">${t('seasonDay', { day: r.rituDay, length: r.rituLength })} · ${ayana.name}</p><p>${ritu.meaning}</p></div>
  </section>

  <p class="footnote">${t('footer', { city: loc.name })} ${sheet('times', { city: loc.name }).split('. ')[1] ?? ''}</p>
</main>
${tabs('day')}
`)
