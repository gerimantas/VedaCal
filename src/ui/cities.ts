// City search over the bundled GeoNames list (src/data/cities.json, built by
// scripts/build-cities.ts). Works offline: the list ships with the app and is loaded only
// when the location screen opens (SPEC 6).
import type { Location } from '../core/types'

/** A Location plus what the picker shows: country code for the header chip, region to tell same-named cities apart. */
export type Place = Location & { cc: string; region: string; population: number }

type Row = [name: string, country: number, region: number, lat: number, lon: number, elevation: number, tz: number, population: number]
export type CityData = { countries: string[][]; regions: string[]; zones: string[]; cities: Row[] }

// Letters that are not a base letter plus an accent, so NFD leaves them alone.
const LETTERS: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', ß: 'ss', đ: 'd', ð: 'd', þ: 'th', ı: 'i' }

/** Lower case, accents removed: "Klaipėda" matches "klaipeda", "Tromsø" matches "tromso". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[øæœłßđðþı]/g, (c) => LETTERS[c])

export type CityIndex = { places: Place[]; names: string[] }

export function buildIndex(data: CityData): CityIndex {
  const places = data.cities.map(([name, c, r, lat, lon, elevation, tz, population]): Place => {
    const [cc, country] = data.countries[c]
    return { name, country, cc, region: data.regions[r], lat, lon, elevation, tz: data.zones[tz], population }
  })
  return { places, names: places.map((p) => fold(p.name)) }
}

let loading: Promise<CityIndex> | undefined
/** The list is a separate chunk (~800 KB gzipped), fetched on first use and cached by the PWA. */
export function loadCities(): Promise<CityIndex> {
  return (loading ??= import('../data/cities.json').then((m) => buildIndex(m.default as unknown as CityData)))
}

/**
 * Cities whose name starts with the query, then cities with a later word that does
 * ("york" → New York City). The list is sorted by population, so big cities come first.
 */
export function search(index: CityIndex, query: string, limit = 20): Place[] {
  const q = fold(query.trim())
  if (!q) return []
  const first: Place[] = [], later: Place[] = []
  for (let i = 0; i < index.names.length && first.length < limit; i++) {
    const n = index.names[i]
    if (n.startsWith(q)) first.push(index.places[i])
    else if (later.length < limit && n.includes(` ${q}`)) later.push(index.places[i])
  }
  return [...first, ...later].slice(0, limit)
}

/**
 * The city a point belongs to (for "Use my location"). Plain nearest is wrong inside big
 * cities — a GeoNames city is one point, so midtown Manhattan is closer to Hoboken's point
 * than to New York City's. Distance is weighed by population^¼: a much larger city wins
 * at similar distances, but standing in a small town still names that town.
 */
export function nearest(index: CityIndex, lat: number, lon: number): Place {
  const rad = Math.PI / 180
  let best = index.places[0], bestScore = Infinity
  for (const p of index.places) {
    // Equirectangular distance is plenty at city scale.
    const x = (p.lon - lon) * rad * Math.cos(((p.lat + lat) / 2) * rad)
    const y = (p.lat - lat) * rad
    const score = (x * x + y * y) / Math.sqrt(p.population || 1)
    if (score < bestScore) (best = p), (bestScore = score)
  }
  return best
}

/** Largest cities in a time zone — what the picker offers before anything is typed. */
export const inZone = (index: CityIndex, tz: string, limit = 6) => index.places.filter((p) => p.tz === tz).slice(0, limit)
