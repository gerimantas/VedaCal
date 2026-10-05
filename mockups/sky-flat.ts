// Flat sky prototype (user, 2026-10-05, after the 3D one): the Sun, the Moon and the Earth
// share one plane, so a top-down chart says it all. Earth in the centre, the Moon's orbit cut
// into the 30 lunar days counted from the Sun, the Sun in its direction, and two rings: the
// 27 Moon stars and the 12 signs. Not to scale. Dev server only: /VedaCal/mockups/sky-flat.html
import { Body, Ecliptic, GeoVector } from 'astronomy-engine'
import { getAyanamsa as libraryAyanamsa } from '@ishubhamx/panchangam-js/dist/core/ayanamsa'
import { LANG, content, entry } from '../src/ui/format'
import { realisticMoon } from '../src/ui/moon'

const DRIK_LAHIRI_OFFSET = 24.14 / 3600 // same constant as src/core/panchang.ts
const L = LANG === 'lt'
const text = {
  title: L ? 'Saulė, Mėnulis ir žvaigždės' : 'Sun, Moon and stars',
  tithi: L ? 'Mėnulio diena' : 'Lunar day',
  angle: L ? 'Mėnulis nuo Saulės' : 'Moon from Sun',
  star: L ? 'Mėnulio žvaigždė' : "Moon's star",
  moonSign: L ? 'Mėnulis ženkle' : 'Moon in',
  sunSign: L ? 'Saulė ženkle' : 'Sun in',
  seen: L ? 'Iš Žemės matosi' : 'Seen from Earth',
  newMoon: L ? 'jaunatis' : 'new moon',
  fullMoon: L ? 'pilnatis' : 'full moon',
  note: L
    ? 'Vaizdas iš viršaus, ne pagal mastelį: tikros tik kryptys. Mėnulio orbita padalyta į 30 Mėnulio dienų po 12°, skaičiuojant nuo Saulės.'
    : 'Seen from above, not to scale: only the directions are true. The Moon’s orbit is cut into 30 lunar days of 12° each, counted from the Sun.',
  now: L ? 'Dabar' : 'Now',
}

// ── Astronomy (same formulas as the engine) ─────────────────────────────────────

const norm = (d: number) => ((d % 360) + 360) % 360
const tropical = (body: Body, t: Date) => Ecliptic(GeoVector(body, t, true)).elon
const ayanamsa = (t: Date) => libraryAyanamsa(t) + DRIK_LAHIRI_OFFSET

// ── Geometry: sidereal longitude → screen angle; Mesha starts at the left, counter-clockwise ──

const C = 200
const R = { earth: 12, orbit: 80, sun: 110, nakIn: 126, nakOut: 148, signOut: 186 }
const screen = (lon: number) => 180 + lon
const rad = (deg: number) => (deg * Math.PI) / 180
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

/** A disc lit on the half that faces the Sun (true geometry seen from above). */
function body(deg: number, r: number, size: number, sunDeg: number, day: string, night: string): string {
  const [x, y] = xy(deg, r)
  const p = (a: number) => [x + size * Math.cos(rad(a)), y - size * Math.sin(rad(a))]
  const [sx, sy] = p(sunDeg + 90)
  const [ex, ey] = p(sunDeg - 90)
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${size}" fill="${night}"/>
    <path d="M${f(sx)} ${f(sy)}A${size} ${size} 0 0 1 ${f(ex)} ${f(ey)}Z" fill="${day}"/>`
}

const rashi = (k: number) => (content.rashi as Record<string, { name: string; title: string }>)[String(k)]

function chart(t: Date): { svg: string; elong: number; tithi: number; nak: number; moonSign: number; sunSign: number } {
  const aya = ayanamsa(t)
  const sunLon = norm(tropical(Body.Sun, t) - aya)
  const moonLon = norm(tropical(Body.Moon, t) - aya)
  const elong = norm(moonLon - sunLon)
  const tithi = Math.floor(elong / 12) + 1
  const nak = Math.floor(moonLon / (360 / 27)) + 1
  const moonSign = Math.floor(moonLon / 30) + 1
  const sunSign = Math.floor(sunLon / 30) + 1
  const sunDeg = screen(sunLon)
  const moonDeg = screen(moonLon)
  const out: string[] = []

  // Signs (outer ring).
  for (let k = 0; k < 12; k++) {
    const a = screen(k * 30)
    const cls = k + 1 === sunSign && k + 1 === moonSign ? 'both' : k + 1 === sunSign ? 'sunfill' : k + 1 === moonSign ? 'moonfill' : k % 2 ? 'alt' : 'base'
    out.push(`<path class="${cls}" d="${sector(a, a + 30, R.nakOut, R.signOut)}"/>`)
    out.push(arcText(a + 15, (R.nakOut + R.signOut) / 2, rashi(k + 1).title, k + 1 === sunSign || k + 1 === moonSign ? 'sign on' : 'sign'))
  }
  // Moon stars (inner ring): numbered, the current one named.
  for (let k = 0; k < 27; k++) {
    const a = screen((k * 360) / 27)
    const on = k + 1 === nak
    out.push(`<path class="${on ? 'moonfill' : k % 2 ? 'alt' : 'base'}" d="${sector(a, a + 360 / 27, R.nakIn, R.nakOut)}"/>`)
    if (!on) out.push(arcText(a + 180 / 27, (R.nakIn + R.nakOut) / 2, String(k + 1), 'num'))
  }
  out.push(arcText(screen(((nak - 0.5) * 360) / 27), (R.nakIn + R.nakOut) / 2, entry('nakshatra', nak).name, 'nak'))

  // The Moon's orbit cut into 30 lunar days from the Sun; the current one lit.
  out.push(`<circle class="orbit" cx="${C}" cy="${C}" r="${R.orbit}"/>`)
  const t0 = sunDeg + (tithi - 1) * 12
  out.push(`<path class="tithifill" d="${sector(t0, t0 + 12, R.orbit - 7, R.orbit + 7)}"/>`)
  for (let k = 0; k < 30; k++) {
    const [x1, y1] = xy(sunDeg + k * 12, R.orbit - 7)
    const [x2, y2] = xy(sunDeg + k * 12, R.orbit + 7)
    out.push(`<line class="${k % 15 ? 'tick' : 'tick major'}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`)
  }
  out.push(arcText(sunDeg, R.orbit - 16, text.newMoon, 'phase'))
  out.push(arcText(sunDeg + 180, R.orbit - 16, text.fullMoon, 'phase'))
  out.push(arcText(t0 + 6, R.orbit + 15, String(tithi), 'tithi'))

  // Pointers from the Earth, and the Sun–Moon angle.
  const [mx, my] = xy(moonDeg, R.nakOut)
  const [sx, sy] = xy(sunDeg, R.signOut)
  out.push(`<line class="ptr moon" x1="${C}" y1="${C}" x2="${f(mx)}" y2="${f(my)}"/>`)
  out.push(`<line class="ptr sun" x1="${C}" y1="${C}" x2="${f(sx)}" y2="${f(sy)}"/>`)
  const [ax1, ay1] = xy(sunDeg, 34)
  const [ax2, ay2] = xy(moonDeg, 34)
  out.push(`<path class="angle" d="M${f(ax1)} ${f(ay1)}A34 34 0 ${elong > 180 ? 1 : 0} 0 ${f(ax2)} ${f(ay2)}"/>`)
  const [lx, ly] = xy(sunDeg + elong / 2, 46)
  out.push(`<text class="deg" x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="central">${Math.round(elong)}°</text>`)

  // Bodies: Sun (with glow), Moon on its orbit, Earth in the centre; each lit toward the Sun.
  const [gx, gy] = xy(sunDeg, R.sun)
  out.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="20" fill="url(#glow)"/><circle cx="${f(gx)}" cy="${f(gy)}" r="9" fill="#ffc94d"/>`)
  out.push(body(moonDeg, R.orbit, 8, sunDeg, '#e8e8e8', '#3a3f4a'))
  out.push(body(0, 0, R.earth, sunDeg, '#4f8fd8', '#1b2a44'))

  const svg = `<svg class="chart" viewBox="0 0 400 400" role="img" aria-label="${text.title}">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient></defs>
    <style>
      .base { fill: oklch(24% 0.02 264); } .alt { fill: oklch(28% 0.022 264); }
      .moonfill { fill: #9fd3ff; fill-opacity: 0.35; } .sunfill { fill: #ffb300; fill-opacity: 0.35; }
      .both { fill: #d8c890; fill-opacity: 0.4; } .tithifill { fill: #9fd3ff; fill-opacity: 0.75; }
      .sign { fill: var(--color-muted); font: 600 9.5px var(--font-body); } .sign.on { fill: var(--color-ink); }
      .num { fill: var(--color-neutral); font: 6px var(--font-body); }
      .nak { fill: #fff; font: 700 8.5px var(--font-body); }
      .orbit { fill: none; stroke: var(--color-card-line); stroke-width: 14; }
      .tick { stroke: var(--color-neutral); stroke-width: 0.6; } .tick.major { stroke: var(--color-ink); stroke-width: 1.2; }
      .phase { fill: var(--color-neutral); font: 6.5px var(--font-body); }
      .tithi { fill: #9fd3ff; font: 700 10px var(--font-body); }
      .ptr { stroke-width: 1.2; stroke-dasharray: 4 3; } .ptr.moon { stroke: #9fd3ff; } .ptr.sun { stroke: #ffb300; }
      .angle { fill: none; stroke: #ffb300; stroke-width: 1.5; }
      .deg { fill: #ffb300; font: 700 9px var(--font-body); }
    </style>
    ${out.join('\n')}
  </svg>`
  return { svg, elong, tithi, nak, moonSign, sunSign }
}

// ── Page ─────────────────────────────────────────────────────────────────────────

const $ = (id: string) => document.getElementById(id)!
const slider = $('slider') as HTMLInputElement
$('title').textContent = text.title
$('note').textContent = text.note
$('now').textContent = text.now

let base = Date.now()
const timeAt = () => new Date(base + Number(slider.value) * 3600_000)
const fmt = new Intl.DateTimeFormat(LANG, { dateStyle: 'medium', timeStyle: 'short' })

function render() {
  const t = timeAt()
  const c = chart(t)
  $('chart').innerHTML = c.svg
  const n = entry('nakshatra', c.nak)
  const sign = (k: number) => `${rashi(k).title} · ${rashi(k).name}`
  const illumination = (1 - Math.cos(rad(c.elong))) / 2
  $('rows').innerHTML = `
    <dt>${text.tithi}</dt><dd>${entry('tithi', c.tithi).title}</dd>
    <dt>${text.angle}</dt><dd class="moon">${c.elong.toFixed(1)}° <span style="color:var(--color-neutral)">÷ 12° = ${(c.elong / 12).toFixed(1)} → ${c.tithi}</span></dd>
    <dt>${text.star}</dt><dd>${n.name} – ${n.title}</dd>
    <dt>${text.moonSign}</dt><dd class="moon">${sign(c.moonSign)}</dd>
    <dt>${text.sunSign}</dt><dd class="sun">${sign(c.sunSign)}</dd>
    <dt>${text.seen}</dt><dd>${realisticMoon(illumination, c.elong < 180, 28, text.seen)} ${Math.round(illumination * 100)} %</dd>`
  $('when').textContent = fmt.format(t)
}

slider.addEventListener('input', render)
$('now').addEventListener('click', () => {
  base = Date.now()
  slider.value = '0'
  render()
})
let timer = 0
$('play').addEventListener('click', () => {
  if (timer) {
    clearInterval(timer)
    timer = 0
    $('play').textContent = '▶'
    return
  }
  $('play').textContent = '❚❚'
  timer = window.setInterval(() => {
    slider.value = String(Number(slider.value) >= Number(slider.max) ? Number(slider.min) : Number(slider.value) + 2)
    render()
  }, 60)
})

render()
