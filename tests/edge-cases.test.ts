import { describe, expect, it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import { KARANA_NAMES, type Location } from '../src/core/types'

const place = (name: string, lat: number, lon: number, tz: string): Location => ({ name, country: '', lat, lon, elevation: 0, tz })
const tromso = place('Tromsø', 69.6496, 18.956, 'Europe/Oslo')
const auckland = place('Auckland', -36.8485, 174.7633, 'Pacific/Auckland')
const vilnius = place('Vilnius', 54.68916, 25.2798, 'Europe/Vilnius')

describe('polar day and night (SPEC 4.3)', () => {
  it.each(['2026-12-21', '2026-06-21'])('Tromsø %s: no sunrise, no crash, moon data still there', (date) => {
    const day = computeDay(date, tromso)
    expect(day.sunrise).toBeNull()
    expect(day.windows.rahuKaal).toBeNull()
    expect(day.windows.abhijit).toBeNull()
    expect(day.moon.illumination).toBeGreaterThanOrEqual(0)
    expect(day.rhythm.ritu).toBeGreaterThanOrEqual(1)
  })
})

describe('location time zone, not device', () => {
  it('Auckland sunrise falls on the requested civil date there', () => {
    const day = computeDay('2026-10-05', auckland)
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: auckland.tz }).format(day.sunrise!)
    expect(local).toBe('2026-10-05')
  })
})

describe('spans', () => {
  it.each(['2026-10-02', '2026-10-10', '2026-10-18', '2026-10-25'])('%s: every element is contiguous and covers sunrise → next sunrise', (date) => {
    const day = computeDay(date, vilnius)
    for (const el of ['tithi', 'nakshatra', 'yoga', 'karana'] as const) {
      const spans = day[el]
      expect(spans[0].start.getTime()).toBeLessThanOrEqual(day.sunrise!.getTime())
      expect(spans.at(-1)!.end.getTime()).toBeGreaterThanOrEqual(day.nextSunrise!.getTime())
      for (let i = 1; i < spans.length; i++) expect(spans[i].start).toEqual(spans[i - 1].end)
    }
  })

  it('karanas around a new moon follow the fixed order (Shakuni, Chatushpada, Naga, Kimstughna, Bava)', () => {
    const names = ['2026-10-09', '2026-10-10'].flatMap((d) => computeDay(d, vilnius).karana.map((k) => KARANA_NAMES[k.index - 1]))
    const seq = [...new Set(names)]
    const from = seq.indexOf('Shakuni')
    expect(seq.slice(from, from + 5)).toEqual(['Shakuni', 'Chatushpada', 'Naga', 'Kimstughna', 'Bava'])
  })
})
