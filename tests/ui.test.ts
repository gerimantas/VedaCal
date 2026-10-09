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
import { activeAt, clockOn, dayView } from '../src/ui/day'
import { content, entry, time, until } from '../src/ui/format'
import { skyView } from '../src/ui/sky'
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

  it('sunrise, sunset and the five windows, whole, as the engine has them', () => {
    expect(v.sunrise).toBe(time(day.sunrise, loc))
    expect(v.sunset).toBe(time(day.sunset, loc))
    const shown = Object.fromEntries(v.windows.map((w) => [w.term, w]))
    for (const k of ['brahma', 'abhijit', 'rahuKaal', 'yamaganda', 'gulika'] as const) {
      const w = day.windows[k]
      if (w) expect(shown[k], k).toMatchObject({ start: time(w.start, loc), end: time(w.end, loc) })
      else expect(shown[k].start, k).toBe('')
    }
    const at = v.windows.filter((w) => w.track).map((w) => w.track!.from)
    expect(at, 'in time order').toEqual([...at].sort((a, b) => a - b))
  })

  it('day facts', () => {
    const facts = Object.fromEntries([...v.facts, ...v.moreFacts].map((f) => [f.term, f]))
    expect(facts.vara.value).toBe(entry('vara', day.vara).title)
    // Each row's sheet opens on what this day's value means (user, 2026-10-10: the sheets said
    // the meaning was on the day screen, and it was not).
    const lead = (e: { title: string; name: string; meaning: string }) => ({ title: `${e.title} · ${e.name}`, text: e.meaning })
    for (const el of ['nakshatra', 'yoga'] as const) {
      const s = activeAt(day[el], now)
      expect(facts[el], el).toMatchObject({ value: entry(el, s.index).title, right: until(s.end, day, loc), lead: lead(entry(el, s.index)) })
    }
    // The karana's sheet also says which half of which lunar day it is.
    const k = entry('karana', activeAt(day.karana, now).index)
    expect(facts.karana.lead!.title).toBe(lead(k).title)
    expect(facts.karana.lead!.text).toMatch(/^The (first|second) half of lunar day \d+ /)
    expect(facts.karana.lead!.text.endsWith(k.meaning)).toBe(true)
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
    expect(facts.ritu).toMatchObject({ value: ritu.title, sanskrit: ritu.name, lead: { title: `${ritu.title} · ${ritu.name}`, text: ritu.meaning } })
    expect(facts.rhythm, 'the rhythm sheet belongs to the tradition card').toBeUndefined()
  })
})

describe('Yamaganda, Gulika and Choghadiya (Vilnius, Tuesday 2026-10-06; Drik: Abhijit 12:44–13:29, Gulika 13:06–14:31)', () => {
  const loc = city('Vilnius')
  const day = computeDay('2026-10-06', loc)
  const at = (iso: string) => dayView(day, loc, new Date(iso))

  // User, 2026-10-10: nothing is cut, as on Drik; the overlap shows on each row's day track.
  it('the good time and Gulika both stay whole; the good row marks where Gulika overlaps it', () => {
    const v = at('2026-10-06T09:00:00Z')
    const row = (term: string) => v.windows.find((w) => w.term === term)!
    const { abhijit, gulika } = day.windows
    expect(row('abhijit')).toMatchObject({ start: time(abhijit!.start, loc), end: time(abhijit!.end, loc) })
    expect(row('gulika')).toMatchObject({ start: time(gulika!.start, loc), end: time(gulika!.end, loc) })
    const g = row('gulika').track!, a = row('abhijit').track!
    expect(a.clashes.some((c) => Math.abs(c.from - g.from) < 1e-9 && Math.abs(c.to - a.to) < 1e-9), 'Gulika inside Abhijit').toBe(true)
    expect(g.clashes).toEqual([]) // a time to avoid carries no clash marks
    expect(v.windows.map((w) => w.term).slice(0, 6), 'in time order').toEqual(['brahma', 'sarvarthaSiddhi', 'yamaganda', 'abhijit', 'gulika', 'rahuKaal'])
  })

  it('counts Yamaganda and Gulika as time to avoid in the dial centre, and both where they overlap the good time', () => {
    expect(at('2026-10-06T07:30:00Z').nowWindows).toEqual(['avoid']) // 10:30, Yamaganda
    expect(at('2026-10-06T11:00:00Z').nowWindows).toEqual(['avoid']) // 14:00, Gulika
    expect(at('2026-10-06T09:50:00Z').nowWindows).toEqual(['good']) // 12:50, Abhijit only
    expect(at('2026-10-06T10:15:00Z').nowWindows).toEqual(['avoid', 'good']) // 13:15, both
  })

  it('lists 16 Choghadiya parts and marks the one now', () => {
    const v = at('2026-10-06T09:00:00Z') // 12:00 — Labh, 11:42–13:06
    expect(v.choghadiya).toHaveLength(16)
    expect(v.choghadiya.filter((c) => c.current)).toHaveLength(1)
    expect(v.choghadiyaNow).toMatchObject({ name: 'Gain', sanskrit: 'Labh', rating: 'good', part: 'day' })
  })

  it('before sunrise, leads with what is left of last night (Monday night, Drik: Chara 05:55–07:30)', () => {
    const early = at('2026-10-06T03:30:00Z') // 06:30, before the 07:30 sunrise
    expect(early.choghadiyaNow).toMatchObject({ name: 'Moving', sanskrit: 'Chal', part: 'before' })
    expect(early.choghadiya.filter((c) => c.part === 'before')).toHaveLength(1)
    expect(early.choghadiya).toHaveLength(17)
    expect(early.choghadiya.filter((c) => c.current)).toHaveLength(1)
    expect(at('2026-10-06T09:00:00Z').choghadiya.some((c) => c.part === 'before'), 'gone after sunrise').toBe(false)
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
  expect(v.polar).toBe(true)
  expect(v.tithi.title).toBeTruthy()
  expect(v.facts.length).toBeGreaterThan(3)
})

describe('sun dial on another day: the device clock time on that date', () => {
  const loc = city('Vilnius')
  const now = new Date('2026-10-16T09:50:00Z') // 12:50 in Vilnius (summer time)

  it('today: now', () => {
    expect(clockOn(computeDay('2026-10-16', loc), loc, now)).toEqual(now)
  })

  it('another day: 12:50 there too, also after summer time ends (Oct 25)', () => {
    expect(clockOn(computeDay('2026-10-20', loc), loc, now).toISOString()).toBe('2026-10-20T09:50:00.000Z')
    expect(clockOn(computeDay('2026-10-30', loc), loc, now).toISOString()).toBe('2026-10-30T10:50:00.000Z')
  })

  it('the countdown runs from that time, not from sunrise', () => {
    const day = computeDay('2026-10-20', loc)
    const clock = clockOn(day, loc, now)
    const v = dayView(day, loc, day.sunrise!, 'vedic', clock)
    const mins = Math.round((day.sunset!.getTime() - clock.getTime()) / 60_000)
    expect(v.next?.in).toBe(`${Math.floor(mins / 60)} h ${mins % 60} min`)
  })
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

// User, 2026-10-10 (whole-app review): days to avoid are too many to mark on the month (Drik,
// October 2026 Vilnius: Panchak, Bhadra and Ganda Mool touch 19 of 31 days), so the day's time
// list carries Bhadra, Vyatipata, Vaidhriti and the eclipse as times to avoid, each with the
// same day track as the other rows.
describe('times to avoid beyond Rahu Kaal (Vilnius 2026)', () => {
  const loc = city('Vilnius')
  const rows = (date: string) => dayView(computeDay(date, loc), loc, new Date(`${date}T09:00:00Z`)).windows
  const row = (date: string, term: string) => rows(date).find((w) => w.term === term)

  it('Bhadra is the Vishti half lunar day, cut to the Panchang day (Drik Oct 14: 09:46–22:43)', () => {
    const day = computeDay('2026-10-14', loc)
    const vishti = day.karana.find((k) => k.index === 7)!
    expect(row('2026-10-14', 'bhadra')).toMatchObject({ kind: 'avoid', sanskrit: 'Bhadra', start: time(vishti.start, loc), end: time(vishti.end, loc) })
    expect(row('2026-10-14', 'amritSiddhi')!.track!.clashes.length, 'Bhadra inside Amrit Siddhi').toBeGreaterThan(0)
    expect(row('2026-10-15', 'bhadra')).toBeUndefined()
  })

  it('Vyatipata and Vaidhriti come from the yoga of the day (Drik: Vyatipata from Oct 27 07:23)', () => {
    const day = computeDay('2026-10-27', loc)
    const v = day.yoga.find((y) => y.index === 17)!
    expect(row('2026-10-27', 'vyatipata')).toMatchObject({ kind: 'avoid', start: time(v.start > day.sunrise! ? v.start : day.sunrise, loc) })
    const october = Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    const vaidhriti = october.filter((d) => row(d, 'vaidhriti'))
    expect(vaidhriti.length).toBeGreaterThanOrEqual(1)
    expect(vaidhriti.length).toBeLessThanOrEqual(3)
  })

  it('an eclipse is a time to avoid while it can be seen here (Drik Aug 28: 05:34 to moonset 06:16)', () => {
    expect(row('2026-08-28', 'eclipse')).toMatchObject({ kind: 'avoid', sanskrit: 'Chandra Grahan' })
    expect(row('2026-03-03', 'eclipse'), 'not visible in Vilnius').toBeUndefined()
  })

  it('every row with a time has a track inside the day, and the track knows where daylight ends', () => {
    const v = dayView(computeDay('2026-10-14', loc), loc, new Date('2026-10-14T09:00:00Z'))
    for (const w of v.windows.filter((x) => x.start)) {
      expect(w.track, w.term).not.toBeNull()
      expect(w.track!.from).toBeGreaterThanOrEqual(0)
      expect(w.track!.to).toBeLessThanOrEqual(1)
      expect(w.track!.from).toBeLessThan(w.track!.to)
    }
    expect(v.track.dusk).toBeGreaterThan(0.3)
    expect(v.track.dusk).toBeLessThan(0.6)
  })
})

// User, 2026-10-10: every sheet read on the day screen opens on that day — its times, why they
// fall there, and what tradition does — and its numbers are the ones the row shows.
describe('day sheets lead with the day (Vilnius 2026)', () => {
  const loc = city('Vilnius')
  const view = (date: string, at = `${date}T09:00:00Z`) => dayView(computeDay(date, loc), loc, new Date(at))
  const row = (date: string, term: string) => view(date).windows.find((w) => w.term === term)!

  it("Rahu Kaal: today's range, the eighth it is on this weekday, then what tradition does", () => {
    const r = row('2026-10-10', 'rahuKaal') // Saturday: the third eighth
    expect(r.lead.text).toContain(`${r.start}–${r.end}`)
    expect(r.lead.text).toContain('on Saturday Rahu Kaal is part 3')
    expect(r.lead.text.endsWith(content.tradition.rahuKaal)).toBe(true)
  })

  it("Amrit Siddhi names the weekday and the Moon's star that make it (Wed + Anuradha)", () => {
    const r = row('2026-10-14', 'amritSiddhi')
    expect(r.lead.text).toContain('Wednesday, and the Moon is in Anuradha: this pair makes Amrit Siddhi')
    expect(r.lead.text).toContain(`${r.start}–${r.end}`)
  })

  it('Bhadra says which half of which lunar day it is (Oct 14: the second half of day 4)', () => {
    expect(row('2026-10-14', 'bhadra').lead.text).toMatch(/^.+: the second half of lunar day 4 /)
  })

  it("the month, the signs and the tradition card say what today's value means", () => {
    const v = view('2026-10-10')
    const facts = Object.fromEntries(v.facts.map((f) => [f.term, f]))
    expect(facts.masa.lead).toEqual({ title: 'Ashwina · September–October', text: content.masa['7'].meaning })
    expect(v.moonSign.lead.text).toContain(content.rashi['6'].meaning) // the Moon in Virgo
    expect(v.moonSign.lead.text).toContain('By the Western zodiac it is in Libra')
    expect(v.tradition!.lead.text).toMatch(/^New moon today at /)
  })

  it('an eclipse names what is seen here (Aug 28: from 05:33 to moonset; the peak after it)', () => {
    const r = row('2026-08-28', 'eclipse')
    expect(r.lead.text).toContain(`Seen here ${r.start}–${r.end}`)
    expect(r.lead.text).toContain('is not seen here')
  })

  it('every tappable thing on the day screen has a lead', () => {
    for (const date of ['2026-10-06', '2026-10-10', '2026-10-14', '2026-10-17', '2026-08-28']) {
      const v = view(date)
      for (const w of v.windows) expect(w.lead.text, `${date} ${w.term}`).not.toBe('')
      for (const f of [...v.facts, ...v.moreFacts]) expect(f.lead?.text, `${date} ${f.term}`).toBeTruthy()
      for (const c of v.choghadiya) expect(c.lead.text).toBeTruthy()
      expect(v.tithi.lead.text && v.moonSign.lead.text && v.sunSign.lead.text).toBeTruthy()
    }
  })
})

// User, 2026-10-10: a night part's sheet said how the *day* starts, and "about an hour and a half".
describe('Choghadiya sheets name their own half (Vilnius, Tuesday 2026-10-06)', () => {
  const loc = city('Vilnius')
  const day = computeDay('2026-10-06', loc)

  it('day parts say "of the day", night parts "of the night", with today\'s length', () => {
    const v = dayView(day, loc, new Date('2026-10-06T09:00:00Z'))
    const dayRow = v.choghadiya.find((c) => c.part === 'day')!
    const nightRow = v.choghadiya.find((c) => c.part === 'night')!
    expect(dayRow.lead.text).toMatch(/^.+: part 1 of 8 of the day, \d+ min each\. On Tuesday the day starts with/)
    expect(nightRow.lead.text).toMatch(/^.+: part 1 of 8 of the night, \d+ min each\. On Tuesday the night starts with/)
  })

  it('a good part inside Rahu Kaal says tradition still avoids it', () => {
    const v = dayView(day, loc, new Date('2026-10-06T09:00:00Z'))
    const { rahuKaal } = day.windows
    const good = day.choghadiya.filter((p) => !p.night && ['amrit', 'shubh', 'labh'].includes(p.name) && p.start < rahuKaal!.end && rahuKaal!.start < p.end)
    const rows = v.choghadiya.filter((c) => c.part === 'day' && /falls in Rahu Kaal/.test(c.lead.text))
    expect(rows.length).toBe(good.length)
  })

  it("before sunrise, last night's parts belong to Monday", () => {
    const v = dayView(day, loc, new Date('2026-10-06T03:00:00Z'), 'vedic', new Date('2026-10-06T03:00:00Z'))
    const before = v.choghadiya.filter((c) => c.part === 'before')
    expect(before.length).toBeGreaterThan(0)
    for (const c of before) expect(c.lead.text).toContain('On Monday the night starts with')
  })
})
