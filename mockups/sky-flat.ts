// Flat sky prototype (user, 2026-10-05, after the 3D one): the Sun, the Moon and the Earth
// share one plane, so a top-down chart says it all. Earth in the centre; the Moon's orbit cut
// into the 30 lunar days counted from the Sun (waxing and waning halves); the Sun in its
// direction; a ring of the 27 Moon stars; and an outer ring of the 12 signs. Not to scale.
// Dev server only: /VedaCal/mockups/sky-flat.html
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
  done: (n: number, cur: number) => (L ? `praėjo ${n}, eina ${cur}-oji` : `${n} done, day ${cur} running`),
  star: L ? 'Mėnulio žvaigždė' : "Moon's star",
  moonSign: L ? 'Mėnulis ženkle' : 'Moon in',
  sunSign: L ? 'Saulė ženkle' : 'Sun in',
  seen: L ? 'Iš Žemės' : 'From Earth',
  lit: L ? 'apšviesta' : 'lit',
  newMoon: L ? 'jaunatis' : 'new moon',
  fullMoon: L ? 'pilnatis' : 'full moon',
  waxing: L ? 'priešpilnis' : 'waxing',
  waning: L ? 'delčia' : 'waning',
  legend: L
    ? [
        ['orbit', 'Mėnulio orbita: 30 Mėnulio dienų (Tithi) po 12°, skaičiuojant nuo Saulės. Šviesesnė pusė – priešpilnis, tamsesnė – delčia. „Jaunatis“ ir „pilnatis“ žymi, kur tą akimirką būna Mėnulis.'],
        ['nak', 'Vidurinis žiedas: 27 Mėnulio žvaigždės (Nakshatra). Paryškinta ta, kurioje dabar Mėnulis.'],
        ['sign', 'Išorinis žiedas: 12 ženklų (Rashi). Mėlynas – Mėnulio ženklas, auksinis – Saulės.'],
        ['note', 'Vaizdas iš viršaus, ne pagal mastelį: tikros tik kryptys. Iš viršaus Mėnulio apšviesta pusė visada atsukta į Saulę; iš Žemės matome jos dalį – pjautuvą ar pilną diską. Mėnulis ir Saulė juda prieš laikrodžio rodyklę.'],
      ]
    : [
        ['orbit', "Moon's orbit: 30 lunar days (Tithi) of 12°, counted from the Sun. The lighter half is waxing, the darker half waning. “New moon” and “full moon” mark where the Moon stands at those moments."],
        ['nak', 'Middle ring: the 27 Moon stars (Nakshatra). The one the Moon is in now is highlighted.'],
        ['sign', 'Outer ring: the 12 signs (Rashi). Blue is the Moon’s sign, gold the Sun’s.'],
        ['note', 'Seen from above, not to scale: only the directions are true. From above, the Moon’s lit half always faces the Sun; from Earth we see part of it, a crescent or a full disc. The Moon and the Sun move counter-clockwise.'],
      ],
  now: L ? 'Dabar' : 'Now',
  legendTitle: L ? 'Kaip skaityti brėžinį' : 'How to read the chart',
}

// ── Astronomy (same formulas as the engine) ─────────────────────────────────────

const norm = (d: number) => ((d % 360) + 360) % 360
const tropical = (body: Body, t: Date) => Ecliptic(GeoVector(body, t, true)).elon
const ayanamsa = (t: Date) => libraryAyanamsa(t) + DRIK_LAHIRI_OFFSET
const rad = (deg: number) => (deg * Math.PI) / 180

// ── Geometry: sidereal longitude → screen angle; Mesha starts at the left, counter-clockwise ──

const C = 200
const R = { earth: 12, orbitIn: 76, orbitOut: 94, moon: 56, dayNum: 85, sun: 112.5, nakIn: 120, nakOut: 138, signOut: 164 }
const screen = (lon: number) => 180 + lon
const xy = (deg: number, r: number) => [C + r * Math.cos(rad(deg)), C - r * Math.sin(rad(deg))] as const
const f = (n: number) => n.toFixed(2)
const num = (n: number, digits = 1) => n.toLocaleString(LANG, { minimumFractionDigits: digits, maximumFractionDigits: digits })

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
  return arcText(deg, r + (lower ? -gap : gap) / 2, plain, `${cls} plain`) + arcText(deg, r - (lower ? -gap : gap) / 2, sanskrit, `${cls} sk`)
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

function chart(t: Date) {
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
  const out: string[] = [] // shapes
  const labels: string[] = [] // text, drawn over the pointer lines

  // Signs (outer ring) with two-line names.
  for (let k = 0; k < 12; k++) {
    const a = screen(k * 30)
    const cls = k + 1 === sunSign && k + 1 === moonSign ? 'both' : k + 1 === sunSign ? 'sunfill' : k + 1 === moonSign ? 'moonfill' : k % 2 ? 'alt' : 'base'
    out.push(`<path class="${cls}" d="${sector(a, a + 30, R.nakOut, R.signOut)}"/>`)
  }
  for (let k = 0; k < 12; k++) {
    const on = k + 1 === sunSign || k + 1 === moonSign
    labels.push(arcText2(screen(k * 30 + 15), R.signOut - 12, 9, rashi(k + 1).title, rashi(k + 1).name, on ? 'sign on' : 'sign'))
  }

  // Moon stars (middle ring): numbered, the current one bold. Its name is in the panel below:
  // only short marks go on the chart.
  for (let k = 0; k < 27; k++) {
    const a = screen((k * 360) / 27)
    const on = k + 1 === nak
    out.push(`<path class="${on ? 'moonfill' : k % 2 ? 'alt' : 'base'}" d="${sector(a, a + 360 / 27, R.nakIn, R.nakOut)}"/>`)
    labels.push(arcText(a + 180 / 27, (R.nakIn + R.nakOut) / 2, String(k + 1), on ? 'tithi' : 'num'))
  }

  // The Moon's orbit: waxing half (Sun → opposite) lighter, waning half darker, 30 ticks.
  out.push(`<path class="wax" d="${sector(sunDeg, sunDeg + 180, R.orbitIn, R.orbitOut)}"/>`)
  out.push(`<path class="wane" d="${sector(sunDeg + 180, sunDeg + 360, R.orbitIn, R.orbitOut)}"/>`)
  const t0 = sunDeg + (tithi - 1) * 12
  out.push(`<path class="tithifill" d="${sector(t0, t0 + 12, R.orbitIn, R.orbitOut)}"/>`)
  for (let k = 0; k < 30; k++) {
    const [x1, y1] = xy(sunDeg + k * 12, R.orbitIn)
    const [x2, y2] = xy(sunDeg + k * 12, R.orbitOut)
    out.push(`<line class="${k % 15 ? 'tick' : 'tick major'}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`)
  }
  // Day numbers inside the ring, like the other rings; the current one bold.
  for (let k = 0; k < 30; k++) labels.push(arcText(sunDeg + k * 12 + 6, R.dayNum, String(k + 1), k + 1 === tithi ? 'tithi' : 'num'))
  // All Moon-ring labels sit along its outer edge, plain name first, Sanskrit after.
  const label = (plain: string, sanskrit: string) => `${plain} · <tspan class="phase-sk">${sanskrit}</tspan>`
  // New and full moon mark where the Moon stands at those moments (the 30th and 15th lunar
  // days). The Sun and the Moon come first: a label that would sit on either one's line
  // slides along the ring until it clears it (new moon always does, it faces the Sun).
  const r = R.orbitOut + 5
  const halfWidth = (plain: string, sanskrit: string) => (((plain.length + sanskrit.length + 3) * 3.5) / 2 / r) * (180 / Math.PI)
  const clear = (center: number, half: number) => {
    for (const obstacle of [sunDeg, moonDeg]) {
      const d = norm(center - obstacle + 180) - 180
      const need = half + 3
      if (Math.abs(d) < need) center = obstacle + (d >= 0 ? need : -need)
    }
    return center
  }
  for (const [deg, plain, sanskrit] of [
    [sunDeg + 90, text.waxing, 'Shukla'],
    [sunDeg + 270, text.waning, 'Krishna'],
    [sunDeg + 0.01, text.newMoon, entry('tithi', 30).name],
    [sunDeg + 180, text.fullMoon, entry('tithi', 15).name],
  ] as const)
    labels.push(arcText(clear(deg, halfWidth(plain, sanskrit)), r, label(plain, sanskrit), 'phase'))

  // Pointers from the Earth, and the Sun → Moon angle with an arrow at the Moon's end.
  const [mx, my] = xy(moonDeg, R.nakOut)
  const [sx, sy] = xy(sunDeg, R.nakOut)
  out.push(`<line class="ptr moon" x1="${C}" y1="${C}" x2="${f(mx)}" y2="${f(my)}"/>`)
  out.push(`<line class="ptr sun" x1="${C}" y1="${C}" x2="${f(sx)}" y2="${f(sy)}"/>`)
  const [ax1, ay1] = xy(sunDeg, 32)
  const [ax2, ay2] = xy(moonDeg - 4, 32)
  out.push(`<path class="angle" marker-end="url(#arrow)" d="M${f(ax1)} ${f(ay1)}A32 32 0 ${elong > 184 ? 1 : 0} 0 ${f(ax2)} ${f(ay2)}"/>`)
  const [lx, ly] = xy(sunDeg + elong / 2, 44)
  labels.push(`<text class="deg" x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="central">${Math.round(elong)}°</text>`)
  out.push(...labels)

  // Bodies: Sun (with glow), Moon on its orbit, Earth in the centre; each lit toward the Sun.
  const [gx, gy] = xy(sunDeg, R.sun)
  out.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="12" fill="url(#glow)"/><circle cx="${f(gx)}" cy="${f(gy)}" r="7" fill="#ffc94d"/>`)
  out.push(body(moonDeg, R.moon, 8, sunDeg, '#e8e8e8', '#3a3f4a'))
  out.push(body(0, 0, R.earth, sunDeg, '#4f8fd8', '#1b2a44'))

  const svg = `<svg class="chart" viewBox="34 34 332 332" role="img" aria-label="${text.title}">
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient>
      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffb300"/></marker>
    </defs>
    <style>
      .base { fill: oklch(24% 0.02 264); } .alt { fill: oklch(27% 0.022 264); }
      .moonfill { fill: #9fd3ff; fill-opacity: 0.3; } .sunfill { fill: #ffb300; fill-opacity: 0.3; }
      .both { fill: #d8c890; fill-opacity: 0.35; }
      .wax { fill: oklch(40% 0.03 250); } .wane { fill: oklch(27% 0.02 264); }
      .tithifill { fill: #9fd3ff; fill-opacity: 0.8; }
      .sign { fill: var(--color-muted); font: 600 8px var(--font-body); } .sign.sk { font-weight: 400; font-size: 6.5px; fill: var(--color-neutral); }
      .sign.on { fill: var(--color-ink); } .sign.on.sk { fill: #d4af37; }
      .num { fill: var(--color-neutral); font: 6px var(--font-body); }
      .nak.plain { fill: #fff; font: 700 7.5px var(--font-body); } .nak.sk { fill: #d4af37; font: 6.5px var(--font-body); }
      .tick { stroke: oklch(55% 0.02 264); stroke-width: 0.6; } .tick.major { stroke: var(--color-ink); stroke-width: 1.4; }
      .phase { fill: var(--color-ink); font: 600 6.5px var(--font-body); paint-order: stroke; stroke: oklch(16.3% 0.014 264); stroke-width: 2.5px; } .phase-sk { fill: #d4af37; font-weight: 400; }
      .tithi { fill: #fff; font: 700 8px var(--font-body); }
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
$('now').textContent = text.now
$('legend-title').textContent = text.legendTitle
$('legend').innerHTML = text.legend.map(([k, s]) => `<p class="legend l-${k}">${s}</p>`).join('')

let base = Date.now()
const timeAt = () => new Date(base + Number(slider.value) * 3600_000)
const fmt = new Intl.DateTimeFormat(LANG, { dateStyle: 'medium', timeStyle: 'short' })

function render() {
  const t = timeAt()
  const c = chart(t)
  $('chart').innerHTML = c.svg
  const n = entry('nakshatra', c.nak)
  const td = entry('tithi', c.tithi)
  const sign = (k: number) => `${rashi(k).title} <span class="sk">· ${rashi(k).name}</span>`
  const illumination = (1 - Math.cos(rad(c.elong))) / 2
  $('rows').innerHTML = `
    <dt>${text.tithi}</dt><dd><b class="badge">${c.tithi}</b> ${td.title} <span class="sk">· ${td.name}</span></dd>
    <dt>${text.angle}</dt><dd><span class="moon">${num(c.elong)}°</span> <span class="quiet">÷ 12° = ${num(c.elong / 12)}: ${text.done(c.tithi - 1, c.tithi)}</span></dd>
    <dt>${text.star}</dt><dd><b class="badge">${c.nak}</b> ${n.title} <span class="sk">· ${n.name}</span></dd>
    <dt>${text.moonSign}</dt><dd class="moon">${sign(c.moonSign)}</dd>
    <dt>${text.sunSign}</dt><dd class="sun">${sign(c.sunSign)}</dd>
    <dt>${text.seen}</dt><dd class="seen">${realisticMoon(illumination, c.elong < 180, 28, text.seen)} ${Math.round(illumination * 100)} % ${text.lit}</dd>`
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
