// P5 gate (.planning/PLAN.md): October 2026 for Vilnius shows the same new moon, full moon and
// Ekadashi days as Drik; the month summary agrees with the full day calculation.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay, computeMonth } from '../src/core/panchang'
import { prefs, time } from '../src/ui/format'
import { monthView, shiftMonth } from '../src/ui/month'
import { moonWave } from '../src/ui/wave'
import { CITIES } from '../scripts/cities'

const c = CITIES.vilnius
const loc = { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
const drik = (date: string) => JSON.parse(readFileSync(`tests/fixtures/drik/vilnius-${date}.json`, 'utf8'))
const days = computeMonth(2026, 10, loc)
const view = monthView(days, loc, '2026-10-05')
const near = (a: Date, iso: string) => expect(Math.abs(a.getTime() - Date.parse(iso)), `${a.toISOString()} vs ${iso}`).toBeLessThanOrEqual(2 * 60_000)

describe('October 2026, Vilnius, against Drik', () => {
  it('new moon: the end of Amavasya on Drik (Oct 10)', () => {
    const nm = days.filter((d) => d.newMoon)
    expect(nm.map((d) => d.date)).toEqual(['2026-10-10'])
    near(nm[0].newMoon!, drik('2026-10-10').tithi.find((x: { name: string }) => x.name === 'Amavasya').end)
  })

  it('full moon: the end of Purnima on Drik (Oct 26, 06:11)', () => {
    const fm = days.filter((d) => d.fullMoon)
    expect(fm.map((d) => d.date)).toEqual(['2026-10-26'])
    near(fm[0].fullMoon!, drik('2026-10-25').tithi.find((x: { name: string }) => x.name === 'Purnima').end)
  })

  it("Ekadashi days: Drik's Smarta dates", () => {
    const ref = JSON.parse(readFileSync('tests/fixtures/ekadashi/vilnius-2026.json', 'utf8'))
    const drikOct = ref.ekadashis.map((e: { smarta: string }) => e.smarta).filter((d: string) => d.startsWith('2026-10'))
    expect(view.cells.filter((x) => x.ekadashi).map((x) => x.date)).toEqual(drikOct)
    expect(view.events.filter((e) => e.cls === 'ekadashi').map((e) => e.date)).toEqual(drikOct)
  })

  it('grid: 31 days, starting on Thursday (3 blanks in a Monday-first week)', () => {
    expect(view.cells).toHaveLength(31)
    expect(view.lead).toBe(3)
    expect(view.cells.find((x) => x.today)?.date).toBe('2026-10-05')
  })
})

it('the month summary agrees with computeDay for every day', () => {
  for (const d of days) {
    const full = computeDay(d.date, loc)
    expect({ ...d, tithi: undefined }, d.date).toEqual({
      date: full.date, moon: full.moon, ekadashi: full.ekadashi, newMoon: full.newMoon, fullMoon: full.fullMoon, rhythm: full.rhythm, marks: full.marks, tithi: undefined,
    })
    expect(d.tithi, d.date).toBe(full.tithi[0].index)
  }
})

it('moves between months across a year end', () => {
  expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  expect(shiftMonth('2026-01', -1)).toBe('2025-12')
})

it('formats times 12- or 24-hour as set', () => {
  const at = new Date('2026-10-05T15:30:00Z') // 18:30 in Vilnius
  prefs.hour12 = false
  expect(time(at, loc)).toMatch(/18[:.]30/)
  prefs.hour12 = true
  expect(time(at, loc)).toMatch(/6[:.]30\s?PM/i)
  prefs.hour12 = undefined
})

describe("the Moon's light curve, October 2026, Vilnius", () => {
  const wave = moonWave(days, '2026-10-05')
  const dayOf = (x: number) => days[Math.floor(x)].date

  it('dips to new moon and peaks at full moon on the days Drik gives', () => {
    expect(wave.phases.filter((p) => p.kind === 'new').map((p) => dayOf(p.x))).toEqual(['2026-10-10'])
    expect(wave.phases.filter((p) => p.kind === 'full').map((p) => dayOf(p.x))).toEqual(['2026-10-26'])
  })

  it('places each turn within an hour of the exact moment', () => {
    for (const p of wave.phases) {
      const d = days[Math.floor(p.x)]
      const at = (p.kind === 'new' ? d.newMoon : d.fullMoon)!
      const local = new Date(at.toLocaleString('en-US', { timeZone: loc.tz }))
      const hours = local.getHours() + local.getMinutes() / 60
      expect(Math.abs((p.x % 1) * 24 - hours), `${d.date} ${p.kind}`).toBeLessThan(1)
    }
  })

  it('agrees with the lit share shown for each day, to 1 %', () => {
    for (const [i, d] of days.entries()) expect(Math.abs(wave.lit(i + 0.5) - d.moon.illumination), d.date).toBeLessThan(0.01)
  })

  it('draws one mark per Ekadashi, Pushya and eclipse day, a band per rest day, and today', () => {
    const count = (cls: string) => wave.svg.split(`class="${cls}"`).length - 1
    expect(count('ekadashi')).toBe(days.filter((d) => d.ekadashi).length)
    expect(count('favoured')).toBe(days.filter((d) => d.marks.some((m) => m.kind === 'pushya')).length)
    expect(count('eclipse')).toBe(days.filter((d) => d.marks.some((m) => m.kind === 'eclipse')).length)
    expect(count('rest')).toBe(days.filter((d) => d.rhythm.restDay).length)
    expect(count('today')).toBe(1)
    expect(count('hit')).toBe(31)
  })
})
