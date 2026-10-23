// scalePos: where the colour at a moment sits on the 7-step rainbow scale (shared by the ring and the legend marker).
import { describe, expect, it } from 'vitest'
import type { Segment, Tier } from '../src/core/periods'
import { scalePos } from '../src/ui/verdict'

const MIN = 60_000
const T0 = Date.UTC(2026, 9, 23, 0, 0)
const at = (m: number) => new Date(T0 + m * MIN)
const seg = (a: number, b: number, tier: Tier) => ({ start: at(a), end: at(b), tier }) as unknown as Segment
// avoid 0, fb 1, neutralPlus 2, neutral 3, goodPlus 4, goodBase 5, best 6
const segs = [seg(0, 120, 'avoid'), seg(120, 180, 'best'), seg(180, 200, 'neutral'), seg(200, 400, 'fb')]

describe('scalePos', () => {
  it('is the own index in the middle of a segment', () => {
    expect(scalePos(segs, at(60))).toBe(0)
    expect(scalePos(segs, at(150))).toBe(6)
    expect(scalePos(segs, at(300))).toBe(1)
  })
  it('is the midpoint of both indices at an exact boundary, from both sides', () => {
    expect(scalePos(segs, at(120))).toBe(3) // best side: 6 + (0 - 6) * 0.5
    expect(scalePos(segs, new Date(at(120).getTime() - 1))).toBeCloseTo(3, 4) // avoid side
  })
  it('moves a quarter of the way 10 minutes before a boundary with a 20-minute fade', () => {
    expect(scalePos(segs, at(110))).toBeCloseTo(0 + (6 - 0) * 0.25, 10)
    expect(scalePos(segs, at(130))).toBeCloseTo(6 + (0 - 6) * 0.25, 10)
  })
  it('uses half the length for a segment shorter than 40 minutes', () => {
    // neutral 180-200 (20 min): fade 10; at 185, dl = 5 min -> 3 + (6 - 3) * 0.5 * 0.5
    expect(scalePos(segs, at(185))).toBeCloseTo(3.75, 10)
    expect(scalePos(segs, at(190))).toBe(3) // exact middle: both edges are a full fade away
  })
  it('stays at the own index at the outer edges with no neighbour', () => {
    expect(scalePos(segs, at(0))).toBe(0)
    expect(scalePos(segs, at(399))).toBe(1)
  })
})
