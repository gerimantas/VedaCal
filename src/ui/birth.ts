// Birth data (PLAN-periods Q7.1, SPEC 13.6): what the user enters in Settings, turned into the
// engine's Birth. Only the birth instant matters; the place only says which clock the time was
// read on (its time zone), so the nearest city in the same country is enough.
import { birthOf, type Birth } from '../core/periods'
import { zonedTimeToUtc } from '../core/time'

export type BirthInput = {
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, null = not known
  place: { name: string; cc: string; country: string; tz: string }
  /** With no time and a star change that day: the star of the part of the day the user picked. */
  star: number | null
}

/** A part of the birth day under one star: the user picks it by clock time, not by name. */
export type DayPart = { star: number; start: Date; end: Date }

const MIN = 60_000
const starAt = (t: number) => birthOf(new Date(t)).star

/**
 * The Birth for the entered data. With no time, the day is cut where the Moon's star changes
 * (to the minute): one part is enough; two or more → `parts`, and the user's pick (or none)
 * decides. A sign, lunar day or month that changes within the picked part is left unknown (0).
 */
export function resolveBirth(b: BirthInput): { birth: Birth | null; parts: DayPart[] } {
  const [y, m, d] = b.date.split('-').map(Number)
  if (b.time) {
    const [h, mm] = b.time.split(':').map(Number)
    return { birth: birthOf(zonedTimeToUtc(b.place.tz, y, m, d, h, mm)), parts: [] }
  }
  const start = zonedTimeToUtc(b.place.tz, y, m, d).getTime()
  const end = zonedTimeToUtc(b.place.tz, y, m, d + 1).getTime()
  // Half-hour steps, then each change found to the minute.
  const parts: DayPart[] = [{ star: starAt(start), start: new Date(start), end: new Date(end) }]
  for (let t = start; t < end; t += 30 * MIN) {
    const next = Math.min(t + 30 * MIN, end - 1)
    if (starAt(next) === parts[parts.length - 1].star) continue
    let lo = t, hi = next
    while (hi - lo > MIN) {
      const mid = (lo + hi) / 2
      if (starAt(mid) === parts[parts.length - 1].star) lo = mid
      else hi = mid
    }
    const at = new Date(Math.round(hi / MIN) * MIN)
    parts[parts.length - 1].end = at
    parts.push({ star: starAt(next), start: at, end: new Date(end) })
  }
  const star = parts.length === 1 ? parts[0].star : b.star !== null && parts.some((p) => p.star === b.star) ? b.star : null
  if (star === null) return { birth: null, parts }
  const part = parts.find((p) => p.star === star)!
  const samples: Birth[] = []
  for (let t = part.start.getTime(); t < part.end.getTime(); t += 30 * MIN) samples.push(birthOf(new Date(t)))
  samples.push(birthOf(new Date(part.end.getTime() - 1)))
  const one = (k: keyof Birth) => (samples.every((s) => s[k] === samples[0][k]) ? samples[0][k] : 0)
  return { birth: { star, sign: one('sign'), tithi: one('tithi'), month: one('month') }, parts: parts.length > 1 ? parts : [] }
}
