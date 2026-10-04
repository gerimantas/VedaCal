// App state shared by the screens: the chosen location and settings (kept in localStorage —
// the only things stored, SPEC 6) and the current route.
import type { Place } from './cities'
import type { Zodiac } from './day'

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

type Settings = { zodiac: Zodiac }
function storedSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS) ?? '{}')
    return { zodiac: s.zodiac === 'western' ? 'western' : 'vedic' }
  } catch {
    return { zodiac: 'vedic' }
  }
}

export const app = $state({ location: saved ?? VILNIUS, settings: storedSettings() })

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  app.settings[key] = value
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(app.settings))
  } catch {
    // Storage blocked: the choice holds until the page closes.
  }
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
