// App state shared by the screens: the chosen location and settings (kept in localStorage —
// the only things stored, SPEC 6) and the current route.
import type { Place } from './cities'
import type { Zodiac } from './day'
import { LANG, prefs, type Lang } from './format'

const KEY = 'vedacal.location'
const SETTINGS = 'vedacal.settings'

export const VILNIUS: Place = {
  name: 'Vilnius', country: 'Lithuania', cc: 'LT', region: 'Vilnius', population: 542366,
  lat: 54.6892, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius',
}

function stored(): Place | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return p && typeof p.lat === 'number' && typeof p.lon === 'number' && typeof p.tz === 'string' ? p : null
  } catch {
    return null
  }
}

const saved = stored()

export type Theme = 'system' | 'dark' | 'light'
/** SPEC 5.3. hour12 null = the device's habit until the user picks one; lang null = the device's language. */
type Settings = { zodiac: Zodiac; hour12: boolean | null; theme: Theme; lang: Lang | null }
function storedSettings(): Settings {
  let s: Record<string, unknown> = {}
  try {
    s = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}')
  } catch {
    // Unreadable or blocked storage: defaults.
  }
  return {
    zodiac: s.zodiac === 'western' ? 'western' : 'vedic',
    hour12: typeof s.hour12 === 'boolean' ? s.hour12 : null,
    theme: s.theme === 'dark' || s.theme === 'light' ? s.theme : 'system',
    lang: s.lang === 'en' || s.lang === 'lt' ? s.lang : null,
  }
}

/** Light/dark follows the system unless chosen (tokens.css reads data-theme). */
function applyTheme(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}

const settings = storedSettings()
document.documentElement.lang = LANG
prefs.hour12 = settings.hour12 ?? undefined
applyTheme(settings.theme)

/** `date`: the day the Day screen shows, null = today (so it rolls over at midnight). */
export const app = $state({ location: saved ?? VILNIUS, settings, date: null as string | null })

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  app.settings[key] = value
  prefs.hour12 = app.settings.hour12 ?? undefined
  applyTheme(app.settings.theme)
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(app.settings))
  } catch {
    // Storage blocked: the choice holds until the page closes.
  }
  // Labels are computed once at load in the chosen language (format.ts): reload to switch.
  if (key === 'lang' && value !== LANG) location.reload()
}

/** First visit from outside Vilnius's time zone: ask for a location instead of guessing. */
export const needsLocation = !saved && Intl.DateTimeFormat().resolvedOptions().timeZone !== VILNIUS.tz

export function setLocation(p: Place) {
  app.location = p
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Private mode or storage blocked: the choice still holds until the page closes.
  }
}

export type Route = 'day' | 'month' | 'settings' | 'about'
const ROUTES: Route[] = ['day', 'month', 'settings', 'about']

export const routeFromHash = (hash: string): Route => {
  const r = hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'day'
}
