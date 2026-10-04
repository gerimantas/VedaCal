// Fetch a Drik Panchang day page and store it as a test fixture.
//   node scripts/fetch-drik.ts <city> <YYYY-MM-DD> [<YYYY-MM-DD> ...]
// Fixtures are evidence: values come from the page, never typed by hand.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { addDays, zonedTimeToUtc } from '../src/core/time.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Cards = Record<string, Record<string, string[]>>

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8209;/g, '-')
    .replace(/&#9432;/g, '') // the ⓘ info icon
    .replace(/\s+/g, ' ')
    .trim()

/** Drik lays out each card as rows of [key, value, key, value]; an empty key continues the key above it. */
export function parseCards(html: string): Cards {
  const cards: Cards = {}
  for (const chunk of html.split('<h3 class="dpTableCardTitle">').slice(1)) {
    const title = text(chunk.slice(0, chunk.indexOf('</h3>')))
    const card: Record<string, string[]> = (cards[title] ??= {})
    const lastKey: string[] = []
    for (const row of chunk.split('<div class="dpTableRow">').slice(1)) {
      row
        .split('<div class="dpTableCell dpTableKey">')
        .slice(1)
        .forEach((cell, col) => {
          const [keyHtml, valueHtml = ''] = cell.split('<div class="dpTableCell dpTableValue">')
          const key = text(keyHtml) || lastKey[col]
          if (!key) return
          lastKey[col] = key
          const value = text(valueHtml)
          if (value) (card[key] ??= []).push(value)
        })
    }
  }
  return cards
}

/** "01:23 AM, Oct 05" or "09:43 PM" → ISO instant. Times without a date belong to `date`. */
function instant(tz: string, date: string, s: string): string {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)(?:\s*,\s*([A-Z][a-z]{2})\s+(\d{1,2}))?/)
  if (!m) throw new Error(`Unparsable time "${s}"`)
  let hour = Number(m[1]) % 12
  if (m[3] === 'PM') hour += 12
  let [y, mo, d] = date.split('-').map(Number)
  if (m[4]) {
    const month = MONTHS.indexOf(m[4]) + 1
    if (month === 1 && mo === 12) y += 1
    if (month === 12 && mo === 1) y -= 1
    mo = month
    d = Number(m[5])
  }
  return zonedTimeToUtc(tz, y, mo, d, hour, Number(m[2])).toISOString()
}

/**
 * "Navami upto 01:23 AM, Oct 05" → { name, end }. A value without "upto" lasts to the next
 * sunrise (end: null); "upto Full Night" lasts past the next sunrise (end: "fullNight").
 */
const span = (tz: string, date: string) => (v: string) => {
  const [name, rest] = v.split(/\s+upto\s+/)
  const end = !rest ? null : /Full Night/i.test(rest) ? 'fullNight' : instant(tz, date, rest)
  return { name: name.trim(), end }
}

/** "05:23 PM to 06:48 PM" → { start, end }; Drik writes "None" when a window does not occur. */
const range = (tz: string, date: string, v: string | null) => {
  if (!v || /None/i.test(v)) return null
  const [a, b] = v.split(/\s*to\s*/)
  return { start: instant(tz, date, a), end: instant(tz, date, b) }
}

export async function fetchDrik(city: CityKey, date: string) {
  const c = CITIES[city]
  const [y, m, d] = date.split('-')
  const url = `https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=${c.drikId}&date=${d}/${m}/${y}`
  await new Promise((r) => setTimeout(r, 1500)) // be polite to drikpanchang.com
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VedaCal test fixtures)' } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const html = await res.text()
  if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
  const cards = parseCards(html)
  const sun = cards['Sunrise and Moonrise']
  const p = cards['Panchang']
  const good = cards['Auspicious Timings']
  const bad = cards['Inauspicious Timings']
  const ritu = cards['Ritu and Ayana']
  const one = (card: Record<string, string[]>, key: string) => card?.[key]?.[0] ?? null
  const opt = (s: string | null) => (s && /\d/.test(s) ? instant(c.tz, date, s) : null)
  const s = span(c.tz, date)
  return {
    source: url,
    fetchedAt: new Date().toISOString(),
    city,
    date,
    tz: c.tz,
    sunrise: instant(c.tz, date, one(sun, 'Sunrise')!),
    sunset: instant(c.tz, date, one(sun, 'Sunset')!),
    moonrise: opt(one(sun, 'Moonrise')),
    moonset: opt(one(sun, 'Moonset')),
    nextSunrise: null as string | null, // filled from the next day's page by the caller if needed
    tithi: p['Tithi'].map(s),
    nakshatra: p['Nakshatra'].map(s),
    yoga: p['Yoga'].map(s),
    karana: p['Karana'].map(s),
    weekday: one(p, 'Weekday'),
    paksha: one(p, 'Paksha'),
    rahuKalam: range(c.tz, date, one(bad, 'Rahu Kalam')),
    abhijit: range(c.tz, date, one(good, 'Abhijit')),
    brahmaMuhurta: range(c.tz, date, one(good, 'Brahma Muhurta')),
    ritu: one(ritu, 'Drik Ritu'),
    ayana: one(ritu, 'Drik Ayana'),
    dinamana: one(ritu, 'Dinamana'),
    raw: cards,
  }
}

if (import.meta.main) {
  const [city, ...dates] = process.argv.slice(2) as [CityKey, ...string[]]
  if (!CITIES[city] || !dates.length) {
    console.error(`usage: node scripts/fetch-drik.ts <${Object.keys(CITIES).join('|')}> <YYYY-MM-DD>...`)
    process.exit(1)
  }
  mkdirSync('tests/fixtures/drik', { recursive: true })
  for (const date of dates) {
    const f = await fetchDrik(city, date)
    f.nextSunrise = (await fetchDrik(city, addDays(date, 1))).sunrise
    const file = `tests/fixtures/drik/${city}-${date}.json`
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${file}: ${f.tithi.map((t) => t.name).join(' → ')} | sunrise ${f.sunrise}`)
  }
}
