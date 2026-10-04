// P1 gate: our Ekadashi days must equal Drik's Smarta (household) days.
// 2026 was used to find the rule (SPEC 4.7); 2027 is the hold-out check.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeMonth } from '../src/core/panchang'
import { CITIES, type CityKey } from '../scripts/cities'

const cases = (Object.keys(CITIES) as CityKey[]).flatMap((city) => [2026, 2027].map((year) => [city, year] as const))

describe.each(cases)('Ekadashi — %s %i', (city, year) => {
  it('matches every Drik Smarta date', () => {
    const c = CITIES[city]
    const ref = JSON.parse(readFileSync(`tests/fixtures/ekadashi/${city}-${year}.json`, 'utf8'))
    const expected: string[] = ref.ekadashis.map((e: { smarta: string }) => e.smarta).filter((d: string) => d?.startsWith(String(year)))
    const loc = { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
    const ours = Array.from({ length: 12 }, (_, m) => computeMonth(year, m + 1, loc))
      .flat()
      .filter((d) => d.ekadashi)
      .map((d) => d.date)
    expect(ours).toEqual(expected)
  })
})
