import { describe, expect, it } from 'vitest'
import { Observer } from 'astronomy-engine'
// Deep import on purpose: the package root also loads kundli/exporter.js, which needs Node's `fs`.
import { getPanchangam } from '@ishubhamx/panchangam-js/dist/core/panchangam'

// Reference: drikpanchang.com, Vilnius, 2026-10-04 (see .planning/SPEC.md section 4.9)
describe('panchangam-js smoke check — Vilnius 2026-10-04', () => {
  const vilnius = new Observer(54.68889, 25.27972, 98)
  const p = getPanchangam(new Date('2026-10-04T09:00:00Z'), vilnius, { timezoneOffset: 180 })

  // The library's indexes are 0-based although its types say "1-30" — the P1 adapter converts.
  it('has Krishna Navami at sunrise (library index 23 = tithi 24)', () => {
    expect(p.tithi).toBe(23)
    expect(p.paksha).toBe('Krishna')
    expect(p.tithis[0].name).toBe('Navami')
  })

  it('has sunrise within 1 minute of Drik (07:26 EEST = 04:26 UTC)', () => {
    const drik = Date.parse('2026-10-04T04:26:00Z')
    expect(Math.abs(p.sunrise!.getTime() - drik)).toBeLessThan(60_000)
  })
})
