// Fetch Drik's own pages for the day marks (SPEC 4.11) — Sankranti moments, eclipses as seen
// from the city, Guru/Ravi Pushya windows — and store them as a fixture.
//   node scripts/fetch-marks.ts <city> <year>
// Fixtures are evidence: values come from the pages, never typed by hand.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { drikPage as get } from './drik-page.ts'
import { zonedTimeToUtc } from '../src/core/time.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const D = 'https://www.drikpanchang.com'
// Drik's page slugs in sign order: 1 = Mesha … 12 = Meena.
const SANKRANTI = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrischika', 'dhanu', 'makar', 'kumbha', 'meena']

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')

/** "12:44 AM" on a civil date, or "12:19 AM , May 22" (next day) → ISO instant. */
function instant(tz: string, date: string, s: string): string {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)(?:\s*,\s*([A-Z][a-z]{2})\s+(\d{1,2}))?/)
  if (!m) throw new Error(`Unparsable time "${s}"`)
  const hour = (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)
  let [y, mo, d] = date.split('-').map(Number)
  if (m[4]) {
    const month = MONTHS.indexOf(m[4]) + 1
    if (month === 1 && mo === 12) y += 1
    mo = month
    d = Number(m[5])
  }
  return zonedTimeToUtc(tz, y, mo, d, hour, Number(m[2])).toISOString()
}

const iso = (y: string, month: string, d: string) =>
  `${y}-${String(MONTHS.indexOf(month.slice(0, 3)) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`

function checkCity(html: string, url: string, name: string) {
  if (!html.includes(name)) throw new Error(`${url}: page is not for ${name}`)
}

export async function sankrantis(city: CityKey, year: number) {
  const c = CITIES[city]
  const out = []
  for (const [i, slug] of SANKRANTI.entries()) {
    const url = `${D}/sankranti/${slug}-sankranti-date-time.html?year=${year}&geoname-id=${c.drikId}`
    const html = await get(url)
    checkCity(html, url, c.drikName)
    const body = text(html)
    // "Kumbha Sankranti on Friday, February 13, 2026" is the observance day; the moment line
    // carries its own date when it differs ("Sankranti Moment: 12:44 AM , Feb 13").
    const day = body.match(/Sankranti on \w+, (\w+) (\d{1,2}), (\d{4})/)
    const moment = body.match(/Sankranti Moment: (\d{1,2}:\d{2} [AP]M(?: , [A-Z][a-z]{2} \d{1,2})?)/)
    if (!day || !moment) throw new Error(`${url}: no Sankranti day or moment`)
    const observed = iso(day[3], day[1], day[2])
    out.push({ sign: i + 1, observed, at: instant(c.tz, observed, moment[1]), source: url })
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

export async function eclipses(city: CityKey, year: number) {
  const c = CITIES[city]
  const list = text(await get(`${D}/eclipse/eclipse-date-time.html?year=${year}&geoname-id=${c.drikId}`))
  const section = list.slice(list.indexOf(`${year} Eclipse List`))
  const out = []
  for (const m of section.matchAll(/(Penumbral|Partial|Annular|Total|Hybrid) (Solar|Lunar) Eclipse (\w+) (\d{1,2}), (\d{4})/g)) {
    const [, type, body, month, d, y] = m
    const date = iso(y, month, d)
    const url = `${D}/eclipse/${body.toLowerCase()}-eclipse-date-time-duration.html?date=${date.slice(8)}/${date.slice(5, 7)}/${y}&geoname-id=${c.drikId}`
    const html = await get(url)
    checkCity(html, url, c.drikName)
    const page = text(html)
    // The city block, from its headline ("Partial Solar Eclipse in Vilnius", "No Lunar Eclipse
    // in Vilnius", "Eclipse would not be visible in Vilnius") to the notes. Kept whole.
    const local = page.match(/Local Timings 12 Hour 24 Hour 24 Plus (.*?) Notes:/)
    if (!local || !local[1].includes(c.drikName)) throw new Error(`${url}: no local eclipse block`)
    const visible = !/^No |would not be visible/.test(local[1])
    out.push({ date, body: body === 'Solar' ? 'sun' : 'moon', type: type.toLowerCase(), visible, local: local[1], source: url })
  }
  return out
}

export async function pushya(city: CityKey, year: number) {
  const c = CITIES[city]
  const out = []
  for (const [page, weekday] of [['gurupushya', 4], ['ravipushya', 0]] as const) {
    const url = `${D}/yoga/${page}-yoga-date-time.html?year=${year}&geoname-id=${c.drikId}`
    const html = await get(url)
    checkCity(html, url, c.drikName)
    const body = text(html)
    const section = body.slice(body.indexOf('Pushya Yoga Days'), body.indexOf('Notes:', body.indexOf('Pushya Yoga Days')))
    for (const m of section.matchAll(/(\w+) (\d{1,2}), (\d{4}), \w+ (\d{1,2}:\d{2} [AP]M) to (\d{1,2}:\d{2} [AP]M(?: , [A-Z][a-z]{2} \d{1,2})?)/g)) {
      // The row date is the civil date Drik files the window under: for a window before the next
      // sunrise it is that later date ("March 27, 2026, Friday 05:54 AM", a Thursday window).
      const date = iso(m[3], m[1], m[2])
      // Drik leaves the next-day suffix off a start just past midnight ("October 4, 2026, Sunday
      // 12:13 AM to 06:16 AM , Oct 05" in New Delhi = Oct 5, 00:13 — Pushya begins at one instant
      // everywhere, 18:43 UTC, as the New York and Vilnius rows show). No window starts between
      // midnight and 04:00 on its own day: every test city's sunrise is later.
      const early = /^(12|0?[1-3]):\d{2} AM$/.test(m[4])
      const startDate = early ? new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : date
      out.push({ weekday, date, start: instant(c.tz, startDate, m[4]), end: instant(c.tz, date, m[5]), source: url })
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}

if (import.meta.main) {
  const [city, year] = process.argv.slice(2) as [CityKey, string]
  if (!CITIES[city] || !year) {
    console.error(`usage: node scripts/fetch-marks.ts <${Object.keys(CITIES).join('|')}> <year>`)
    process.exit(1)
  }
  const y = Number(year)
  const f = { fetchedAt: new Date().toISOString(), city, year: y, sankranti: await sankrantis(city, y), eclipses: await eclipses(city, y), pushya: await pushya(city, y) }
  mkdirSync('tests/fixtures/marks', { recursive: true })
  const file = `tests/fixtures/marks/${city}-${year}.json`
  writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
  console.log(`${file}: ${f.sankranti.length} Sankrantis, ${f.eclipses.length} eclipses, ${f.pushya.length} Pushya windows`)
}
