// P3 mockup — Month screen (SPEC 5.2), filled live from the calculation core. v4 dashboard style.
// Every value comes from src/ui/month.ts, the same view the app's Month.svelte renders.
import { computeMonth } from '../src/core/panchang'
import { t } from '../src/ui/format'
import { keyDateWhen, monthView } from '../src/ui/month'
import { realisticMoon } from '../src/ui/moon'
import { date, icon, link, mount, tabs, today, vilnius as loc } from './common'

const [y, m] = date.split('-').map(Number)
const v = monthView(computeMonth(y, m, loc), loc, today)

const dayLink = (d: string) => {
  const base = link('day.html')
  return `${base}${base.includes('?') ? '&' : '?'}date=${d}`
}

const cells = v.cells.map(
  (c) => `<a class="${['cell', c.rest ? 'rest' : '', c.today ? 'today' : ''].filter(Boolean).join(' ')}" href="${dayLink(c.date)}" aria-label="${c.label}">
    ${c.ekadashi ? '<span class="dot"></span>' : ''}
    <span class="d num">${c.n}</span>
    ${realisticMoon(c.illumination, c.waxing, 24, '')}
  </a>`,
)

mount(`
<main class="screen">
  <header class="appbar">
    <a class="chip" href="${link('location.html')}">${icon.navigate}<span>${loc.name}, LT</span></a>
  </header>
  <div class="card month-head">
    <button class="icon-btn" aria-label="${t('previousMonth')}">${icon.left}</button>
    <h1>${v.title}</h1>
    <button class="icon-btn" aria-label="${t('nextMonth')}">${icon.right}</button>
  </div>

  <div class="grid">
    ${v.weekdays.map((w) => `<span class="dow" aria-hidden="true">${w}</span>`).join('')}
    ${'<span></span>'.repeat(v.lead)}
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
    ${v.events
      .map(
        (e) => `<li><a class="card event ${e.cls}" href="${dayLink(e.date)}" style="color:inherit;text-decoration:none">${e.svg}
          <div><b>${e.title}</b><small>${e.sub}</small></div>
          <span class="when num">${keyDateWhen(e, loc)}</span></a></li>`,
      )
      .join('')}
  </ul>
</main>
${tabs('month')}
`)
