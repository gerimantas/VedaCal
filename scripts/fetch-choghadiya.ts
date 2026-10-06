// Fetch Drik Panchang's Choghadiya page for a city and dates and store each as a fixture.
//   node scripts/fetch-choghadiya.ts <city> <YYYY-MM-DD> [<YYYY-MM-DD> ...]
// Fixtures are evidence: values come from the page, never typed by hand.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { drikPage } from './drik-page.ts'
import { instant } from './fetch-drik.ts'

const text = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[#\w]+;/g, ' ')
    .replace(/\s+/g, ' ')

// "Roga - Evil 07:30 AM to 08:54 AM", "Shubha - Good 11:31 PM to 01:07 AM , Oct 07".
// Drik's extra markers between rows (Vaar Vela, Kaal Vela, Kaal Ratri) are not kept.
const T = String.raw`\d{1,2}:\d{2} [AP]M(?: , [A-Z][a-z]{2} \d{1,2})?`
const ROW = new RegExp(String.raw`(Amrita|Shubha|Labha|Chara|Udvega|Roga|Kala) - [A-Za-z]+ (${T}) to (${T})`, 'g')

export async function fetchChoghadiya(city: CityKey, date: string) {
  const c = CITIES[city]
  const [y, m, d] = date.split('-')
  const url = `https://www.drikpanchang.com/muhurat/choghadiya.html?geoname-id=${c.drikId}&date=${d}/${m}/${y}`
  const html = await drikPage(url)
  if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
  const page = text(html)
  const day = page.indexOf('Day Choghadiya')
  const night = page.indexOf('Night Choghadiya', day)
  if (day < 0 || night < 0) throw new Error(`${url}: no Choghadiya table`)
  // Drik dates only the end of a part past midnight: "01:07 AM to 02:44 AM , Oct 07". Such a
  // start takes the end's date, unless that puts it after the end ("11:31 PM to 01:07 AM , Oct 07").
  const startOf = (start: string, end: string) => {
    const dated = /,/.test(start) ? start : `${start}${end.slice(end.indexOf(' ,') >= 0 ? end.indexOf(' ,') : end.length)}`
    const a = instant(c.tz, date, dated)
    return a > instant(c.tz, date, end) ? instant(c.tz, date, start) : a
  }
  const rows = (s: string) => [...s.matchAll(ROW)].slice(0, 8).map((r) => ({ name: r[1], start: startOf(r[2], r[3]), end: instant(c.tz, date, r[3]) }))
  const f = { source: url, fetchedAt: new Date().toISOString(), city, date, tz: c.tz, day: rows(page.slice(day, night)), night: rows(page.slice(night)) }
  if (f.day.length !== 8 || f.night.length !== 8) throw new Error(`${url}: expected 8 + 8 parts, got ${f.day.length} + ${f.night.length}`)
  return f
}

if (import.meta.main) {
  const [city, ...dates] = process.argv.slice(2) as [CityKey, ...string[]]
  if (!CITIES[city] || !dates.length) {
    console.error(`usage: node scripts/fetch-choghadiya.ts <${Object.keys(CITIES).join('|')}> <YYYY-MM-DD>...`)
    process.exit(1)
  }
  mkdirSync('tests/fixtures/choghadiya', { recursive: true })
  for (const date of dates) {
    const f = await fetchChoghadiya(city, date)
    const file = `tests/fixtures/choghadiya/${city}-${date}.json`
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${file}: ${f.day.map((p) => p.name).join(' ')} | ${f.night.map((p) => p.name).join(' ')}`)
  }
}
