// Time-zone helpers built only on Intl — no time-zone library needed.

// Creating an Intl.DateTimeFormat is expensive in browsers; keep one per zone and purpose.
const formatters = new Map<string, Intl.DateTimeFormat>()
const formatter = (tz: string, kind: 'parts' | 'date') => {
  const k = `${kind}|${tz}`
  let f = formatters.get(k)
  if (!f) {
    f =
      kind === 'parts'
        ? new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(k, f)
  }
  return f
}

/** Offset of `tz` from UTC at instant `at`, in minutes east of UTC (e.g. +180 for EEST). */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = formatter(tz, 'parts').formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** The UTC instant at which the wall clock in `tz` shows the given local time. */
export function zonedTimeToUtc(
  tz: string,
  year: number,
  month: number, // 1-12
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second)
  // Two passes settle the offset, including on DST change days.
  let t = wall - tzOffsetMinutes(tz, new Date(wall)) * 60_000
  t = wall - tzOffsetMinutes(tz, new Date(t)) * 60_000
  return new Date(t)
}

/** Civil date YYYY-MM-DD of instant `at` in `tz`. */
export function civilDate(tz: string, at: Date): string {
  return formatter(tz, 'date').format(at)
}

/** Add `days` to a YYYY-MM-DD civil date. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
