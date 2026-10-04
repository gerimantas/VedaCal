// Fetch Drik's Ekadashi Parana (fast-breaking) windows for a city and year and store them
// as a fixture. Drik's yearly list has no Parana times, so each Ekadashi's own page is read.
//   node scripts/fetch-parana.ts <city> <year>
// Fixtures are evidence: values come from the pages, never typed by hand.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { drikPage as get } from './drik-page.ts'
import { zonedTimeToUtc } from '../src/core/time.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ').replace(/\s+/g, ' ')

/** "07:32 AM" on a civil date → ISO instant. */
function instant(tz: string, date: string, s: string): string {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)!
  const hour = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)
  const [y, mo, d] = date.split('-').map(Number)
  return zonedTimeToUtc(tz, y, mo, d, hour, Number(m[2])).toISOString()
}

const iso = (y: number, month: string, d: string) => `${y}-${String(MONTHS.indexOf(month.slice(0, 3)) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`

export async function fetchParana(city: CityKey, year: number) {
  const c = CITIES[city]
  const geo = `geoname-id=${c.drikId}`
  const list = await get(`https://www.drikpanchang.com/vrats/ekadashidates.html?${geo}&year=${year}`)
  const section = list.slice(list.indexOf(`${year} Ekadashi Dates`))
  const pages = [...new Set([...section.matchAll(/href="(\/ekadashis\/[^"]*-date-time\.html\?(?:year|date)=[^"]*)"/g)].map((m) => m[1]))]

  const out: { ekadashi: string; name: string; paranaDay: string; start: string; end: string | null; note: string | null; source: string }[] = []
  for (const page of pages) {
    const url = `https://www.drikpanchang.com${page}&${geo}`
    const html = await get(url)
    if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
    const body = text(html)
    // The first block is the Smarta (household) Ekadashi; Gauna/Vaishnava alternatives follow.
    const m = body.match(
      /Vrat Timings (.+?) on \w+, (\w+) (\d{1,2}), (\d{4}) On (\d{1,2}) \w* (\w{3}), Parana Time - (\d{1,2}:\d{2} [AP]M)(?: , \w{3} \d{1,2})?(?: to (\d{1,2}:\d{2} [AP]M))?(?: On Parana Day (.+?))? Ekadashi Tithi Begins/,
    )
    if (!m) {
      console.warn(`${url}: no Parana block`)
      continue
    }
    const y = Number(m[4])
    if (y !== year) continue // a ?year= link can point at next year's occurrence
    const ekadashi = iso(y, m[2], m[3])
    // The Parana day is the day after; it can fall in the next month or year.
    const next = new Date(`${ekadashi}T12:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    const paranaDay = next.toISOString().slice(0, 10)
    if (Number(paranaDay.slice(8)) !== Number(m[5])) throw new Error(`${url}: Parana day ${m[5]} is not the day after ${ekadashi}`)
    out.push({
      ekadashi,
      name: m[1],
      paranaDay,
      start: instant(c.tz, paranaDay, m[7]),
      // Drik gives only a start ("Parana Time - 03:43 PM") when the fast ends after the afternoon.
      end: m[8] ? instant(c.tz, paranaDay, m[8]) : null,
      note: m[9] ?? null, // e.g. "Hari Vasara End Moment - 10:15 AM", "Dwadashi would be over before Sunrise"
      source: url,
    })
  }
  out.sort((a, b) => a.ekadashi.localeCompare(b.ekadashi))
  return { fetchedAt: new Date().toISOString(), city, year, parana: out.filter((p, i) => p.ekadashi !== out[i - 1]?.ekadashi) }
}

if (import.meta.main) {
  const [city, year] = process.argv.slice(2) as [CityKey, string]
  if (!CITIES[city] || !year) {
    console.error(`usage: node scripts/fetch-parana.ts <${Object.keys(CITIES).join('|')}> <year>`)
    process.exit(1)
  }
  const f = await fetchParana(city, Number(year))
  mkdirSync('tests/fixtures/parana', { recursive: true })
  const file = `tests/fixtures/parana/${city}-${year}.json`
  writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
  console.log(`${file}: ${f.parana.length} Parana windows`)
}
