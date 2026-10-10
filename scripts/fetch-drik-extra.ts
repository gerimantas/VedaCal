// Fetch Drik Panchang's Hora, Gowri, Udaya Lagna, Panchaka Rahita, Chandrabalam, Tarabalam and
// Do Ghati pages for a city and dates, and store them together as one fixture per day
// (.planning/PLAN-periods.md Q0.3). The day page leaves these sections empty.
//   node scripts/fetch-drik-extra.ts <city> [<YYYY-MM-DD> ...]
// Without dates: every date that tests/fixtures/drik/ holds for the city.
// Fixtures are evidence: values come from the pages, never typed by hand.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'
import { drikPage } from './drik-page.ts'
import { instant } from './fetch-drik.ts'

const D = 'https://www.drikpanchang.com'
const PAGES = {
  hora: '/muhurat/hora.html',
  gowri: '/tamil/tamil-gowri-panchangam.html',
  lagna: '/muhurat/lagna.html',
  panchakaRahita: '/muhurat/panchaka-rahita-muhurat.html',
  chandrabalam: '/panchang/chandrabalam/chandrabalam-timings.html',
  tarabalam: '/panchang/tarabalam/tarabalam-timings.html',
  doGhati: '/muhurat/daily/do-ghati-muhurat.html',
} as const

const RASHIS = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')

const T = String.raw`\d{1,2}:\d{2} [AP]M(?: , [A-Z][a-z]{2} \d{1,2})?`
const any = (names: readonly string[]) => names.join('|')

/** The page's table: from the date picker to the notes under it. */
function table(page: string, url: string) {
  const a = page.indexOf('Choose Date')
  const b = page.indexOf('Notes:', a)
  if (a < 0 || b < 0) throw new Error(`${url}: no table`)
  return page.slice(a, b)
}

export async function fetchDrikExtra(city: CityKey, date: string) {
  const c = CITIES[city]
  const [y, m, d] = date.split('-')
  const at = (s: string) => instant(c.tz, date, s)
  // Drik dates only times past midnight, and a start never: "10:55 PM to 12:01 AM , Oct 11",
  // "12:01 AM to 01:06 AM , Oct 11". A start takes its end's date unless that puts it after the end.
  const span = (start: string, end: string) => {
    const k = end.indexOf(' ,')
    const s = at(k >= 0 ? start + end.slice(k) : start)
    return { start: s > at(end) ? at(start) : s, end: at(end) }
  }

  const source: Record<string, string> = {}
  const tables: Record<string, string> = {}
  for (const [k, path] of Object.entries(PAGES)) {
    const url = `${D}${path}?geoname-id=${c.drikId}&date=${d}/${m}/${y}`
    const html = await drikPage(url)
    if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
    source[k] = url
    tables[k] = table(text(html), url)
  }

  // "Saturn - Sluggish 07:38 AM to 08:32 AM" — 12 day + 12 night planetary hours.
  const hourRows = (s: string, re: RegExp) => [...s.matchAll(re)].map((r) => ({ name: r[1], quality: r[2], ...span(r[3], r[4]) }))
  const dayNight = (s: string, a: string, b: string, re: RegExp, n: number, url: string) => {
    const i = s.indexOf(a)
    const j = s.indexOf(b, i)
    if (i < 0 || j < 0) throw new Error(`${url}: no "${a}" / "${b}"`)
    const out = { day: hourRows(s.slice(i, j), re), night: hourRows(s.slice(j), re) }
    if (out.day.length !== n || out.night.length !== n) throw new Error(`${url}: expected ${n} + ${n} rows, got ${out.day.length} + ${out.night.length}`)
    return out
  }
  const hora = dayNight(tables.hora, 'Day Hora', 'Night Hora', new RegExp(String.raw`(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn) - ([A-Za-z]+) (${T}) to (${T})`, 'g'), 12, source.hora)
  // "Soram - Bad 07:38 AM to 09:00 AM" — 8 day + 8 night parts.
  const gowri = dayNight(tables.gowri, 'Day Muhurtham', 'Night Muhurtham', new RegExp(String.raw`([A-Z][a-z]+) - ([A-Za-z]+) (${T}) to (${T})`, 'g'), 8, source.gowri)

  // "Kanya 05:30 AM to 08:27 AM Pushkara Navamsha Push. Nav. - 06:52 AM" — the first lagna
  // starts before sunrise; a lagna may hold none, one or more Pushkara Navamsha moments.
  const lagnaRe = new RegExp(String.raw`(${any(RASHIS)}) (${T}) to (${T})((?: Pushkara Navamsha)?(?: Push\. Nav\. - ${T})*)`, 'g')
  const lagna = [...tables.lagna.matchAll(lagnaRe)].map((r) => ({
    rashi: r[1],
    ...span(r[2], r[3]),
    pushkaraNavamsha: [...r[4].matchAll(new RegExp(String.raw`Push\. Nav\. - (${T})`, 'g'))].map((p) => at(p[1])),
  }))
  if (lagna.length < 12) throw new Error(`${source.lagna}: expected 12+ lagnas, got ${lagna.length}`)

  // "Agni - Risk 07:38 AM to 08:27 AM" — sunrise to next sunrise, split by lagna, tithi and nakshatra.
  const panchakaRahita = [...tables.panchakaRahita.matchAll(new RegExp(String.raw`(Shubha|Mrityu|Agni|Raja|Chora|Roga) - ([A-Za-z]+) (${T}) to (${T})`, 'g'))].map((r) => ({ name: r[1], quality: r[2], ...span(r[3], r[4]) }))
  if (!panchakaRahita.length) throw new Error(`${source.panchakaRahita}: no windows`)

  // "Mesha Good after 07:34 AM , Oct 11 Good" — the state for each birth sign (Chandrabalam) or
  // birth star (Tarabalam), changing when the Moon's sign or star changes. `from: null` = sunrise.
  const states = (s: string, names: readonly string[], state: string, url: string) => {
    const re = new RegExp(String.raw`(?:^| )(${any(names)}) (${state}(?: after ${T} ${state})*)(?= |$)`, 'g')
    const rows = [...s.matchAll(re)].map((r) => {
      const parts = r[2].split(new RegExp(String.raw` after (${T}) `))
      const spans = [{ from: null as string | null, state: parts[0] }]
      for (let i = 1; i < parts.length; i += 2) spans.push({ from: at(parts[i]), state: parts[i + 1] })
      return { name: r[1], spans }
    })
    if (rows.length !== names.length || new Set(rows.map((r) => r.name)).size !== names.length) throw new Error(`${url}: expected ${names.length} rows, got ${rows.length}`)
    return rows
  }
  const chandrabalam = states(tables.chandrabalam, RASHIS, '(?:Good|Bad|Puja Needed)', source.chandrabalam)
  const tara = '(?:Janma|Sampata|Vipata|Kshema|Pratyari|Sadhaka|Naidhana|Mitra|Param Mitra) - (?:Very Good|Good|Not Good|Totally Bad|Bad)'
  const tarabalam = states(tables.tarabalam, NAKSHATRAS, tara, source.tarabalam)

  // "Madhyahna - Abhijit Muhurat 12:44 PM to 01:27 PM" — 15 day + 15 night muhurtas (2 ghati
  // each), named by the part of the day, some with a label (Abhijit, Vijay, Sandhya, Nishita).
  const ghatiRe = new RegExp(String.raw`(Pratah|Sangava|Madhyahna|Aparahna|Sayahna|Pradosha|Ratri|Nishita|Arunodaya)(?: - ((?:1/2 )?[A-Z][A-Za-z ]+?))? (${T}) to (${T})`, 'g')
  const ghatiRows = (s: string) => [...s.matchAll(ghatiRe)].map((r) => ({ part: r[1], label: r[2] ?? null, ...span(r[3], r[4]) }))
  const gd = tables.doGhati.indexOf('Day Muhurat Division')
  const gn = tables.doGhati.indexOf('Night Muhurat Division', gd)
  if (gd < 0 || gn < 0) throw new Error(`${source.doGhati}: no day / night division`)
  const doGhati = { day: ghatiRows(tables.doGhati.slice(gd, gn)), night: ghatiRows(tables.doGhati.slice(gn)) }
  if (doGhati.day.length !== 15 || doGhati.night.length !== 15) throw new Error(`${source.doGhati}: expected 15 + 15 muhurtas, got ${doGhati.day.length} + ${doGhati.night.length}`)

  return { source, fetchedAt: new Date().toISOString(), city, date, tz: c.tz, hora, gowri, lagna, panchakaRahita, chandrabalam, tarabalam, doGhati }
}

if (import.meta.main) {
  const [city, ...given] = process.argv.slice(2) as [CityKey, ...string[]]
  if (!CITIES[city]) {
    console.error(`usage: node scripts/fetch-drik-extra.ts <${Object.keys(CITIES).join('|')}> [<YYYY-MM-DD>...]`)
    process.exit(1)
  }
  const dates = given.length
    ? given
    : readdirSync('tests/fixtures/drik').filter((f) => f.startsWith(`${city}-`)).map((f) => f.slice(city.length + 1, -5))
  mkdirSync('tests/fixtures/drik-extra', { recursive: true })
  for (const date of dates) {
    const f = await fetchDrikExtra(city, date)
    const file = `tests/fixtures/drik-extra/${city}-${date}.json`
    writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
    console.log(`${file}: hora ${f.hora.day.length}+${f.hora.night.length}, gowri ${f.gowri.day.length}+${f.gowri.night.length}, lagna ${f.lagna.length}, panchaka ${f.panchakaRahita.length}`)
  }
}
