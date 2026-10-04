// P3 mockup — Month screen (SPEC 5.2), filled live from the calculation core. v4 dashboard style.
import { computeMonth } from '../src/core/panchang'
import { content, entry, t, time } from '../src/ui/format'
import { realisticMoon } from '../src/ui/moon'
import { date, icon, link, mount, tabs, today, vilnius as loc } from './common'

const [y, m] = date.split('-').map(Number)
const days = computeMonth(y, m, loc)
const title = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)))

// Monday-first grid (ISO week, as in Lithuania); leading blanks for the first weekday.
const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
const weekdays = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + i))),
)

const dayLink = (d: string) => {
  const base = link('day.html')
  return `${base}${base.includes('?') ? '&' : '?'}date=${d}`
}

const cells = days.map((d) => {
  const n = Number(d.date.slice(8))
  const tithi = d.tithi[0]?.index ?? 0
  const classes = ['cell', d.rhythm.restDay ? 'rest' : '', d.date === today ? 'today' : ''].filter(Boolean).join(' ')
  const label = `${d.date}: ${tithi ? entry('tithi', tithi).name : ''}${d.ekadashi ? ', Ekadashi' : ''}${d.rhythm.restDay ? `, ${t('restDay')}` : ''}`
  return `<a class="${classes}" href="${dayLink(d.date)}" aria-label="${label}">
    ${d.ekadashi ? '<span class="dot"></span>' : ''}
    <span class="d num">${n}</span>
    ${realisticMoon(d.moon.illumination, d.moon.waxing, 24, '')}
  </a>`
})

// Key dates: moon phases, Ekadashi, season and half-year changes — plain English first.
const ekadashiTitle = content.rhythm.ekadashi.title.split(' — ')[1] ?? 'Ekadashi'
const lighterDay = ekadashiTitle[0].toUpperCase() + ekadashiTitle.slice(1)
const short = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: loc.tz })
type Ev = { at: Date; date: string; svg: string; cls: string; title: string; sub: string; when: string }
const events: Ev[] = []
for (const d of days) {
  const noon = new Date(`${d.date}T12:00:00Z`)
  if (d.newMoon) events.push({ at: d.newMoon, date: d.date, svg: icon.newMoon, cls: '', title: t('newMoon'), sub: 'Amavasya', when: time(d.newMoon, loc) })
  if (d.fullMoon) events.push({ at: d.fullMoon, date: d.date, svg: icon.fullMoon, cls: '', title: t('fullMoon'), sub: 'Purnima', when: time(d.fullMoon, loc) })
  if (d.ekadashi) events.push({ at: noon, date: d.date, svg: icon.leaf, cls: 'ekadashi', title: lighterDay, sub: 'Ekadashi', when: '' })
  for (const e of d.rhythm.events) {
    const next = e.kind === 'ritu' ? content.rhythm[`ritu${(d.rhythm.ritu % 6) + 1}` as 'ritu1'] : content.rhythm[d.rhythm.ayana === 'uttarayana' ? 'dakshinayana' : 'uttarayana']
    events.push({ at: e.at, date: d.date, svg: icon.season, cls: '', title: e.kind === 'ritu' ? `${next.title} begins` : next.title, sub: next.name, when: time(e.at, loc) })
  }
}
events.sort((a, b) => a.at.getTime() - b.at.getTime())

mount(`
<main class="screen">
  <header class="appbar">
    <a class="chip" href="${link('location.html')}">${icon.navigate}<span>${loc.name}, LT</span></a>
  </header>
  <div class="card month-head">
    <button class="icon-btn" aria-label="${t('previousMonth')}">${icon.left}</button>
    <h1>${title}</h1>
    <button class="icon-btn" aria-label="${t('nextMonth')}">${icon.right}</button>
  </div>

  <div class="grid">
    ${weekdays.map((w) => `<span class="dow" aria-hidden="true">${w}</span>`).join('')}
    ${'<span></span>'.repeat(lead)}
    ${cells.join('')}
  </div>
  <p class="legend">
    <span>${realisticMoon(0.6, true, 14, '')}${t('legendMoonShape')}</span>
    <span><i style="background:var(--color-paper-3);border:1px solid var(--color-card-line)"></i>${t('legendRest')}</span>
    <span><i style="background:var(--color-accent);border-radius:50%;width:6px;height:6px"></i>${t('legendEkadashi')} <span class="sk">Ekadashi</span></span>
    <span><i style="border:1px solid var(--color-moon)"></i>${t('legendToday')}</span>
  </p>

  <h2 class="section-title">${t('keyDates')}</h2>
  <ul class="events">
    ${events
      .map(
        (e) => `<li><a class="card event ${e.cls}" href="${dayLink(e.date)}" style="color:inherit;text-decoration:none">${e.svg}
          <div><b>${e.title}</b><small>${e.sub}</small></div>
          <span class="when num">${short.format(e.at)}${e.when ? ` · ${e.when}` : ''}</span></a></li>`,
      )
      .join('')}
  </ul>
</main>
${tabs('month')}
`)
