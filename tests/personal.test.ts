// Personal layer (SPEC 13.6; rules.md P1, P2, R17, C1): Tarabala and Chandrabala against
// Drik's Tarabalam and Chandrabalam lists, the birth Moon from a birth instant, and the
// worked example 3 with its sample birth chart (.planning/research/examples.md).
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeDay, skyAt } from '../src/core/panchang'
import { birthOf, chandraOf, dayPeriods, daySegments, taraOf, type Birth } from '../src/core/periods'
import { resolveBirth } from '../src/ui/birth'
import { addDays, zonedTimeToUtc } from '../src/core/time'
import type { Location } from '../src/core/types'
import { CITIES } from '../scripts/cities'

const DIR = 'tests/fixtures/drik-extra'
type States = { name: string; spans: { from: string | null; state: string }[] }[]
type Extra = { city: string; date: string; tarabalam: States; chandrabalam: States }
const fixtures: Extra[] = readdirSync(DIR).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))

const STARS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']
const SIGNS = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']
/** Drik's names of the nine taras, from the birth star on. */
const TARAS = ['Janma', 'Sampata', 'Vipata', 'Kshema', 'Pratyari', 'Sadhaka', 'Naidhana', 'Mitra', 'Param Mitra']
/** Drik's Chandrabalam grade for the Moon's place 1–12 from the birth sign. */
const chandraState = (n: number) => ([1, 3, 6, 7, 10, 11].includes(n) ? 'Good' : [4, 8, 12].includes(n) ? 'Bad' : 'Puja Needed')

const MIN = 60_000
const moonStar = (t: Date) => Math.floor(skyAt(t).moon / (360 / 27)) + 1
const moonSign = (t: Date) => Math.floor(skyAt(t).moon / 30) + 1

/** A moment inside each listed span, 5 minutes clear of Drik's minute-rounded edges. */
function moments(spans: States[number]['spans']): [Date, string][] {
  return spans.flatMap((s, i) => {
    if (s.from) return [[new Date(new Date(s.from).getTime() + 5 * MIN), s.state] as [Date, string]]
    const next = spans[i + 1]?.from
    return next ? [[new Date(new Date(next).getTime() - 5 * MIN), s.state] as [Date, string]] : []
  })
}

describe("Tarabala and Chandrabala match Drik's lists (P2), 3 cities", () => {
  it.each(fixtures.map((f) => [`${f.city} ${f.date}`, f] as const))('%s', (_, f) => {
    let checked = 0
    for (const row of f.tarabalam) {
      const birth = STARS.indexOf(row.name) + 1
      expect(birth, row.name).toBeGreaterThan(0)
      for (const [t, state] of moments(row.spans)) {
        expect(TARAS[taraOf(birth, moonStar(t)) - 1], `${row.name} at ${t.toISOString()}`).toBe(state.split(' - ')[0])
        checked++
      }
    }
    for (const row of f.chandrabalam) {
      const birth = SIGNS.indexOf(row.name) + 1
      expect(birth, row.name).toBeGreaterThan(0)
      for (const [t, state] of moments(row.spans)) {
        expect(chandraState(chandraOf(birth, moonSign(t))), `${row.name} at ${t.toISOString()}`).toBe(state)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})

const c = CITIES.vilnius
const VILNIUS: Location = { name: c.drikName, country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz }
const L = (date: string, hhmm: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mm] = hhmm.split(':').map(Number)
  return zonedTimeToUtc(c.tz, y, m, d, h, mm)
}

describe('the birth Moon (P1, P2, R17)', () => {
  it("is the day's star, sign, lunar day and month at the birth instant", () => {
    const at = L('1995-07-15', '14:30')
    const day = computeDay('1995-07-15', VILNIUS)
    const b = birthOf(at)
    const inForce = <T extends { start: Date; end: Date }>(spans: T[]) => spans.find((s) => s.start <= at && at < s.end)!
    expect(b.star).toBe(inForce(day.nakshatra).index)
    expect(b.sign).toBe(inForce(day.signs.vedic.moon).index)
    expect(b.tithi).toBe(inForce(day.tithi).index)
    expect(b.month).toBe(day.masa.amanta)
  })
})

describe('example 3, Vilnius 2026-10-25, with the sample birth (Moon in Kanya, Hasta)', () => {
  // Invented, not a real person; birth lunar day and month left out (0) so only P1, P2 act.
  const birth: Birth = { star: 13, sign: 6, tithi: 0, month: 0 }
  const day = computeDay('2026-10-25', VILNIUS)
  const prev = computeDay(addDays('2026-10-25', -1), VILNIUS)
  const at = (t: Date, b: Birth | null) => daySegments(day, prev, 0, null, b).find((s) => s.start <= t && t < s.end)!

  it('morning: Sadhaka tara and the 7th sign — the verdict stays good', () => {
    expect(at(L('2026-10-25', '07:30'), birth)).toMatchObject({ verdict: 'good' })
  })
  it('from 15:52 Chandrashtama turns the evening window to avoid; Ashwini, the 16th star, only in its third quarter', () => {
    expect(at(L('2026-10-25', '20:00'), null).verdict).toBe('good')
    const s = at(L('2026-10-25', '20:00'), birth)
    expect(s.verdict).toBe('avoid')
    expect(s.by.map((p) => p.kind)).toEqual(['chandra'])
    // [MC] 4.13: in the second cycle only the third quarter of the 7th tara (Vadha) is bad.
    const d = dayPeriods(day, prev, birth).periods.find((p) => p.kind === 'tara' && p.detail?.star === 1)!
    expect(d).toMatchObject({ level: 'fb', detail: { tara: 7, cycle: 2 } })
    const ashwini = day.nakshatra.find((x) => x.index === 1)!
    const q = (ashwini.end.getTime() - ashwini.start.getTime()) / 4
    expect(Math.abs(d.start.getTime() - (ashwini.start.getTime() + 2 * q))).toBeLessThan(60_000)
  })
  it('the third cycle is all good; the 2nd, 5th, 9th sign counts only while the Moon wanes ([MC] 4.4, 4.13)', () => {
    // Morning of 10-25: the Moon in Revati (27), sign Meena (12), lunar day 14 (waxing).
    const third: Birth = { star: 7, sign: 0, tithi: 0, month: 0 } // Revati is the 21st from Punarvasu: Vipat of the third cycle
    expect(at(L('2026-10-25', '07:30'), third).active.find((p) => p.kind === 'tara')).toMatchObject({ decides: false, detail: { tara: 3, cycle: 3 } })
    const second: Birth = { star: 0, sign: 11, tithi: 0, month: 0 } // Meena is the 2nd sign from Kumbha
    expect(at(L('2026-10-25', '07:30'), second).active.find((p) => p.kind === 'chandra')).toMatchObject({ decides: false, detail: { place: 2 } })
    // A waning day: the same place is a fallback. 2026-11-05, Vilnius, noon.
    const d = computeDay('2026-11-05', VILNIUS), p = computeDay('2026-11-04', VILNIUS)
    const noon = L('2026-11-05', '12:00')
    const inForce = <T extends { start: Date; end: Date }>(xs: T[]) => xs.find((x) => x.start <= noon && noon < x.end)!
    expect((inForce(d.tithi) as { index: number }).index).toBeGreaterThan(15)
    const sign = (inForce(d.signs.vedic.moon) as { index: number }).index
    const b: Birth = { star: 0, sign: ((sign + 10) % 12) + 1, tithi: 0, month: 0 } // the Moon's sign is the 2nd from it
    const seg = daySegments(d, p, 0, null, b).find((x) => x.start <= noon && noon < x.end)!
    expect(seg.active.find((x) => x.kind === 'chandra')).toMatchObject({ level: 'fb', decides: true, detail: { place: 2 } })
  })
  it('the birth star is a fallback, not a veto: [MC] 4.13 gives it a remedy (user, 2026-10-14)', () => {
    const own: Birth = { star: 27, sign: 0, tithi: 0, month: 0 } // Revati, the Moon's star that morning
    expect(at(L('2026-10-25', '07:30'), own)).toMatchObject({ verdict: 'fb' })
    expect(at(L('2026-10-25', '07:30'), null)).toMatchObject({ verdict: 'good' })
  })
  it('Pratyari is a fallback all day (a remedy, [MC] 4.13), not red', () => {
    // 2026-10-14: the Moon in Anuradha all day, the 5th star from Hasta (user's report).
    const d = computeDay('2026-10-14', VILNIUS), p = computeDay('2026-10-13', VILNIUS)
    const seg = (t: Date) => daySegments(d, p, 0, null, birth).find((s) => s.start <= t && t < s.end)!
    const tara = (t: Date) => seg(t).active.find((x) => x.kind === 'tara')!
    expect(tara(L('2026-10-14', '11:00'))).toMatchObject({ level: 'fb', detail: { tara: 5 } })
    expect(tara(L('2026-10-14', '17:15'))).toMatchObject({ level: 'fb', detail: { tara: 5 } })
    expect(seg(L('2026-10-14', '17:15')).verdict).toBe('fb')
  })
  it('a birth with star, sign and lunar day all unknown adds no personal periods', () => {
    const none = dayPeriods(day, prev, { star: 0, sign: 0, tithi: 0, month: 0 }).periods
    expect(none.filter((p) => ['tara', 'chandra', 'janma'].includes(p.kind))).toEqual([])
  })
  it('the birth lunar day is avoided (R17); the birth month is shown, not counted (user, 2026-10-14)', () => {
    const tithi = day.tithi.find((s) => s.start <= L('2026-10-25', '12:00') && L('2026-10-25', '12:00') < s.end)!.index
    expect(at(L('2026-10-25', '20:00'), { star: 0, sign: 0, tithi, month: 0 }).by.map((p) => p.kind)).toContain('janma')
    const month = at(L('2026-10-25', '20:00'), { star: 0, sign: 0, tithi: 0, month: day.masa.amanta })
    expect(month.verdict).toBe(at(L('2026-10-25', '20:00'), null).verdict)
    expect(month.active.find((p) => p.kind === 'janma')).toMatchObject({ decides: false, detail: { what: 'month' } })
  })
})

describe("Ravi yoga cancels the day elements' own faults (13.4 step 0, user 2026-10-14)", () => {
  const day = computeDay('2026-10-25', VILNIUS), prev = computeDay('2026-10-24', VILNIUS)
  const at = (t: Date) => daySegments(day, prev, 0).find((s) => s.start <= t && t < s.end)!
  it("Vajra's first hours and the star junction under Ravi yoga are cancelled; Bhadra after noon remains (fb)", () => {
    const s = at(L('2026-10-25', '14:00'))
    expect(s.verdict).toBe('fb')
    expect(s.by.map((p) => p.kind)).toEqual(['bhadra'])
    expect(s.cancelled.map((p) => p.kind)).toContain('yogaPart')
    const g = at(L('2026-10-25', '15:20')) // the junction, Ravi yoga to 15:52
    expect(g.verdict).toBe('fb')
    expect(g.cancelled.map((p) => p.kind)).toContain('nakshatraGandanta')
  })
  it('not Bhadra, not Rahu Kalam', () => {
    expect(at(L('2026-10-25', '13:30')).verdict).toBe('fb') // Bhadra after noon
    expect(at(L('2026-10-25', '15:50')).verdict).toBe('avoid') // Rahu Kalam
  })
})

describe('birth data from Settings (Q7.1)', () => {
  const place = { name: 'Vilnius', cc: 'LT', country: 'Lithuania', tz: c.tz }

  it('with a time: the birth Moon at that instant, read on the place\'s clock', () => {
    expect(resolveBirth({ date: '1995-07-15', time: '14:30', place, star: null })).toEqual({ birth: birthOf(L('1995-07-15', '14:30')), parts: [] })
  })
  it('the same clock time in New York is another instant, 7 hours later (summer)', () => {
    const ny = { name: 'New York', cc: 'US', country: 'United States', tz: 'America/New_York' }
    expect(resolveBirth({ date: '1995-07-15', time: '14:30', place: ny, star: null }).birth).toEqual(birthOf(new Date(L('1995-07-15', '14:30').getTime() + 7 * 3_600_000)))
  })
  it('with no time and one star all day: that star; with two: the part of the day is picked', () => {
    // 2026-10-25 in Vilnius: the Moon moves from Revati (27) to Ashwini (1) at 15:52.
    const none = resolveBirth({ date: '2026-10-25', time: null, place, star: null })
    expect(none.birth).toBeNull()
    expect(none.parts.map((p) => p.star)).toEqual([27, 1])
    // The user picks by clock time: the change is found to the minute (Drik: 15:52).
    expect(Math.abs(none.parts[0].end.getTime() - L('2026-10-25', '15:52').getTime())).toBeLessThanOrEqual(2 * 60_000)
    expect(none.parts[1].start).toEqual(none.parts[0].end)
    const picked = resolveBirth({ date: '2026-10-25', time: null, place, star: 1 })
    expect(picked.birth).toMatchObject({ star: 1, sign: 1 })
    // A star lasts about a day, so a civil day inside one star is the rarer case: find one.
    const dates = Array.from({ length: 60 }, (_, i) => addDays('2026-10-01', i))
    const whole = dates.map((date) => resolveBirth({ date, time: null, place, star: null })).find((r) => !r.parts.length)
    expect(whole?.birth?.star).toBeGreaterThan(0)
  })
  it('"I do not know" (star 0): star unknown, the rest read over the whole day (user, 2026-10-21)', () => {
    // 2026-10-01: the Moon goes Rohini (3) to Mrigashira (4) but stays in sign 2 all day.
    const same = resolveBirth({ date: '2026-10-01', time: null, place, star: 0 })
    expect(same.birth).toEqual({ star: 0, sign: 2, tithi: 0, month: 6 })
    expect(same.parts.map((p) => p.star)).toEqual([3, 4])
    // 2026-10-02: the star (4 to 5) and the sign both change, so the sign is unknown too.
    expect(resolveBirth({ date: '2026-10-02', time: null, place, star: 0 }).birth).toMatchObject({ star: 0, sign: 0, tithi: 0 })
  })
  it('one star all day or a known time ignores star 0', () => {
    const date = addDays('2026-10-01', 0)
    const whole = Array.from({ length: 60 }, (_, i) => addDays('2026-10-01', i)).find((d) => !resolveBirth({ date: d, time: null, place, star: null }).parts.length)!
    expect(resolveBirth({ date: whole, time: null, place, star: 0 })).toEqual(resolveBirth({ date: whole, time: null, place, star: null }))
    expect(resolveBirth({ date, time: '14:30', place, star: 0 }).birth).toEqual(birthOf(L(date, '14:30')))
  })
})

it('birth data never leaves the device: no network calls in the app, CSP connect-src self', () => {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
  const calls = files('src').filter((f) => /\.(ts|svelte)$/.test(f)).filter((f) => /\b(fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)\b/.test(readFileSync(f, 'utf8')))
  expect(calls).toEqual([]) // the city list is a bundled module, not a request
  expect(readFileSync('index.html', 'utf8')).toMatch(/connect-src 'self'/)
})
