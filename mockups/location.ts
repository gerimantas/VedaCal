// P3 mockup — Location picker (SPEC 6), v4 dashboard style. The city list is a fixed
// sample here; P4 replaces it with the GeoNames search.
import { t } from '../src/ui/format'
import { icon, link, mount, tabs } from './common'

const sample = [
  { name: 'Vilnius', country: 'Lithuania', tz: 'Europe/Vilnius', selected: true },
  { name: 'Kaunas', country: 'Lithuania', tz: 'Europe/Vilnius' },
  { name: 'Klaipėda', country: 'Lithuania', tz: 'Europe/Vilnius' },
  { name: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { name: 'New York', country: 'United States', tz: 'America/New_York' },
  { name: 'New Delhi', country: 'India', tz: 'Asia/Kolkata' },
  { name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
]
const localTime = (tz: string) => new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: tz }).format(new Date())

mount(`
<main class="screen">
  <header class="appbar">
    <a class="chip" href="${link('day.html')}" aria-label="${t('back')}">${icon.left}<span>${t('back')}</span></a>
  </header>
  <h1 class="page-title">${t('location')}</h1>

  <label class="card search">${icon.search}<input type="search" placeholder="${t('searchCity')}" autocomplete="off" /></label>
  <button class="gps">${icon.locate}<span>${t('useMyLocation')}</span></button>

  <ul class="cities" role="listbox" aria-label="${t('location')}">
    ${sample
      .map(
        (c) => `<li class="card city" role="option" aria-selected="${c.selected ? 'true' : 'false'}">
          ${icon.pin}<div><b>${c.name}</b><small>${c.country}</small></div>
          <span class="quiet num">${localTime(c.tz)}</span>
        </li>`,
      )
      .join('')}
  </ul>
  <p class="footnote">Mockup: a fixed sample list. The real search covers every city above 15,000 people, works offline, and uses GeoNames data (CC BY 4.0).</p>
</main>
${tabs('settings')}
`)
