// P3 mockup — Day screen (SPEC 5.1), filled live from the calculation core.
import { computeDay } from '../src/core/panchang'
import { content, entry, moonSvg, percent, progress, sheet, t, time, until } from '../src/ui/format'
import { date, icon, link, mount, tabs, today, vilnius as loc } from './common'

const day = computeDay(date, loc)
const now = date === today ? new Date() : day.sunrise ?? new Date(`${date}T12:00:00Z`)

const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.tz }).format(
  day.sunrise ?? new Date(`${date}T12:00:00Z`),
)

const tithi = day.tithi[0]
const tithiNext = day.tithi[1]
const te = entry('tithi', tithi.index)
const state = t(day.moon.waxing ? 'stateWaxing' : 'stateWaning')

/** One row of the element list: plain-English title first, Sanskrit name second. */
function row(label: string, group: 'nakshatra' | 'yoga' | 'karana', spans: typeof day.yoga, extra = '') {
  const [first, next] = spans
  const e = entry(group, first.index)
  const then = next ? ` · <span class="then">${t('then', { name: entry(group, next.index).name })}</span>` : ''
  return `<li class="row"><span class="label">${label}</span><div>
      <h3>${e.title}</h3>
      <p class="detail">${e.name}${extra} · <span class="num">${until(first.end, day, loc)}</span>${then}</p>
    </div></li>`
}

// Timeline: from the start of Brahma Muhurta to sunset.
const { brahma, abhijit, rahuKaal } = day.windows
const t0 = (brahma?.start ?? day.sunrise)!.getTime()
const t1 = day.sunset!.getTime()
const pos = (d: Date) => `${(((d.getTime() - t0) / (t1 - t0)) * 100).toFixed(2)}%`
const bar = (w: { start: Date; end: Date } | null, kind: string) =>
  w ? `<span class="w ${kind}" style="left:${pos(w.start)};width:calc(${pos(w.end)} - ${pos(w.start)})"></span>` : ''
const nowMark = now.getTime() > t0 && now.getTime() < t1 ? `<span class="now" style="left:${pos(now)}" title="${t('now')}"></span>` : ''

const windowRow = (name: string, kind: string, label: string, w: { start: Date; end: Date } | null) =>
  w
    ? `<li class="row"><span class="swatch w ${kind}" style="position:static"></span><div><h3>${name}</h3><p class="detail">${label}</p></div>
       <span class="when num">${time(w.start, loc)}–${time(w.end, loc)}</span></li>`
    : ''

// Traditional rhythm cards.
const r = day.rhythm
const ritu = content.rhythm[`ritu${r.ritu}` as 'ritu1']
const ayana = content.rhythm[r.ayana]
const cards: string[] = []
if (day.ekadashi) cards.push(`<div class="rhythm"><span class="flag">${content.rhythm.ekadashi.name}</span><h3>${content.rhythm.ekadashi.title}</h3><p>${content.rhythm.ekadashi.meaning}</p></div>`)
if (r.restDay) {
  const rest = content.rhythm[r.restDay === 'fullMoon' ? 'restFullMoon' : 'restNewMoon']
  cards.push(`<div class="rhythm"><span class="flag">${t('restDay')}</span><h3>${rest.title}</h3><p>${rest.meaning}</p></div>`)
}
cards.push(`<div class="rhythm"><h3>${t('season', { title: ritu.title, name: ritu.name })}</h3>
  <p class="num">${t('seasonDay', { day: r.rituDay, length: r.rituLength })} · ${ayana.name}</p><p>${ritu.meaning}</p></div>`)

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

  <div class="hero">
    ${moonSvg(day.moon.illumination, day.moon.waxing, 104, t('lit', { state, percent: percent(day.moon.illumination) }))}
    <div>
      <h2>${te.title}</h2>
      <p class="sanskrit">${te.name}</p>
      <p class="phase num">${t('lit', { state, percent: percent(day.moon.illumination) })}</p>
    </div>
  </div>
  <div class="track" aria-hidden="true"><span style="width:${(progress(tithi, now) * 100).toFixed(1)}%"></span></div>
  <p class="track-label num"><span>${until(tithi.end, day, loc)}</span>${tithiNext ? `<span>${t('then', { name: entry('tithi', tithiNext.index).name })}</span>` : ''}</p>
  <p class="meaning">${te.meaning}</p>

  <section aria-labelledby="s-day">
    <h2 id="s-day">${t('sectionDay')}</h2>
    <ul class="rows">
      ${row(t('labelStar'), 'nakshatra', day.nakshatra, ` · ${t('pada', { pada: day.nakshatra[0].pada })}`)}
      ${row(t('labelYoga'), 'yoga', day.yoga)}
      ${row(t('labelKarana'), 'karana', day.karana)}
      <li class="row"><span class="label">${t('labelWeekday')}</span><div><h3>${entry('vara', day.vara).title}</h3><p class="detail">${entry('vara', day.vara).name}</p></div></li>
    </ul>
  </section>

  <section aria-labelledby="s-sky">
    <h2 id="s-sky">${t('sectionSky')}</h2>
    <dl class="times num">
      <div><dt>${t('sunrise')}</dt><dd>${time(day.sunrise, loc)}</dd></div>
      <div><dt>${t('sunset')}</dt><dd>${time(day.sunset, loc)}</dd></div>
      <div><dt>${t('moonrise')}</dt><dd>${time(day.moonrise, loc)}</dd></div>
      <div><dt>${t('moonset')}</dt><dd>${time(day.moonset, loc)}</dd></div>
    </dl>
  </section>

  <section aria-labelledby="s-rhythm">
    <h2 id="s-rhythm">${t('sectionRhythm')}</h2>
    <div class="timeline" role="img" aria-label="${t('sectionRhythm')}">${bar(brahma, 'calm')}${bar(abhijit, 'good')}${bar(rahuKaal, 'avoid')}${nowMark}</div>
    <div class="axis num"><span>${time(new Date(t0), loc)}</span><span>${t('sunset')} ${time(day.sunset, loc)}</span></div>
    <ul class="rows windows" style="margin-top:var(--space-sm)">
      ${windowRow(t('brahma'), 'calm', t('windowCalm'), brahma)}
      ${windowRow(t('abhijit'), 'good', t('windowGood'), abhijit)}
      ${windowRow(t('rahuKaal'), 'avoid', t('windowAvoid'), rahuKaal)}
    </ul>
  </section>

  <section aria-labelledby="s-trad">
    <h2 id="s-trad">${t('sectionTradition')}</h2>
    ${cards.join('')}
  </section>

  <p class="footnote">${t('footer', { city: loc.name })} ${sheet('times', { city: loc.name }).split('. ')[1] ?? ''}</p>
</main>
${tabs('day')}
`)
