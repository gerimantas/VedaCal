// P3 mockup — Month screen (SPEC 5.2), filled live from the calculation core.
import { computeMonth } from '../src/core/panchang'
import { content, entry, moonSvg, t, time } from '../src/ui/format'
import { date, icon, link, mount, tabs, today, vilnius as loc } from './common'

const [y, m] = date.split('-').map(Number)
const days = computeMonth(y, m, loc)
const title = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)))

// Monday-first grid (ISO week, as in Lithuania); leading blanks for the first weekday.
const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
const weekdays = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 5 + i))),
)

const cells = days.map((d) => {
  const n = Number(d.date.slice(8))
  const tithi = d.tithi[0]?.index ?? 0
  const classes = ['cell', d.rhythm.restDay ? 'rest' : '', d.date === today ? 'today' : ''].filter(Boolean).join(' ')
  const label = `${d.date}: ${tithi ? entry('tithi', tithi).name : ''}${d.ekadashi ? ', Ekadashi' : ''}${d.rhythm.restDay ? `, ${t('restDay')}` : ''}`
  return `<a class="${classes}" href="${link('day.html')}${link('day.html').includes('?') ? '&' : '?'}date=${d.date}" aria-label="${label}">
    ${d.ekadashi ? '<span class="dot"></span>' : ''}
    <span class="d num">${n}</span>
    ${moonSvg(d.moon.illumination, d.moon.waxing, 18, '')}
    <span class="ti num">${tithi > 15 && tithi < 30 ? tithi - 15 : tithi}</span>
  </a>`
})

// Key dates: moon phases, Ekadashi, season and half-year changes.
const short = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: loc.tz })
const events: { at: Date; html: string }[] = []
for (const d of days) {
  const noon = new Date(`${d.date}T12:00:00Z`)
  if (d.newMoon) events.push({ at: d.newMoon, html: `<h3>${t('newMoon')}</h3><p class="detail num">${time(d.newMoon, loc)} · ${entry('tithi', 30).name}</p>` })
  if (d.fullMoon) events.push({ at: d.fullMoon, html: `<h3>${t('fullMoon')}</h3><p class="detail num">${time(d.fullMoon, loc)} · ${entry('tithi', 15).name}</p>` })
  if (d.ekadashi) events.push({ at: noon, html: `<h3>${content.rhythm.ekadashi.title}</h3><p class="detail">${entry('tithi', d.tithi[0].index).name}</p>` })
  for (const e of d.rhythm.events) {
    const what = e.kind === 'ayana' ? content.rhythm[d.rhythm.ayana === 'uttarayana' ? 'dakshinayana' : 'uttarayana'] : null
    events.push({ at: e.at, html: e.kind === 'ritu' ? `<h3>A new season begins</h3><p class="detail num">${time(e.at, loc)}</p>` : `<h3>${what!.title}</h3><p class="detail num">${time(e.at, loc)}</p>` })
  }
}
events.sort((a, b) => a.at.getTime() - b.at.getTime())

mount(`
<main class="screen">
  <header class="topbar">
    <a class="place" href="${link('location.html')}">${icon.pin}<span>${loc.name}</span>${icon.down}</a>
  </header>
  <div class="month-head">
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
    <span><i style="background:var(--color-paper-2)"></i>${t('legendRest')}</span>
    <span><i style="background:var(--color-accent);border-radius:50%;width:6px;height:6px"></i>${t('legendEkadashi')}</span>
    <span><i style="box-shadow:inset 0 0 0 1px var(--color-muted)"></i>${t('legendToday')}</span>
  </p>

  <section aria-labelledby="s-month">
    <h2 id="s-month">${t('sectionMonth')}</h2>
    <ul class="rows events">
      ${events.map((e) => `<li class="row"><span class="label num">${short.format(e.at)}</span><div>${e.html}</div></li>`).join('')}
    </ul>
  </section>
</main>
${tabs('month')}
`)
