// Shared mockup scaffolding: theme and date from the URL, icons, the bottom tab bar.
// Mockups run on the dev server only (`npm run dev` → /VedaCal/mockups/).
import { civilDate } from '../src/core/time'
import type { Location } from '../src/core/types'
import { sheet, t } from '../src/ui/format'
import { icon } from '../src/ui/icons'
import { terms, type Term } from '../src/ui/terms'
import { versionBadge } from './version'

export { icon, terms, type Term }

export const params = new URLSearchParams(location.search)
const theme = params.get('theme')
if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme

export const vilnius: Location = { name: 'Vilnius', country: 'Lithuania', lat: 54.68916, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius' }

/** ?date=YYYY-MM-DD, otherwise today in Vilnius. */
export const today = civilDate(vilnius.tz, new Date())
export const date = params.get('date') ?? today

const keep = (page: string) => {
  const q = new URLSearchParams(params)
  return `${page}${q.size ? `?${q}` : ''}`
}

export function tabs(current: 'day' | 'month' | 'settings' | 'about'): string {
  const tab = (id: typeof current, href: string, label: string) =>
    `<a href="${keep(href)}"${id === current ? ' aria-current="page"' : ''}>${icon[id]}<span>${label}</span></a>`
  return `<nav class="tabs" aria-label="Main">${tab('day', 'day.html', 'Day')}${tab('month', 'month.html', 'Month')}${tab('settings', 'location.html', 'Settings')}${tab('about', 'about.html', 'About')}</nav>`
}

export const link = keep

/** Tapping anything marked data-sheet="<term>" opens its explanation as a bottom sheet. */
function sheets() {
  const dialog = document.createElement('dialog')
  dialog.className = 'sheet'
  document.body.append(dialog)
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-sheet]')
    if (e.target === dialog || (e.target as HTMLElement).closest('.sheet-close')) return dialog.close()
    if (!el || dialog.contains(el)) return
    const key = el.dataset.sheet as Term
    const [name, sanskrit] = terms[key]
    dialog.innerHTML = `<div class="sheet-body">
      <h3>${name}${sanskrit ? ` <span class="sk">${sanskrit}</span>` : ''}</h3>
      <p>${sheet(key)}</p>
      <button class="sheet-close">${t('close')}</button>
    </div>`
    dialog.showModal()
  })
}

export function mount(html: string) {
  document.getElementById('app')!.innerHTML = html + versionBadge()
  sheets()
}
