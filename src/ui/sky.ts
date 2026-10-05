// Sky screen chart (user, 2026-10-05; prototype mockups/sky-flat.ts): the Sun, the Moon and
// the Earth share one plane, so a top-down chart says it all. Earth in the centre; the Moon's
// orbit cut into the 30 lunar days counted from the Sun; the Sun in its direction; a ring of
// the 27 Moon stars; and an outer ring of the 12 signs. Not to scale: only directions are true.
// Stars and signs stay fixed, as in the sky; the Sun and the Moon move across them.
// Text rules: only short marks on the chart (names live in the panel), and labels give way
// to the Sun and the Moon. Colours come from screens.css (.sky-chart), so both themes work.
import { skyAt } from '../core/panchang'
import { content, entry, t } from './format'

const norm = (d: number) => ((d % 360) + 360) % 360
const rad = (deg: number) => (deg * Math.PI) / 180

// Geometry: sidereal longitude → screen angle. Mesha starts at the left, counter-clockwise.
const C = 200
const R = { earth: 12, moon: 56, orbitIn: 76, orbitOut: 94, dayNum: 85, sun: 112.5, nakIn: 120, nakOut: 138, signOut: 164 }
const screen = (lon: number) => 180 + lon
const xy = (deg: number, r: number) => [C + r * Math.cos(rad(deg)), C - r * Math.sin(rad(deg))] as const
const f = (n: number) => n.toFixed(2)

/** Annulus sector from angle a to b (counter-clockwise). */
function sector(a: number, b: number, r1: number, r2: number): string {
  const large = b - a > 180 ? 1 : 0
  const [x1, y1] = xy(a, r2)
  const [x2, y2] = xy(b, r2)
  const [x3, y3] = xy(b, r1)
  const [x4, y4] = xy(a, r1)
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 ${large} 0 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 ${large} 1 ${f(x4)} ${f(y4)}Z`
}

/** Text along the circle at angle `deg`, turned so it never reads upside down. */
function arcText(deg: number, r: number, str: string, cls: string): string {
  const [x, y] = xy(deg, r)
  const a = norm(deg)
  const rot = a > 180 ? -90 - a : 90 - a
  return `<text class="${cls}" x="${f(x)}" y="${f(y)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" text-anchor="middle" dominant-baseline="central">${str}</text>`
}

/** Two lines along the circle: plain name outward, Sanskrit inward (flipped on the lower half). */
function arcText2(deg: number, r: number, gap: number, plain: string, sanskrit: string, cls: string): string {
  const lower = norm(deg) > 180
  const d = (lower ? -gap : gap) / 2
  return arcText(deg, r + d, plain, `${cls} plain`) + arcText(deg, r - d, sanskrit, `${cls} sk`)
}

/** A disc lit on the half that faces the Sun (true geometry seen from above). */
function body(deg: number, r: number, size: number, sunDeg: number, cls: string): string {
  const [x, y] = xy(deg, r)
  const p = (a: number) => [x + size * Math.cos(rad(a)), y - size * Math.sin(rad(a))]
  const [sx, sy] = p(sunDeg + 90)
  const [ex, ey] = p(sunDeg - 90)
  return `<circle class="${cls} night" cx="${f(x)}" cy="${f(y)}" r="${size}"/>
    <path class="${cls} day" d="M${f(sx)} ${f(sy)}A${size} ${size} 0 0 1 ${f(ex)} ${f(ey)}Z"/>`
}

type Rashi = { name: string; title: string }
export const rashi = (k: number) => (content.rashi as Record<string, Rashi>)[String(k)]

export interface SkyView {
  svg: string
  elongation: number
  tithi: number
  nakshatra: number
  moonSign: number
  sunSign: number
  illumination: number
}

export function skyView(when: Date): SkyView {
  const { sun, moon } = skyAt(when)
  const elong = norm(moon - sun)
  const tithi = Math.floor(elong / 12) + 1
  const nak = Math.floor(moon / (360 / 27)) + 1
  const moonSign = Math.floor(moon / 30) + 1
  const sunSign = Math.floor(sun / 30) + 1
  const sunDeg = screen(sun)
  const moonDeg = screen(moon)
  const shapes: string[] = []
  const labels: string[] = [] // drawn over the pointer lines

  // Signs (outer ring), two-line names.
  for (let k = 0; k < 12; k++) {
    const a = screen(k * 30)
    const both = k + 1 === sunSign && k + 1 === moonSign
    const cls = both ? 'both' : k + 1 === sunSign ? 'sun-fill' : k + 1 === moonSign ? 'moon-fill' : k % 2 ? 'alt' : 'base'
    shapes.push(`<path class="${cls}" d="${sector(a, a + 30, R.nakOut, R.signOut)}"/>`)
    const on = k + 1 === sunSign || k + 1 === moonSign
    labels.push(arcText2(screen(k * 30 + 15), R.signOut - 12, 9, rashi(k + 1).title, rashi(k + 1).name, on ? 'sign on' : 'sign'))
  }

  // Moon stars (middle ring): numbers only, the current one bold; its name is in the panel.
  for (let k = 0; k < 27; k++) {
    const a = screen((k * 360) / 27)
    const on = k + 1 === nak
    shapes.push(`<path class="${on ? 'moon-fill' : k % 2 ? 'alt' : 'base'}" d="${sector(a, a + 360 / 27, R.nakIn, R.nakOut)}"/>`)
    labels.push(arcText(a + 180 / 27, (R.nakIn + R.nakOut) / 2, String(k + 1), on ? 'current' : 'num'))
  }

  // The Moon's orbit: 30 lunar days from the Sun, waxing half lighter, the current day lit.
  shapes.push(`<path class="wax" d="${sector(sunDeg, sunDeg + 180, R.orbitIn, R.orbitOut)}"/>`)
  shapes.push(`<path class="wane" d="${sector(sunDeg + 180, sunDeg + 360, R.orbitIn, R.orbitOut)}"/>`)
  const t0 = sunDeg + (tithi - 1) * 12
  shapes.push(`<path class="day-fill" d="${sector(t0, t0 + 12, R.orbitIn, R.orbitOut)}"/>`)
  for (let k = 0; k < 30; k++) {
    const [x1, y1] = xy(sunDeg + k * 12, R.orbitIn)
    const [x2, y2] = xy(sunDeg + k * 12, R.orbitOut)
    shapes.push(`<line class="${k % 15 ? 'tick' : 'tick major'}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`)
    labels.push(arcText(sunDeg + k * 12 + 6, R.dayNum, String(k + 1), k + 1 === tithi ? 'current' : 'num'))
  }

  // Moon-ring labels along its outer edge, plain name first, Sanskrit after. A label that would
  // sit on the Sun's or the Moon's line slides along the ring until it clears it.
  const r = R.orbitOut + 5
  const label = (plain: string, sanskrit: string) => `${plain} · <tspan class="phase-sk">${sanskrit}</tspan>`
  const halfWidth = (chars: number) => ((chars * 3.5) / 2 / r) * (180 / Math.PI)
  const clear = (center: number, half: number) => {
    for (const obstacle of [sunDeg, moonDeg]) {
      const d = norm(center - obstacle + 180) - 180
      if (Math.abs(d) < half + 3) center = obstacle + (d >= 0 ? half + 3 : -(half + 3))
    }
    return center
  }
  for (const [deg, plain, sanskrit] of [
    [sunDeg + 90, t('skyWaxing'), 'Shukla'],
    [sunDeg + 270, t('skyWaning'), 'Krishna'],
    [sunDeg + 0.01, t('skyNewMoon'), entry('tithi', 30).name],
    [sunDeg + 180, t('skyFullMoon'), entry('tithi', 15).name],
  ] as const)
    labels.push(arcText(clear(deg, halfWidth(plain.length + sanskrit.length + 3)), r, label(plain, sanskrit), 'phase'))

  // Pointers from the Earth, and the Sun → Moon angle with an arrow at the Moon's end.
  const [mx, my] = xy(moonDeg, R.nakOut)
  const [sx, sy] = xy(sunDeg, R.nakOut)
  shapes.push(`<line class="ptr moon" x1="${C}" y1="${C}" x2="${f(mx)}" y2="${f(my)}"/>`)
  shapes.push(`<line class="ptr sun" x1="${C}" y1="${C}" x2="${f(sx)}" y2="${f(sy)}"/>`)
  const [ax1, ay1] = xy(sunDeg, 32)
  const [ax2, ay2] = xy(moonDeg - 4, 32)
  shapes.push(`<path class="angle" marker-end="url(#sky-arrow)" d="M${f(ax1)} ${f(ay1)}A32 32 0 ${elong > 184 ? 1 : 0} 0 ${f(ax2)} ${f(ay2)}"/>`)
  const [lx, ly] = xy(sunDeg + elong / 2, 44)
  labels.push(`<text class="deg" x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="central">${Math.round(elong)}°</text>`)

  // Bodies on top: the Sun with its glow, the Moon inside its ring, the Earth in the centre.
  const [gx, gy] = xy(sunDeg, R.sun)
  const bodies = [
    `<circle class="glow" cx="${f(gx)}" cy="${f(gy)}" r="12" fill="url(#sky-glow)"/><circle class="sun-disc" cx="${f(gx)}" cy="${f(gy)}" r="7"/>`,
    body(moonDeg, R.moon, 8, sunDeg, 'moon-body'),
    body(0, 0, R.earth, sunDeg, 'earth'),
  ]

  const svg = `<svg class="sky-chart" viewBox="34 34 332 332" role="img" aria-label="${t('skyTitle')}">
    <defs>
      <radialGradient id="sky-glow"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient>
      <marker id="sky-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker>
    </defs>
    ${shapes.join('')}${labels.join('')}${bodies.join('')}
  </svg>`
  return { svg, elongation: elong, tithi, nakshatra: nak, moonSign, sunSign, illumination: (1 - Math.cos(rad(elong))) / 2 }
}
