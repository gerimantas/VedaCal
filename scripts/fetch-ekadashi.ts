// Fetch Drik's yearly Ekadashi list for a city and store it as a fixture.
//   node scripts/fetch-ekadashi.ts <city> <year>
// Each Ekadashi can list several days: the Smarta (household) day first, then "Gauna" or
// "Vaishnava" alternatives. We store all, and `smarta` = the first day carrying a plain name.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CITIES, type CityKey } from './cities.ts'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const text = (html: string) =>
  html.replace(/<[^>]*>/g, ' | ').replace(/&[#\w]+;/g, ' ').replace(/(\s*\|\s*)+/g, ' | ')

export async function fetchEkadashi(city: CityKey, year: number) {
  const c = CITIES[city]
  const url = `https://www.drikpanchang.com/vrats/ekadashidates.html?geoname-id=${c.drikId}&year=${year}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VedaCal test fixtures)' } })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const html = await res.text()
  if (!html.includes(c.drikName)) throw new Error(`${url}: page is not for ${c.drikName}`)
  const body = text(html.slice(html.indexOf(`${year} Ekadashi Dates`)))

  const dateRe = new RegExp(`(${MONTHS.join('|')}) (\\d{1,2}), ${year}, \\w+`, 'g')
  const groups = body.split(/Ends - [^|]+\|[^|]+\|[^|]*\|[^|]+\|/).slice(0, -1)
  return {
    source: url,
    fetchedAt: new Date().toISOString(),
    city,
    year,
    ekadashis: groups.map((g) => {
      const days: { date: string; names: string[] }[] = []
      const marks = [...g.matchAll(dateRe)]
      marks.forEach((m, i) => {
        const date = `${year}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`
        const chunk = g.slice(m.index! + m[0].length, marks[i + 1]?.index ?? g.indexOf('Begins - '))
        const names = [...new Set(chunk.split('|').map((s) => s.replace(/^.*">/, '').trim()).filter((s) => /Ekadashi|dwadashi/i.test(s) && !s.startsWith('on ') && !/^(Krishna|Shukla) Ekadashi$/.test(s) && !s.includes(',')))]
        days.push({ date, names })
      })
      const smarta = days.find((d) => d.names.some((n) => /Ekadashi$/.test(n) && !/^(Gauna|Vaishnava)/.test(n)))
      const tithi = [...g.matchAll(/\| (\w+), (Krishna|Shukla) Ekadashi \|/g)].at(-1)
      return { masa: tithi?.[1] ?? null, paksha: tithi?.[2] ?? null, smarta: smarta?.date ?? null, days }
    }),
  }
}

if (import.meta.main) {
  const [city, year] = process.argv.slice(2) as [CityKey, string]
  if (!CITIES[city] || !year) {
    console.error(`usage: node scripts/fetch-ekadashi.ts <${Object.keys(CITIES).join('|')}> <year>`)
    process.exit(1)
  }
  mkdirSync('tests/fixtures/ekadashi', { recursive: true })
  const f = await fetchEkadashi(city, Number(year))
  const file = `tests/fixtures/ekadashi/${city}-${year}.json`
  writeFileSync(file, JSON.stringify(f, null, 2) + '\n')
  console.log(`${file}: ${f.ekadashis.length} Ekadashis; Smarta days: ${f.ekadashis.map((e) => e.smarta?.slice(5)).join(' ')}`)
}
