// Birth data (PLAN-periods Q7.1, SPEC 13.6): what the user enters in Settings, turned into the
// engine's Birth. Only the birth instant matters; the place only says which clock the time was
// read on (its time zone), so the nearest city in the same country is enough.
import { birthOf, type Birth } from '../core/periods'
import { zonedTimeToUtc } from '../core/time'

export type BirthInput = {
  date: string // YYYY-MM-DD
  time: string | null // HH:MM, null = not known
  place: { name: string; cc: string; country: string; tz: string }
  /** With no time and two stars that day: the one the user picked. */
  star: number | null
}

const MIN = 60_000

/**
 * The Birth for the entered data. With no time, the day is sampled every half hour: one star
 * all day is enough; two or more → `choices`, and the user's pick (or none) decides. A sign,
 * lunar day or month that changes within the picked star's hours is left unknown (0).
 */
export function resolveBirth(b: BirthInput): { birth: Birth | null; choices: number[] } {
  const [y, m, d] = b.date.split('-').map(Number)
  if (b.time) {
    const [h, mm] = b.time.split(':').map(Number)
    return { birth: birthOf(zonedTimeToUtc(b.place.tz, y, m, d, h, mm)), choices: [] }
  }
  const start = zonedTimeToUtc(b.place.tz, y, m, d).getTime()
  const end = zonedTimeToUtc(b.place.tz, y, m, d + 1).getTime() - MIN
  const samples: Birth[] = []
  for (let t = start; t < end; t += 30 * MIN) samples.push(birthOf(new Date(t)))
  samples.push(birthOf(new Date(end)))
  const choices = [...new Set(samples.map((s) => s.star))]
  const star = choices.length === 1 ? choices[0] : b.star !== null && choices.includes(b.star) ? b.star : null
  if (star === null) return { birth: null, choices }
  const mine = samples.filter((s) => s.star === star)
  const one = (k: keyof Birth) => (mine.every((s) => s[k] === mine[0][k]) ? mine[0][k] : 0)
  return { birth: { star, sign: one('sign'), tithi: one('tithi'), month: one('month') }, choices: choices.length > 1 ? choices : [] }
}
