// Accuracy report, not a gate: mean/min/max of (ours − reference) in seconds per element.
// Run with `npm run accuracy`; skipped in normal test runs.
import { readdirSync, readFileSync } from 'node:fs'
import { it } from 'vitest'
import { computeDay } from '../src/core/panchang'
import type { DayPanchang, Span } from '../src/core/types'
import { CITIES, type CityKey } from '../scripts/cities'

it.runIf(process.env.ACCURACY)('accuracy report', () => {
  const rows: string[] = []
  for (const dir of ['drik', 'mypanchang']) {
    const diffs: Record<string, number[]> = {}
    const add = (k: string, ours: Date | null, ref: string) => {
      if (ours) (diffs[k] ??= []).push((ours.getTime() - Date.parse(ref)) / 1000)
    }
    for (const file of readdirSync(`tests/fixtures/${dir}`)) {
      const f = JSON.parse(readFileSync(`tests/fixtures/${dir}/${file}`, 'utf8'))
      const c = CITIES[f.city as CityKey]
      const day = computeDay(f.date, { name: '', country: '', lat: c.lat, lon: c.lon, elevation: c.elevation, tz: c.tz })
      if (dir === 'drik') {
        add('sunrise', day.sunrise, f.sunrise)
        add('sunset', day.sunset, f.sunset)
      }
      for (const el of ['tithi', 'nakshatra', 'yoga', 'karana'] as const) {
        for (const ref of f[el] as { end: string | null }[]) {
          if (!ref.end || ref.end === 'fullNight') continue
          const target = Date.parse(ref.end)
          const spans: Span[] = (day as DayPanchang)[el]
          const best = spans.reduce((a, b) => (Math.abs(b.end.getTime() - target) < Math.abs(a.end.getTime() - target) ? b : a))
          add(el, best.end, ref.end)
        }
      }
    }
    for (const [k, v] of Object.entries(diffs)) {
      const mean = v.reduce((a, b) => a + b, 0) / v.length
      const n = (x: number) => x.toFixed(0).padStart(5)
      rows.push(`${dir.padEnd(10)} ${k.padEnd(9)} n=${String(v.length).padStart(3)}  mean${n(mean)} s  min${n(Math.min(...v))}  max${n(Math.max(...v))}`)
    }
  }
  process.stdout.write('\n' + rows.join('\n') + '\n')
})
