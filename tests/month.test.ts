// P5 gate (.planning/PLAN.md): October 2026 for Vilnius shows the same new moon, full moon and
// Ekadashi days as Drik; the month summary agrees with the full day calculation.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay, computeMonth } from '../src/core/panchang'
import { prefs, time } from '../src/ui/format'
import { dayView } from '../src/ui/day'
import { legend, monthView, shiftMonth } from '../src/ui/month'
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

describe('favoured days, October 2026, Vilnius (SPEC 4.11)', () => {
  const cell = (date: string) => view.cells.find((x) => x.date === date)!
  const keyDates = (date: string) => view.events.filter((e) => e.date === date).map((e) => e.sub)

  it('marks Amrit Siddhi (Oct 14) and Ravi Pushya (Oct 4) green, not Sarvartha Siddhi alone (Oct 6)', () => {
    expect(cell('2026-10-14').favoured).toBe(true)
    expect(cell('2026-10-04').favoured).toBe(true)
    expect(cell('2026-10-06').favoured).toBe(false)
    expect(view.cells.filter((x) => x.favoured).map((x) => x.date)).toEqual(['2026-10-04', '2026-10-14'])
  })

  it('lists Amrit Siddhi in key dates, Pushya once, and no Sarvartha Siddhi', () => {
    expect(keyDates('2026-10-14')).toEqual(['Amrit Siddhi'])
    expect(keyDates('2026-10-04')).toEqual(['Ravi Pushya'])
    expect(view.events.some((e) => e.sub === 'Sarvartha Siddhi')).toBe(false)
  })

  it('shows one favoured row on the day screen: the strongest', () => {
    const terms = (date: string) => dayView(computeDay(date, loc), loc, new Date(`${date}T10:00:00Z`)).facts.map((f) => f.term)
    expect(terms('2026-10-14').filter((x) => /Siddhi|pushya/.test(x))).toEqual(['amritSiddhi'])
    expect(terms('2026-10-04').filter((x) => /Siddhi|pushya/.test(x))).toEqual(['pushya'])
    expect(terms('2026-10-06').filter((x) => /Siddhi|pushya/.test(x))).toEqual(['sarvarthaSiddhi'])
  })
})

describe('legend: only the marks this month shows, with what they are for and on which days', () => {
  const swatches = (cells: typeof view.cells) => legend(cells).map((x) => x.swatch)
  const days = (swatch: string) => legend(view.cells).find((x) => x.swatch === swatch)!.days

  it('October 2026 has no eclipse, so the legend does not list one (shape and today need no key)', () => {
    expect(swatches(view.cells)).toEqual(['rest', 'ekadashi', 'favoured'])
  })

  it('August 2026 lists the eclipse', () => {
    expect(swatches(monthView(computeMonth(2026, 8, loc), loc, '2026-10-05').cells)).toContain('eclipse')
  })

  it('every row says what it is for', () => {
    for (const x of legend(view.cells)) expect(x.note, x.swatch).not.toBe('')
  })

  it('names the days, a run of three or more as a range, and which tradition each favoured day follows', () => {
    expect(days('rest')).toBe('10, 25–27')
    expect(days('ekadashi')).toBe('6, 22')
    expect(days('favoured')).toBe('4 Ravi Pushya, 14 Amrit Siddhi')
  })
})
