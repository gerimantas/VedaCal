// Fetch mypanchang.com month pages and store the requested days as test fixtures.
//   node scripts/fetch-mypanchang.ts <city> <YYYY-MM-DD> [<YYYY-MM-DD> ...]
// mypanchang gives times to the second but uses the centre-of-disc (Madhyabimb) sunrise,
// so its sunrise-based windows are not comparable with our default; element end times are.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { addDays, zonedTimeToUtc } from '../src/core/time.ts'

const text = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "18:24:01" or "24:20:54+" (past midnight, same Panchang day) → ISO instant. */
function instant(tz: string, date: string, s: string): string {
  const m = s.match(/(\d{1,2}):(\d{2}):(\d{2})/)
  if (!m) throw new Error(`Unparsable time "${s}"`)
  const h = Number(m[1])
  const day = h >= 24 ? addDays(date, 1) : date
  const [y, mo, d] = day.split('-').map(Number)
  return zonedTimeToUtc(tz, y, mo, d, h % 24, Number(m[2]), Number(m[3])).toISOString()
}

type Entry = { name: string; end: string | null }

function parseDay(block: string, tz: string, date: string) {
  const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)(?=<td|<\/tr>|<\/table>)/g)].map((m) => text(m[1]))
  const elements: Record<string, Entry[]> = { Tithi: [], Nakshatra: [], Yoga: [], Karana: [] }
  const fields: Record<string, string> = {}
  let last: Entry | null = null
  for (let i = 0; i < cells.length - 1; i++) {
    const label = cells[i].replace(/:$/, '')
    if (!cells[i].endsWith(':')) continue
    const value = cells[i + 1]
    if (label in elements) {
      last = { name: value.replace(/\s*\[.*\]$/, ''), end: null }
      elements[label].push(last)
    } else if (label === 'End time' && last) {
      last.end = /\d/.test(value) ? instant(tz, date, value) : null
    } else if (!(label in fields)) {
      fields[label] = value
    }
  }
  const range = (v?: string) => {
    const m = v?.match(/(\d+:\d{2}:\d{2}\+?)\s*-\s*(\d+:\d{2}:\d{2}\+?)/)
    return m ? { start: instant(tz, date, m[1]), end: instant(tz, date, m[2]) } : null
  }
  return {
    sunrise: instant(tz, date, fields['Sunrise']),
    sunset: instant(tz, date, fields['Sunset']),
    tithi: elements.Tithi,
    nakshatra: elements.Nakshatra,
    yoga: elements.Yoga,
    karana: elements.Karana,
    rahuKalam: range(fields['Rahukalam']),
    abhijit: range(fields['Abhijit Muhurta']),
    ayana: block.match(/Ayana:\s*(\w+)/)?.[1] ?? null,
    ritu: block.match(/Ritu:\s*(\w+)/)?.[1] ?? null,
  }
}

const pages = new Map<string, string>()

async function monthPage(city: CityKey, year: number, month: number): Promise<{ url: string; html: string }> {
  const mp = CITIES[city].mypanchang
  if (!mp) throw new Error(`mypanchang has no page for ${city}`)
  const url = `http://www.mypanchang.com/phppanchang.php?yr=${year}&cityhead=${encodeURIComponent(mp.head)}&cityname=${mp.id}&monthtype=0&mn=${month - 1}`
  if (!pages.has(url)) {
    await new Promise((r) => setTimeout(r, 1500)) // be polite to mypanchang.com
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VedaCal test fixtures)' } })
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    pages.set(url, await res.text())
  }
  return { url, html: pages.get(url)! }
}

export async function fetchMypanchang(city: CityKey, date: string) {
  const c = CITIES[city]
  const [y, m, d] = date.split('-').map(Number)
  const { url, html } = await monthPage(city, y, m)
  const title = `${MONTHS[m - 1]}, ${String(d).padStart(2, '0')} ${y} )`
  const start = html.indexOf(title)
  if (start < 0) throw new Error(`${url}: no block for ${date}`)
  const end = html.indexOf('Panchang for ', start + title.length)
  return { source: url, fetchedAt: new Date().toISOString(), city, date, tz: c.tz, ...parseDay(html.slice(start, end < 0 ? undefined : end), c.tz, date) }
}

if (import.meta.main) {
  const [city, ...dates] = process.argv.slice(2) as [CityKey, ...string[]]
  if (!CITIES[city]?.mypanchang || !dates.length) {
    console.error('usage: node scripts/fetch-mypanchang.ts <new-york|new-delhi> <YYYY-MM-DD>...')
    process.exit(1)
  }
  mkdirSync('tests/fixtures/mypanchang', { recursive: true })
  for (const date of dates) {
    const f = await fetchMypanchang(city, date)
    const file = `tests/fixtures/mypanchang/${city}-${date}.json`
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${file}: ${f.tithi.map((t) => t.name).join(' → ')} | sunrise ${f.sunrise}`)
  }
}
