// Flat sky prototype (user, 2026-10-05, after the 3D one): the Sun, the Moon and the Earth
// share one plane, so a top-down chart says it all. Earth in the centre; the Moon's orbit cut
// into the 30 lunar days counted from the Sun (waxing and waning halves); the Sun in its
// direction; a ring of the 27 Moon stars; and an outer ring of the 12 signs with the real
// zodiac constellations drawn schematically inside. Not to scale.
// Dev server only: /VedaCal/mockups/sky-flat.html
import { Body, Ecliptic, GeoVector } from 'astronomy-engine'
import { getAyanamsa as libraryAyanamsa } from '@ishubhamx/panchangam-js/dist/core/ayanamsa'
import { LANG, content, entry } from '../src/ui/format'
import { realisticMoon } from '../src/ui/moon'
import sky from './sky/sky-data.json'

const DRIK_LAHIRI_OFFSET = 24.14 / 3600 // same constant as src/core/panchang.ts
const OBLIQUITY = 23.44
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
  newMoon: L ? '● jaunatis' : '● new moon',
  fullMoon: L ? '○ pilnatis' : '○ full moon',
  waxing: L ? 'priešpilnis · Shukla' : 'waxing · Shukla',
  waning: L ? 'delčia · Krishna' : 'waning · Krishna',
  legend: L
    ? [
        ['orbit', 'Mėnulio orbita: 30 Mėnulio dienų (Tithi) po 12°, skaičiuojant nuo Saulės. Šviesesnė pusė – priešpilnis, tamsesnė – delčia. „Jaunatis“ ir „pilnatis“ žymi, kur tą akimirką būna Mėnulis.'],
        ['nak', 'Vidurinis žiedas: 27 Mėnulio žvaigždės (Nakshatra). Paryškinta ta, kurioje dabar Mėnulis.'],
        ['sign', 'Išorinis žiedas: 12 ženklų (Rashi) ir tikri jų žvaigždynai. Mėlynas – Mėnulio ženklas, auksinis – Saulės.'],
        ['note', 'Vaizdas iš viršaus, ne pagal mastelį: tikros tik kryptys. Iš viršaus Mėnulio apšviesta pusė visada atsukta į Saulę; iš Žemės matome jos dalį – pjautuvą ar pilną diską. Mėnulis ir Saulė juda prieš laikrodžio rodyklę.'],
      ]
    : [
        ['orbit', "Moon's orbit: 30 lunar days (Tithi) of 12°, counted from the Sun. The lighter half is waxing, the darker half waning. “New moon” and “full moon” mark where the Moon stands at those moments."],
        ['nak', 'Middle ring: the 27 Moon stars (Nakshatra). The one the Moon is in now is highlighted.'],
        ['sign', 'Outer ring: the 12 signs (Rashi) and their real constellations. Blue is the Moon’s sign, gold the Sun’s.'],
        ['note', 'Seen from above, not to scale: only the directions are true. From above, the Moon’s lit half always faces the Sun; from Earth we see part of it, a crescent or a full disc. The Moon and the Sun move counter-clockwise.'],
      ],
  now: L ? 'Dabar' : 'Now',
}

// ── Astronomy (same formulas as the engine) ─────────────────────────────────────

const norm = (d: number) => ((d % 360) + 360) % 360
const tropical = (body: Body, t: Date) => Ecliptic(GeoVector(body, t, true)).elon
const ayanamsa = (t: Date) => libraryAyanamsa(t) + DRIK_LAHIRI_OFFSET
const rad = (deg: number) => (deg * Math.PI) / 180

/** J2000 RA/Dec (degrees) → ecliptic longitude/latitude (degrees, J2000). */
function toEcliptic(ra: number, dec: number): [number, number] {
  const x = Math.cos(rad(dec)) * Math.cos(rad(ra))
  const y = Math.cos(rad(dec)) * Math.sin(rad(ra))
  const z = Math.sin(rad(dec))
  const e = rad(OBLIQUITY)
  return [(Math.atan2(y * Math.cos(e) + z * Math.sin(e), x) * 180) / Math.PI, (Math.asin(-y * Math.sin(e) + z * Math.cos(e)) * 180) / Math.PI]
}

// ── Geometry: sidereal longitude → screen angle; Mesha starts at the left, counter-clockwise ──

const C = 200
const R = { earth: 12, orbit: 78, sun: 106, nakIn: 120, nakOut: 148, figure: 166, signOut: 198 }
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

// The twelve zodiac constellations, in sign order (Mesha = Aries …), drawn inside the sign ring.
const ZODIAC = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc']
const figures = ZODIAC.map((id) =>
  (sky.lines as Record<string, [number, number][][]>)[id].map((line) => line.map(([ra, dec]) => toEcliptic(ra, dec))),
)
/** Ecliptic latitude squeezed into the ring band: ±16° fills it, anything further is pinned to the edge. */
const figureR = (lat: number) => R.figure + Math.max(-14, Math.min(14, -lat * 0.9))

function constellations(aya: number, year: number, sunSign: number, moonSign: number): string {
  const precession = (year - 2000) * 0.013969 // J2000 → of date, degrees
  const out: string[] = []
  figures.forEach((lines, k) => {
    const cls = k + 1 === moonSign ? 'fig moon' : k + 1 === sunSign ? 'fig sun' : 'fig'
    const dots = new Map<string, [number, number]>()
    const paths = lines.map((line) =>
      line
        .map(([lon, lat], i) => {
          const [x, y] = xy(screen(lon + precession - aya), figureR(lat))
          dots.set(`${x.toFixed(1)},${y.toFixed(1)}`, [x, y])
          return `${i ? 'L' : 'M'}${f(x)} ${f(y)}`
        })
        .join(''),
    )
    out.push(`<g class="${cls}"><path d="${paths.join('')}"/>${[...dots.values()].map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="1.1"/>`).join('')}</g>`)
  })
  return out.join('\n')
}

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
  const out: string[] = []

  // Signs (outer ring) with their constellations and two-line names.
  for (let k = 0; k < 12; k++) {
    const a = screen(k * 30)
    const cls = k + 1 === sunSign && k + 1 === moonSign ? 'both' : k + 1 === sunSign ? 'sunfill' : k + 1 === moonSign ? 'moonfill' : k % 2 ? 'alt' : 'base'
    out.push(`<path class="${cls}" d="${sector(a, a + 30, R.nakOut, R.signOut)}"/>`)
  }
  out.push(constellations(aya, t.getUTCFullYear() + t.getUTCMonth() / 12, sunSign, moonSign))
  for (let k = 0; k < 12; k++) {
    const on = k + 1 === sunSign || k + 1 === moonSign
    out.push(arcText2(screen(k * 30 + 15), R.signOut - 9, 8, rashi(k + 1).title, rashi(k + 1).name, on ? 'sign on' : 'sign'))
  }

  // Moon stars (middle ring): numbered, the current one named in two lines.
  for (let k = 0; k < 27; k++) {
    const a = screen((k * 360) / 27)
    const on = k + 1 === nak
    out.push(`<path class="${on ? 'moonfill' : k % 2 ? 'alt' : 'base'}" d="${sector(a, a + 360 / 27, R.nakIn, R.nakOut)}"/>`)
    if (!on) out.push(arcText(a + 180 / 27, (R.nakIn + R.nakOut) / 2, String(k + 1), 'num'))
  }
  const n = entry('nakshatra', nak)
  out.push(arcText2(screen(((nak - 0.5) * 360) / 27), (R.nakIn + R.nakOut) / 2, 10, n.title, n.name, 'nak'))

  // The Moon's orbit: waxing half (Sun → opposite) lighter, waning half darker, 30 ticks.
  out.push(`<path class="wax" d="${sector(sunDeg, sunDeg + 180, R.orbit - 7, R.orbit + 7)}"/>`)
  out.push(`<path class="wane" d="${sector(sunDeg + 180, sunDeg + 360, R.orbit - 7, R.orbit + 7)}"/>`)
  const t0 = sunDeg + (tithi - 1) * 12
  out.push(`<path class="tithifill" d="${sector(t0, t0 + 12, R.orbit - 7, R.orbit + 7)}"/>`)
  for (let k = 0; k < 30; k++) {
    const [x1, y1] = xy(sunDeg + k * 12, R.orbit - 7)
    const [x2, y2] = xy(sunDeg + k * 12, R.orbit + 7)
    out.push(`<line class="${k % 15 ? 'tick' : 'tick major'}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`)
  }
  out.push(arcText(sunDeg + 90, R.orbit - 15, text.waxing, 'half'))
  out.push(arcText(sunDeg + 270, R.orbit - 15, text.waning, 'half'))
  out.push(arcText(t0 + 6, R.orbit + 15, String(tithi), 'tithi'))
  // New and full moon: where the Moon stands at those moments (horizontal, readable).
  for (const [deg, label] of [
    [sunDeg, text.newMoon],
    [sunDeg + 180, text.fullMoon],
  ] as const) {
    const [x, y] = xy(deg, R.orbit - 12)
    const right = Math.cos(rad(deg)) > 0.3
    const left = Math.cos(rad(deg)) < -0.3
    out.push(`<text class="phase" x="${f(x)}" y="${f(y)}" text-anchor="${right ? 'end' : left ? 'start' : 'middle'}" dominant-baseline="${right || left ? 'central' : Math.sin(rad(deg)) > 0 ? 'hanging' : 'auto'}">${label}</text>`)
  }

  // Pointers from the Earth, and the Sun → Moon angle with an arrow at the Moon's end.
  const [mx, my] = xy(moonDeg, R.nakOut)
  const [sx, sy] = xy(sunDeg, R.nakOut)
  out.push(`<line class="ptr moon" x1="${C}" y1="${C}" x2="${f(mx)}" y2="${f(my)}"/>`)
  out.push(`<line class="ptr sun" x1="${C}" y1="${C}" x2="${f(sx)}" y2="${f(sy)}"/>`)
  const [ax1, ay1] = xy(sunDeg, 32)
  const [ax2, ay2] = xy(moonDeg - 4, 32)
  out.push(`<path class="angle" marker-end="url(#arrow)" d="M${f(ax1)} ${f(ay1)}A32 32 0 ${elong > 184 ? 1 : 0} 0 ${f(ax2)} ${f(ay2)}"/>`)
  const [lx, ly] = xy(sunDeg + elong / 2, 44)
  out.push(`<text class="deg" x="${f(lx)}" y="${f(ly)}" text-anchor="middle" dominant-baseline="central">${Math.round(elong)}°</text>`)

  // Bodies: Sun (with glow), Moon on its orbit, Earth in the centre; each lit toward the Sun.
  const [gx, gy] = xy(sunDeg, R.sun)
  out.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="18" fill="url(#glow)"/><circle cx="${f(gx)}" cy="${f(gy)}" r="8" fill="#ffc94d"/>`)
  out.push(body(moonDeg, R.orbit, 8, sunDeg, '#e8e8e8', '#3a3f4a'))
  out.push(body(0, 0, R.earth, sunDeg, '#4f8fd8', '#1b2a44'))

  const svg = `<svg class="chart" viewBox="0 0 400 400" role="img" aria-label="${text.title}">
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
      .fig path { fill: none; stroke: oklch(62% 0.03 264); stroke-width: 0.6; } .fig circle { fill: oklch(80% 0.02 264); }
      .fig.moon path { stroke: #9fd3ff; stroke-width: 0.9; } .fig.sun path { stroke: #ffc94d; stroke-width: 0.9; }
      .num { fill: var(--color-neutral); font: 6px var(--font-body); }
      .nak.plain { fill: #fff; font: 700 7.5px var(--font-body); } .nak.sk { fill: #d4af37; font: 6.5px var(--font-body); }
      .tick { stroke: oklch(55% 0.02 264); stroke-width: 0.6; } .tick.major { stroke: var(--color-ink); stroke-width: 1.4; }
      .half { fill: var(--color-muted); font: 6.5px var(--font-body); }
      .phase { fill: var(--color-ink); font: 6.5px var(--font-body); }
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
$('now').textContent = text.now
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
    <dt>${text.tithi}</dt><dd>${td.title} <span class="sk">· ${td.name}</span></dd>
    <dt>${text.angle}</dt><dd><span class="moon">${num(c.elong)}°</span> <span class="quiet">÷ 12° = ${num(c.elong / 12)}: ${text.done(c.tithi - 1, c.tithi)}</span></dd>
    <dt>${text.star}</dt><dd>${n.title} <span class="sk">· ${n.name}</span></dd>
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
