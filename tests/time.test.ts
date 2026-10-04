import { describe, expect, it } from 'vitest'
import { addDays, civilDate, tzOffsetMinutes, zonedTimeToUtc } from '../src/core/time'

describe('time helpers', () => {
  it('gives summer and winter offsets for Vilnius', () => {
    expect(tzOffsetMinutes('Europe/Vilnius', new Date('2026-07-01T12:00:00Z'))).toBe(180)
    expect(tzOffsetMinutes('Europe/Vilnius', new Date('2026-12-01T12:00:00Z'))).toBe(120)
  })

  it('converts local wall time to UTC across the EU DST change (2026-10-25)', () => {
    expect(zonedTimeToUtc('Europe/Vilnius', 2026, 10, 24, 7, 30).toISOString()).toBe('2026-10-24T04:30:00.000Z')
    expect(zonedTimeToUtc('Europe/Vilnius', 2026, 10, 25, 7, 30).toISOString()).toBe('2026-10-25T05:30:00.000Z')
  })

  it('handles the US DST start (2026-03-08) and India (no DST, +5:30)', () => {
    expect(zonedTimeToUtc('America/New_York', 2026, 3, 8, 12, 0).toISOString()).toBe('2026-03-08T16:00:00.000Z')
    expect(zonedTimeToUtc('Asia/Kolkata', 2026, 10, 4, 6, 0).toISOString()).toBe('2026-10-04T00:30:00.000Z')
  })

  it('gives the civil date in the location, not the device', () => {
    expect(civilDate('Pacific/Auckland', new Date('2026-10-04T12:00:00Z'))).toBe('2026-10-05')
    expect(civilDate('America/New_York', new Date('2026-10-04T02:00:00Z'))).toBe('2026-10-03')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
