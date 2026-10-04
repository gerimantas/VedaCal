// App state shared by the screens: the chosen location (kept in localStorage — the only
// thing stored, SPEC 6) and the current route.
import type { Place } from './cities'

const KEY = 'vedacal.location'

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

export const app = $state({ location: saved ?? VILNIUS })

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
