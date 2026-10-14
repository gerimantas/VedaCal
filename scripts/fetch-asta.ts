// Fetch Drik Panchang's planet combustion (Graha Asta) dates and store them as test fixtures.
//   node scripts/fetch-asta.ts <city> <planet> <year> [<year> ...]
// planet: shukra (Venus), guru (Jupiter), budha, mangal, shani. Month rule M1 (rules.md).
// Fixtures are evidence: values come from the page, never typed by hand.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { drikPage } from './drik-page.ts'
import { zonedTimeToUtc } from '../src/core/time.ts'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export async function fetchAsta(city: CityKey, planet: string, year: number) {
  const c = CITIES[city]
  const url = `https://www.drikpanchang.com/planet/asta/${planet}-asta-date-time.html?geoname-id=${c.drikId}&year=${year}`
  const html = await drikPage(url)
  if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  // "Asta Starts On December 3, 2025, Wednesday at 07:34" or "… at 06:37 AM" — local time of
  // the page's city; the page notes that hours past midnight carry the next day's date.
  const when = (s: string) => {
    const m = s.match(/(\w+) (\d{1,2}), (\d{4}), \w+ at (\d{2}):(\d{2})(?: (AM|PM))?(?:, (\w{3}) (\d{1,2}))?/)!
    let hour = Number(m[4])
    if (m[6]) hour = (hour % 12) + (m[6] === 'PM' ? 12 : 0)
    let [y, mo, d] = [Number(m[3]), MONTHS.indexOf(m[1]) + 1, Number(m[2])]
    if (m[7]) {
      const next = MONTHS.findIndex((x) => x.startsWith(m[7])) + 1
      if (next < mo) y += 1
      ;[mo, d] = [next, Number(m[8])]
    }
    return zonedTimeToUtc(c.tz, y, mo, d, hour, Number(m[5])).toISOString()
  }
  const T = String.raw`\w+ \d{1,2}, \d{4}, \w+ at \d{2}:\d{2}(?: [AP]M)?(?:, \w{3} \d{1,2})?`
  const re = new RegExp(String.raw`Asta Starts On (${T}) (?:[\w ]*?)Asta Ends On (${T})`, 'g')
  const asta = [...text.matchAll(re)].map((m) => ({ start: when(m[1]), end: when(m[2]) }))
  if (!asta.length) throw new Error(`${url}: no combustion found`)
  return { source: url, fetchedAt: new Date().toISOString(), city, planet, year, tz: c.tz, asta }
}

if (import.meta.main) {
  const [city, planet, ...years] = process.argv.slice(2) as [CityKey, string, ...string[]]
  if (!CITIES[city] || !planet || !years.length) {
    console.error(`usage: node scripts/fetch-asta.ts <${Object.keys(CITIES).join('|')}> <shukra|guru|…> <year>...`)
    process.exit(1)
  }
  mkdirSync('tests/fixtures/asta', { recursive: true })
  for (const year of years) {
    const f = await fetchAsta(city, planet, Number(year))
    const file = `tests/fixtures/asta/${planet}-${city}-${year}.json`
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${file}: ${f.asta.map((a) => `${a.start} → ${a.end}`).join(' | ')}`)
  }
}
