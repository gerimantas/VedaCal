// Sanskrit period names in yellow (user, 2026-10-24): periodNameHtml wraps exactly the Sanskrit
// parts in <span class="sk"> and stays in step with periodName.
import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { birthOf, dayPeriods, type Period } from '../src/core/periods'
import { addDays } from '../src/core/time'
import { periodName, periodNameHtml } from '../src/ui/verdict'

const VILNIUS = { name: 'Vilnius', country: 'Lithuania', lat: 54.6892, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius' }
const p = (kind: string, detail?: Record<string, unknown>): Period => ({ kind, detail, level: 'neutral', groups: [], decides: false } as unknown as Period)
const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')

describe('periodNameHtml', () => {
  it('wraps a purely Sanskrit name whole', () => {
    expect(periodNameHtml(p('rahuKaal'))).toBe('<span class="sk">Rahu Kaal</span>')
    expect(periodNameHtml(p('ravi'))).toBe('<span class="sk">Ravi yoga</span>')
  })
  it('leaves a Lithuanian name plain', () => {
    expect(periodNameHtml(p('noon'))).toBe(periodName(p('noon')))
    expect(periodNameHtml(p('noon'))).not.toContain('<span')
  })
  it('wraps only the interpolated name of a template kind', () => {
    const html = periodNameHtml(p('pakshaRandhra', { tithi: 13 }))
    expect(html.match(/<span class="sk">/g)).toHaveLength(1)
    expect(html).toContain('Trayodashi</span>')
    expect(html.replace(/<[^>]+>/g, '')).toBe(periodName(p('pakshaRandhra', { tithi: 13 })))
    const base = periodNameHtml(p('base', { vara: 6, tithi: 13, star: 25 }))
    expect(base.match(/<span class="sk">/g)).toHaveLength(3)
  })
  it('does not wrap the Lithuanian planet in a hora', () => {
    const html = periodNameHtml(p('hora', { planet: 'sun' }))
    expect(html).toMatch(/^[^<]+<span class="sk">hora<\/span>$/)
  })
  it('strips to periodName and unescapes to it for every period of several days', () => {
    let n = 0
    for (const date of ['2026-10-20', '2026-10-24', '2026-11-12', '2027-03-05']) {
      const day = computeDay(date, VILNIUS)
      const { periods } = dayPeriods(day, computeDay(addDays(date, -1), VILNIUS), birthOf(new Date('1990-05-17T08:00:00Z')))
      for (const q of periods) {
        const html = periodNameHtml(q)
        expect(unescape(html.replace(/<\/?span[^>]*>/g, ''))).toBe(periodName(q))
        expect(periodName(q)).not.toMatch(/[\u0001\u0002]/)
        n++
      }
    }
    expect(n).toBeGreaterThan(100)
  })
})
