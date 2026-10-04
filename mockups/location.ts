// P3 mockup — Location picker (SPEC 6). The city list is a fixed sample here;
// P4 replaces it with the GeoNames search.
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
  <header class="topbar">
    <a class="icon-btn" href="${link('day.html')}" aria-label="${t('back')}">${icon.left}</a>
  </header>
  <h1 style="font-size:var(--text-2xl);margin-top:var(--space-2xs)">${t('location')}</h1>

  <label class="search">${icon.search}<input type="search" placeholder="${t('searchCity')}" autocomplete="off" /></label>
  <button class="gps">${icon.locate}<span>${t('useMyLocation')}</span></button>

  <ul class="rows cities" role="listbox" aria-label="${t('location')}" style="margin-top:var(--space-md)">
    ${sample
      .map(
        (c) => `<li class="row" role="option" aria-selected="${c.selected ? 'true' : 'false'}">
          <div><h3>${c.name}</h3><p class="detail">${c.country}</p></div>
          <span class="quiet num">${localTime(c.tz)}</span>
        </li>`,
      )
      .join('')}
  </ul>
  <p class="footnote">Mockup: a fixed sample list. The real search covers every city above 15,000 people, works offline, and uses GeoNames data (CC BY 4.0).</p>
</main>
${tabs('settings')}
`)
