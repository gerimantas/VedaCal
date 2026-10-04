// Shared mockup scaffolding: theme and date from the URL, icons, the bottom tab bar.
// Mockups run on the dev server only (`npm run dev` → /VedaCal/mockups/).
import { civilDate } from '../src/core/time'
import type { Location } from '../src/core/types'

export const params = new URLSearchParams(location.search)
const theme = params.get('theme')
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme

export const vilnius: Location = { name: 'Vilnius', country: 'Lithuania', lat: 54.68916, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius' }

/** ?date=YYYY-MM-DD, otherwise today in Vilnius. */
export const today = civilDate(vilnius.tz, new Date())
export const date = params.get('date') ?? today

const stroke = (d: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

export const icon = {
  left: stroke('<path d="M15 5l-7 7 7 7"/>'),
  right: stroke('<path d="M9 5l7 7-7 7"/>'),
  pin: stroke('<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>', 18),
  down: stroke('<path d="M7 10l5 5 5-5"/>', 16),
  day: stroke('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  month: stroke('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  settings: stroke('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  search: stroke('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 18),
  locate: stroke('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', 18),
}

const keep = (page: string) => {
  const q = new URLSearchParams(params)
  return `${page}${q.size ? `?${q}` : ''}`
}

export function tabs(current: 'day' | 'month' | 'settings'): string {
  const tab = (id: typeof current, href: string, label: string) =>
    `<a href="${keep(href)}"${id === current ? ' aria-current="page"' : ''}>${icon[id]}<span>${label}</span></a>`
  return `<nav class="tabs" aria-label="Main">${tab('day', 'day.html', 'Day')}${tab('month', 'month.html', 'Month')}${tab('settings', 'location.html', 'Settings')}</nav>`
}

export const link = keep

export function mount(html: string) {
  document.getElementById('app')!.innerHTML = html
}
