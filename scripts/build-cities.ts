// Builds src/data/cities.json from GeoNames (CC BY 4.0, .planning/SPEC.md section 6):
// every place with more than 15,000 people, trimmed to what a Location needs plus the
// population (search ranking) and the region name (to tell same-named cities apart).
// Run: node scripts/build-cities.ts   (downloads ~3 MB from download.geonames.org)
import { mkdirSync, writeFileSync } from 'node:fs'
import { gzipSync, inflateRawSync } from 'node:zlib'

const DUMP = 'https://download.geonames.org/export/dump/'

async function text(file: string): Promise<string> {
  const res = await fetch(DUMP + file)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return file.endsWith('.zip') ? unzipFirst(buf) : buf.toString('utf8')
}

/** First file of a ZIP archive, read through its central directory. */
function unzipFirst(zip: Buffer): string {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const cd = zip.readUInt32LE(eocd + 16)
  const method = zip.readUInt16LE(cd + 10)
  const size = zip.readUInt32LE(cd + 20)
  const local = zip.readUInt32LE(cd + 42)
  const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
  const data = zip.subarray(start, start + size)
  return (method === 8 ? inflateRawSync(data) : data).toString('utf8')
}

const rows = (tsv: string) => tsv.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'))

const [cities, countryInfo, admin1Codes] = await Promise.all([
  text('cities15000.zip'),
  text('countryInfo.txt'),
  text('admin1CodesASCII.txt'),
])

const countryName = new Map(rows(countryInfo).map((r) => [r[0], r[4]]))
const admin1Name = new Map(rows(admin1Codes).map((r) => [r[0], r[1]]))

// Repeated strings go into tables; each city row points at them by index.
const tables = { countries: [] as string[][], regions: [] as string[], zones: [] as string[] }
const indexer = <T>(list: T[], key: (x: T) => string) => {
  const seen = new Map<string, number>()
  return (x: T) => {
    const k = key(x)
    let i = seen.get(k)
    if (i === undefined) seen.set(k, (i = list.push(x) - 1))
    return i
  }
}
const countryIdx = indexer(tables.countries, (c) => c[0])
const regionIdx = indexer(tables.regions, (r) => r)
const zoneIdx = indexer(tables.zones, (z) => z)

const round = (x: string) => Math.round(Number(x) * 1e4) / 1e4
const list = rows(cities)
  // PPLX = a section of a city (Antakalnis in Vilnius): GPS in the centre must name the city.
  .filter((r) => r[7] !== 'PPLX')
  .map((r) => ({ r, pop: Number(r[14]) }))
  .sort((a, b) => b.pop - a.pop)
  .map(({ r, pop }) => {
    const cc = r[8]
    const elevation = r[15] ? Number(r[15]) : Number(r[16])
    return [
      r[1],
      countryIdx([cc, countryName.get(cc) ?? cc]),
      regionIdx(admin1Name.get(`${cc}.${r[10]}`) ?? ''),
      round(r[4]),
      round(r[5]),
      elevation > -1000 ? elevation : 0, // GeoNames writes -9999 for "unknown"
      zoneIdx(r[17]),
      pop,
    ]
  })

const json = JSON.stringify({
  source: 'GeoNames cities15000, CC BY 4.0, https://www.geonames.org/',
  built: new Date().toISOString().slice(0, 10),
  columns: ['name', 'country', 'region', 'lat', 'lon', 'elevation', 'tz', 'population'],
  ...tables,
  cities: list,
})
mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/cities.json', json)
console.log(`${list.length} cities, ${(json.length / 1024).toFixed(0)} KiB, ${(gzipSync(json).length / 1024).toFixed(0)} KiB gzipped`)
