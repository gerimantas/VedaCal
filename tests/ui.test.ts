// P4 gate (.planning/PLAN.md): every value the day screen shows equals the engine output
// for Vilnius, New York and New Delhi today; city search finds the test cities offline;
// the city list stays within 1 MB gzipped.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import data from '../src/data/cities.json'
import { computeDay } from '../src/core/panchang'
import { civilDate } from '../src/core/time'
import { buildIndex, nearest, search, type CityData } from '../src/ui/cities'
import { activeAt, dayView } from '../src/ui/day'
import { content, entry, sourced, time, until } from '../src/ui/format'
import { skyView, skyViewSun, sunCentredLayout } from '../src/ui/sky'
import { termGroups, terms } from '../src/ui/terms'

const index = buildIndex(data as unknown as CityData)
const city = (q: string) => search(index, q)[0]

describe('city search (offline, bundled list)', () => {
  it.each([
    ['Vilnius', 'Vilnius', 'LT'],
    ['New York', 'New York City', 'US'],
    ['Kaunas', 'Kaunas', 'LT'],
    ['new delhi', 'New Delhi', 'IN'],
    ['klaipeda', 'Klaipėda', 'LT'], // no accents typed
    ['tromso', 'Tromsø', 'NO'], // ø is not an accent; folded by hand
  ])('%s → %s', (q, name, cc) => {
    expect(city(q)).toMatchObject({ name, cc })
  })

  it('also matches a later word of the name', () => {
    expect(search(index, 'york').map((p) => p.name)).toEqual(expect.arrayContaining(['York', 'New York City']))
  })

  it('carries what a Location needs', () => {
    expect(city('Vilnius')).toMatchObject({ tz: 'Europe/Vilnius', country: 'Lithuania', elevation: 98 })
    expect(city('Vilnius').lat).toBeCloseTo(54.689, 2)
  })

  it('names a GPS point by its nearest city', () => {
    expect(nearest(index, 54.70, 25.30).name).toBe('Vilnius')
    expect(nearest(index, 40.75, -73.99).name).toBe('New York City') // midtown, nearer Hoboken's point
    expect(nearest(index, 40.744, -74.032).name).toBe('Hoboken') // but Hoboken itself stays Hoboken
    expect(nearest(index, 54.897, 23.892).name).toBe('Kaunas')
  })

  it('returns nothing for an empty query', () => {
    expect(search(index, '  ')).toEqual([])
  })

  it('is at most 1 MB gzipped', () => {
    expect(gzipSync(readFileSync('src/data/cities.json')).length).toBeLessThanOrEqual(1024 * 1024)
  })
})

describe.each(['Vilnius', 'New York', 'New Delhi'])('day screen for %s today shows the engine output', (q) => {
  const loc = city(q)
  const now = new Date()
  const day = computeDay(civilDate(loc.tz, now), loc)
  const v = dayView(day, loc, now)

  it('moon card', () => {
    const tithi = activeAt(day.tithi, now)
    const te = entry('tithi', tithi.index)
    expect(v.tithi).toMatchObject({ title: te.title, name: te.name, meaning: te.meaning, percent: Math.round(day.moon.illumination * 100) })
    expect(v.tithi.ends).toContain(time(tithi.end, loc))
    expect(v.moon).toMatchObject({ illumination: day.moon.illumination, waxing: day.moon.waxing })
  })

  it('day facts', () => {
    const facts = Object.fromEntries([...v.facts, ...v.moreFacts].map((f) => [f.term, f]))
    expect(facts.vara.value).toBe(entry('vara', day.vara).title)
    // Each row's sheet opens on what this day's value means (user, 2026-10-10: the sheets said
    // the meaning was on the day screen, and it was not), then its source (S16).
    const lead = (e: { title: string; name: string; meaning: string; source: string }) => ({ title: `${e.title} · ${e.name}`, text: sourced(e) })
    for (const el of ['nakshatra', 'yoga'] as const) {
      const s = activeAt(day[el], now)
      expect(facts[el], el).toMatchObject({ value: entry(el, s.index).title, right: until(s.end, day, loc), lead: lead(entry(el, s.index)) })
    }
    // The karana's sheet also says which half of which lunar day it is.
    const k = entry('karana', activeAt(day.karana, now).index)
    expect(facts.karana.lead!.title).toBe(lead(k).title)
    expect(facts.karana.lead!.text).toMatch(/^The (first|second) half of lunar day \d+ /)
    expect(facts.karana.lead!.text.endsWith(sourced(k))).toBe(true)
    expect(facts.vara.lead).toEqual(lead(entry('vara', day.vara)))
    const moon = activeAt(day.signs.vedic.moon, now)
    const rashi = (i: number) => content.rashi[String(i) as '1']
    expect(v.moonSign).toMatchObject({ text: `Moon in ${rashi(moon.index).title}`, sanskrit: rashi(moon.index).name, until: until(moon.end, day, loc) })
    const sun = activeAt(day.signs.vedic.sun, now)
    expect(v.sunSign).toMatchObject({ text: `Sun in ${rashi(sun.index).title}`, sanskrit: rashi(sun.index).name })
    expect([...v.facts, ...v.moreFacts].some((f) => f.term === 'rashi'), 'signs live on the cards, not in the facts').toBe(false)
    expect(facts.masa.sanskrit).toContain(content.masa[String(day.masa.purnimanta) as '1'].name)
    // The season row opens its own sheet, led by this season (user, 2026-10-10: it opened the
    // whole traditional rhythm).
    const ritu = content.rhythm[`ritu${day.rhythm.ritu}` as 'ritu1']
    expect(facts.ritu).toMatchObject({ value: ritu.title, sanskrit: ritu.name, lead: { title: `${ritu.title} · ${ritu.name}`, text: sourced(ritu) } })
    expect(facts.rhythm, 'the rhythm sheet belongs to the tradition card').toBeUndefined()
  })
})

describe('a live day (Vilnius 2026-10-04: Taitila until 14:21, then Garaja)', () => {
  const loc = city('Vilnius')
  const day = computeDay('2026-10-04', loc)
  const karana = (at: string) => dayView(day, loc, new Date(at)).moreFacts.find((f) => f.term === 'karana')!

  it('shows the element in force, and what follows it', () => {
    expect(karana('2026-10-04T08:00:00Z')).toMatchObject({ value: entry('karana', 4).title, next: `then ${entry('karana', 5).title}` })
    expect(karana('2026-10-04T12:00:00Z').value).toBe(entry('karana', 5).title) // after 14:21 local
  })

  it('switches the moon card when the lunar day ends', () => {
    expect(dayView(day, loc, new Date('2026-10-04T12:00:00Z')).tithi.index).toBe(24) // Krishna Navami
    expect(dayView(day, loc, new Date('2026-10-04T23:00:00Z')).tithi.index).toBe(25) // after 01:23 → Dashami
  })

  it('names Western signs when asked', () => {
    const w = dayView(day, loc, new Date('2026-10-04T08:00:00Z'), 'western')
    expect(w.sunSign).toMatchObject({ text: 'Sun in Libra', sanskrit: 'Western sign' })
  })
})

describe('Ekadashi fast end (Vilnius, Indira Ekadashi 2026-10-06; Drik: 07:32–09:46 on Oct 7)', () => {
  const loc = city('Vilnius')
  const row = (date: string) => dayView(computeDay(date, loc), loc, new Date(`${date}T09:00:00Z`)).facts[0]

  it('is the first row on the Ekadashi day and on the day after', () => {
    expect(row('2026-10-06')).toMatchObject({ term: 'parana' })
    expect(row('2026-10-06').value).toMatch(/^Tomorrow, /)
    expect(row('2026-10-07').value).toMatch(/^Today, /)
    expect(row('2026-10-08').term).not.toBe('parana')
  })
})

it('a polar night still shows the day (Tromsø, 2026-12-21)', () => {
  const loc = city('Tromso')
  const v = dayView(computeDay('2026-12-21', loc), loc, new Date('2026-12-21T11:00:00Z'))
  expect(v.tithi.title).toBeTruthy()
  expect(v.facts.length).toBeGreaterThan(3)
})

// About page groups (user, 2026-10-05): every term sits in exactly one group.
it('About groups list every term exactly once', () => {
  const grouped = termGroups.flatMap(([, keys]) => keys)
  expect([...grouped].sort()).toEqual(Object.keys(terms).sort())
})

// Sky screen (user, 2026-10-05): the chart's lunar day and Moon star are the engine's, the
// ones the day screen shows at the same instant.
it('Sky chart agrees with the day screen at sunrise', () => {
  for (const q of ['Vilnius', 'New York', 'New Delhi']) {
    const loc = city(q)
    const day = computeDay(civilDate(loc.tz, new Date()), loc)
    const at = new Date(day.sunrise!.getTime() + 60_000)
    const v = skyView(at)
    expect(v.tithi, q).toBe(day.tithi[0].index)
    expect(v.nakshatra, q).toBe(day.nakshatra[0].index)
  }
})

// User, 2026-10-24: Sun-centred chart as a second tab — same facts, Earth opposite the Sun.
it('Sun-centred chart: same facts, Earth opposite the Sun, line ends in the Sun sign', () => {
  const at = new Date('2026-10-24T09:00:00Z')
  const a = skyView(at)
  const b = skyViewSun(at)
  expect({ ...b, svg: '' }).toEqual({ ...a, svg: '' })
  expect(b.svg).not.toBe(a.svg)
  for (const sun of [0, 29.9, 30, 123.4, 359.9]) {
    const moon = (sun + 77) % 360
    const L = sunCentredLayout(sun, moon)
    expect((((L.earthDeg - L.sunDeg) % 360) + 360) % 360).toBeCloseTo(180)
    // End point of the Earth → Sun line, as an angle around the centre, lies in the Sun's sign.
    const ang = (Math.atan2(200 - L.sunEnd[1], L.sunEnd[0] - 200) * 180) / Math.PI
    const lon = (((ang - 180) % 360) + 360) % 360
    expect(Math.floor((lon + 1e-6) / 30), String(sun)).toBe(Math.floor(sun / 30))
    // Earth, centre and line end are collinear.
    const cross = (200 - L.earth[0]) * (L.sunEnd[1] - L.earth[1]) - (200 - L.earth[1]) * (L.sunEnd[0] - L.earth[0])
    expect(Math.abs(cross)).toBeLessThan(1e-6)
    expect(Math.hypot(L.moon[0] - L.earth[0], L.moon[1] - L.earth[1])).toBeCloseTo(23)
    const dir = (Math.atan2(L.earth[1] - L.moon[1], L.moon[0] - L.earth[0]) * 180) / Math.PI
    expect((((dir - L.moonDeg) % 360) + 540) % 360 - 180).toBeCloseTo(0)
  }
})

// User, 2026-10-10: every sheet read on the day screen opens on that day — its times, why they
// fall there, and what tradition does — and its numbers are the ones the row shows.
describe('day sheets lead with the day (Vilnius 2026)', () => {
  const loc = city('Vilnius')
  const view = (date: string, at = `${date}T09:00:00Z`) => dayView(computeDay(date, loc), loc, new Date(at))

  it("the month, the signs and the tradition card say what today's value means", () => {
    const v = view('2026-10-10')
    const facts = Object.fromEntries(v.facts.map((f) => [f.term, f]))
    expect(facts.masa.lead).toEqual({ title: 'Ashwina · September–October', text: sourced(content.masa['7']) })
    expect(v.moonSign.lead.text).toContain(sourced(content.rashi['6'])) // the Moon in Virgo
    expect(v.moonSign.lead.text).toContain('By the Western zodiac it is in Libra')
    expect(v.tradition!.lead.text).toMatch(/^New moon today at /)
  })

  it('an eclipse names what is seen here (Aug 28: from 05:33 to moonset; the peak after it)', () => {
    const f = view('2026-08-28').facts.find((x) => x.lead?.text.includes('Seen here'))!
    // The device picks 12 or 24 h (CI: "5:33 AM"), so either form passes.
    expect(f.lead!.text).toMatch(/Seen here 0?5:3\d( AM)?–0?6:1\d/)
    expect(f.lead!.text).toContain('is not seen here')
  })

  it('every tappable thing on the day screen has a lead', () => {
    for (const date of ['2026-10-06', '2026-10-10', '2026-10-14', '2026-10-17', '2026-08-28']) {
      const v = view(date)
      for (const f of [...v.facts, ...v.moreFacts]) expect(f.lead?.text, `${date} ${f.term}`).toBeTruthy()
      expect(v.tithi.lead.text && v.moonSign.lead.text && v.sunSign.lead.text).toBeTruthy()
    }
  })
})
