// Sky prototype (user, 2026-10-05): an interactive 3D view from the Earth — the Moon on its
// orbit, the direction of the Sun, the 27 Moon stars (nakshatra) and 12 signs on the ecliptic,
// and the real constellations behind them. Schematic: directions and angles are true,
// distances and sizes are not. Dev server only: /VedaCal/mockups/sky.html
import { Body, Ecliptic, GeoVector, SiderealTime } from 'astronomy-engine'
import { getAyanamsa as libraryAyanamsa } from '@ishubhamx/panchangam-js/dist/core/ayanamsa'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LANG, content, entry } from '../src/ui/format'
import sky from './sky/sky-data.json'

const BASE = `${import.meta.env.BASE_URL}mockups/sky/`
const DEG = Math.PI / 180
const OBLIQUITY = 23.44
const DRIK_LAHIRI_OFFSET = 24.14 / 3600 // same constant as src/core/panchang.ts

// Schematic sizes (scene units).
const EARTH_R = 2
const MOON_R = 1 // enlarged so the phase is visible (true ratio: 0.27 of the Earth)
const MOON_ORBIT = 16
const SKY_R = 60 // the star ring: stars, constellations and the ecliptic band, kept close so all fits
// Only the twelve zodiac constellations are drawn: the ones the signs are named after.
const ZODIAC = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc']

const L = LANG === 'lt'
const text = {
  title: L ? 'Dangus iš Žemės' : 'The sky from Earth',
  tithi: L ? 'Mėnulio diena' : 'Lunar day',
  angle: L ? 'Mėnulis nuo Saulės' : 'Moon from Sun',
  star: L ? 'Mėnulio žvaigždė' : "Moon's star",
  moonSign: L ? 'Mėnulis ženkle' : 'Moon in',
  sunSign: L ? 'Saulė ženkle' : 'Sun in',
  note: L
    ? 'Schema: kryptys ir kampai tikri, atstumai ir dydžiai – ne. Sukite pirštu, artinkite dviem pirštais.'
    : 'Schematic: directions and angles are true, distances and sizes are not. Drag to turn, pinch to zoom.',
  now: L ? 'Dabar' : 'Now',
}

// ── Astronomy (same formulas as the engine) ─────────────────────────────────────

const norm = (d: number) => ((d % 360) + 360) % 360
const ecl = (body: Body, t: Date) => Ecliptic(GeoVector(body, t, true))
const ayanamsa = (t: Date) => libraryAyanamsa(t) + DRIK_LAHIRI_OFFSET

/** Ecliptic longitude/latitude (degrees) → scene point. Three's y is the ecliptic north. */
function point(lon: number, lat: number, r: number): THREE.Vector3 {
  return new THREE.Vector3(r * Math.cos(lat * DEG) * Math.cos(lon * DEG), r * Math.sin(lat * DEG), -r * Math.cos(lat * DEG) * Math.sin(lon * DEG))
}

/** Equatorial RA/Dec (degrees, J2000) → ecliptic longitude/latitude (degrees). */
function toEcliptic(ra: number, dec: number): [number, number] {
  const x = Math.cos(dec * DEG) * Math.cos(ra * DEG)
  const y = Math.cos(dec * DEG) * Math.sin(ra * DEG)
  const z = Math.sin(dec * DEG)
  const e = OBLIQUITY * DEG
  const ye = y * Math.cos(e) + z * Math.sin(e)
  const ze = -y * Math.sin(e) + z * Math.cos(e)
  return [Math.atan2(ye, x) / DEG, Math.asin(ze) / DEG]
}

// ── Scene ────────────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.prepend(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000)
camera.position.set(0, 18, 34)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.minDistance = 6
controls.maxDistance = 260
controls.enablePan = false

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

const loader = new THREE.TextureLoader()
const texture = (file: string) => {
  const t = loader.load(BASE + file)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

scene.add(new THREE.AmbientLight(0xffffff, 0.06))
const sunLight = new THREE.DirectionalLight(0xffffff, 2.6)
scene.add(sunLight)

// Earth: axis tilted toward ecliptic longitude 270° (the celestial pole sits at 90°, 66.56°),
// spun by sidereal time so the real longitude faces the Sun.
const earthTilt = new THREE.Group()
earthTilt.rotation.x = -OBLIQUITY * DEG
const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 64, 32), new THREE.MeshStandardMaterial({ map: texture('earth.jpg'), roughness: 1 }))
earthTilt.add(earth)
scene.add(earthTilt)

const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 48, 24), new THREE.MeshStandardMaterial({ map: texture('moon.jpg'), roughness: 1 }))
scene.add(moon)

// The Moon's orbit drawn as a ring in the ecliptic plane (its 5° tilt is in the Moon's own position).
const orbit = new THREE.Mesh(new THREE.RingGeometry(MOON_ORBIT - 0.04, MOON_ORBIT + 0.04, 180), new THREE.MeshBasicMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
orbit.rotation.x = -Math.PI / 2
scene.add(orbit)

// Sun: a glow on the sky sphere, in its true direction.
function glow(color: string, size: number): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, '#fff')
  grad.addColorStop(0.25, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, blending: THREE.AdditiveBlending }))
  s.scale.setScalar(size)
  return s
}
const sun = glow('#ffcc55', 12)
scene.add(sun)

// Stars and constellation lines on the sky sphere.
{
  const pos: number[] = []
  const col: number[] = []
  for (const [ra, dec, mag] of sky.stars as [number, number, number][]) {
    const [lon, lat] = toEcliptic(ra, dec)
    if (mag > 4.5 || Math.abs(lat) > 16) continue // only the band the Sun and Moon travel
    pos.push(...point(lon, lat, SKY_R).toArray())
    const b = Math.max(0.25, Math.min(1, (5.2 - mag) / 4))
    col.push(b, b, b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.7, vertexColors: true, sizeAttenuation: true })))

  const seg: number[] = []
  for (const [id, lines] of Object.entries(sky.lines as Record<string, [number, number][][]>)) {
    if (!ZODIAC.includes(id)) continue
    for (const line of lines)
      for (let i = 1; i < line.length; i++) {
        const a = toEcliptic(...line[i - 1])
        const b = toEcliptic(...line[i])
        seg.push(...point(a[0], a[1], SKY_R).toArray(), ...point(b[0], b[1], SKY_R).toArray())
      }
  }
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x6a7a9a, transparent: true, opacity: 0.45 })))
}

/** Text drawn on a canvas, always facing the camera. */
function label(str: string, color: string, height: number): THREE.Sprite {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  const font = '600 44px "Instrument Sans Variable", system-ui, sans-serif'
  g.font = font
  c.width = Math.ceil(g.measureText(str).width) + 16
  c.height = 60
  g.font = font
  g.fillStyle = color
  g.textBaseline = 'middle'
  g.fillText(str, 8, 31)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }))
  const k = innerWidth < innerHeight ? 1.7 : 1 // portrait phones see the ring from further away
  s.scale.set((k * height * c.width) / c.height, k * height, 1)
  return s
}

// The ecliptic band: 27 Moon stars just above it, 12 signs just below. Both start at sidereal
// 0°, i.e. tropical longitude = ayanamsha; it drifts 1° in 72 years, so set once.
const band = new THREE.Group()
scene.add(band)
const nakLabels: THREE.Sprite[] = []
const signLabels: THREE.Sprite[] = []
function buildBand(aya: number) {
  const ticks: number[] = []
  for (let k = 0; k < 27; k++) {
    const lon = aya + (k * 360) / 27
    ticks.push(...point(lon, 0, SKY_R).toArray(), ...point(lon, 7, SKY_R).toArray())
    const l = label(entry('nakshatra', k + 1).name, '#cfd6e6', 2.6)
    l.position.copy(point(lon + 180 / 27, 4.5, SKY_R))
    l.userData.lon = lon + 180 / 27
    band.add(l)
    nakLabels.push(l)
  }
  for (let k = 0; k < 12; k++) {
    const lon = aya + k * 30
    ticks.push(...point(lon, 0, SKY_R).toArray(), ...point(lon, -7, SKY_R).toArray())
    const r = (content.rashi as Record<string, { name: string; title: string }>)[String(k + 1)]
    const l = label(`${r.title} · ${r.name}`, '#d4af37', 3)
    l.position.copy(point(lon + 15, -4.5, SKY_R))
    l.userData.lon = lon + 15
    band.add(l)
    signLabels.push(l)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3))
  band.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8090b0, transparent: true, opacity: 0.6 })))
  const ecliptic = new THREE.Mesh(new THREE.RingGeometry(SKY_R - 0.3, SKY_R + 0.3, 360), new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.5, side: THREE.DoubleSide }))
  ecliptic.rotation.x = -Math.PI / 2
  band.add(ecliptic)
}
buildBand(ayanamsa(new Date()))

/** A strip of the band between two longitudes, 0°–7° above the ecliptic: the Moon's star. */
function sector(a: number, b: number): THREE.BufferGeometry {
  const pts: number[] = []
  const idx: number[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const lon = a + ((b - a) * i) / n
    pts.push(...point(lon, 0, SKY_R - 0.3).toArray(), ...point(lon, 7, SKY_R - 0.3).toArray())
    if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  g.setIndex(idx)
  return g
}
const current = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }))
scene.add(current)

// Pointers from the Earth: to the Moon's place among the stars, to the Sun's, and the arc
// between them — the angle that makes the lunar day.
const pointer = (color: number) => {
  const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
  const line = new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: 3, gapSize: 1, transparent: true, opacity: 1 }))
  scene.add(line)
  return line
}
const moonPointer = pointer(0x9fd3ff)
const sunPointer = pointer(0xffb300)
const arc = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffb300 }))
scene.add(arc)

function setLine(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3) {
  line.geometry.setFromPoints([a, b])
  line.computeLineDistances()
}

// ── Time and the panel ───────────────────────────────────────────────────────────

const rows = document.getElementById('rows')!
const when = document.getElementById('when')!
const slider = document.getElementById('slider') as HTMLInputElement
const play = document.getElementById('play')!
document.getElementById('title')!.textContent = text.title
document.getElementById('note')!.textContent = text.note
document.getElementById('now')!.textContent = text.now

let base = Date.now()
const HOUR = 3600_000
const timeAt = () => new Date(base + Number(slider.value) * HOUR)
const fmt = new Intl.DateTimeFormat(LANG, { dateStyle: 'medium', timeStyle: 'short' })

function update() {
  const t = timeAt()
  const s = ecl(Body.Sun, t)
  const m = ecl(Body.Moon, t)
  const aya = ayanamsa(t)
  const elong = norm(m.elon - s.elon)
  const tithi = Math.floor(elong / 12) + 1
  const nak = Math.floor(norm(m.elon - aya) / (360 / 27)) + 1
  const moonSign = Math.floor(norm(m.elon - aya) / 30) + 1
  const sunSign = Math.floor(norm(s.elon - aya) / 30) + 1

  const sunDir = point(s.elon, 0, 1)
  sun.position.copy(sunDir.clone().multiplyScalar(SKY_R * 0.92))
  sunLight.position.copy(sunDir.clone().multiplyScalar(100))
  moon.position.copy(point(m.elon, m.elat, MOON_ORBIT))
  moon.rotation.y = (m.elon + 180) * DEG // near side (texture longitude 0) faces the Earth
  earth.rotation.y = SiderealTime(t) * 15 * DEG

  setLine(moonPointer, new THREE.Vector3(), point(m.elon, m.elat, SKY_R))
  setLine(sunPointer, new THREE.Vector3(), point(s.elon, 0, SKY_R))
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 64; i++) pts.push(point(s.elon + (elong * i) / 64, 0, MOON_ORBIT * 0.55))
  arc.geometry.setFromPoints(pts)

  nakLabels.forEach((l, i) => ((l.material as THREE.SpriteMaterial).opacity = i + 1 === nak ? 1 : 0.15))
  signLabels.forEach((l, i) => ((l.material as THREE.SpriteMaterial).opacity = i + 1 === moonSign || i + 1 === sunSign ? 1 : 0.15))
  // Only the labels near the Sun–Moon arc: the far side of the ring is noise.
  const d = norm(m.elon - s.elon + 180) - 180
  const mid = s.elon + d / 2
  for (const l of [...nakLabels, ...signLabels]) l.visible = Math.abs(norm(l.userData.lon - mid + 180) - 180) < Math.abs(d) / 2 + 40
  const from = aya + (nak - 1) * (360 / 27)
  current.geometry.dispose()
  current.geometry = sector(from, from + 360 / 27)

  const rashi = (k: number) => {
    const r = (content.rashi as Record<string, { name: string; title: string }>)[String(k)]
    return `${r.title} · ${r.name}`
  }
  const n = entry('nakshatra', nak)
  rows.innerHTML = `
    <dt>${text.tithi}</dt><dd>${entry('tithi', tithi).title}</dd>
    <dt>${text.angle}</dt><dd class="moon">${elong.toFixed(1)}° <span style="color:var(--color-neutral)">÷ 12° = ${(elong / 12).toFixed(1)} → ${tithi}</span></dd>
    <dt>${text.star}</dt><dd>${n.name} – ${n.title}</dd>
    <dt>${text.moonSign}</dt><dd class="moon">${rashi(moonSign)}</dd>
    <dt>${text.sunSign}</dt><dd class="sun">${rashi(sunSign)}</dd>`
  when.textContent = fmt.format(t)
}

// Label sprites keep their world size; remember each one's base scale for the highlight.
for (const l of [...nakLabels, ...signLabels]) l.userData.base = l.scale.clone()
const baseScale = (l: THREE.Sprite, k: number) => l.scale.copy(l.userData.base).multiplyScalar(k)
const highlight = () => {
  const t = timeAt()
  const m = ecl(Body.Moon, t)
  const nak = Math.floor(norm(m.elon - ayanamsa(t)) / (360 / 27)) + 1
  nakLabels.forEach((l, i) => baseScale(l, i + 1 === nak ? 1.6 : 1))
}

slider.addEventListener('input', () => {
  update()
  highlight()
})
document.getElementById('now')!.addEventListener('click', () => {
  base = Date.now()
  slider.value = '0'
  update()
  highlight()
  frame()
})
let playing = false
play.addEventListener('click', () => {
  playing = !playing
  play.textContent = playing ? '❚❚' : '▶'
})

let last = performance.now()
renderer.setAnimationLoop((now) => {
  if (playing && now - last > 50) {
    last = now
    slider.value = String(Number(slider.value) >= Number(slider.max) ? Number(slider.min) : Number(slider.value) + 1)
    update()
    highlight()
  }
  controls.update()
  renderer.render(scene, camera)
})

/**
 * Frame the part of the ring between the Sun and the Moon: look outward over the Earth at the
 * middle of that arc, from far enough that the arc, both bodies and their constellations fit
 * the screen's width (a portrait phone needs more distance).
 */
function frame() {
  const t = timeAt()
  const s = ecl(Body.Sun, t).elon
  const d = norm(ecl(Body.Moon, t).elon - s + 180) - 180
  const mid = s + d / 2
  const half = Math.abs(d) / 2
  const target = point(mid, 0, SKY_R * Math.cos(half * DEG) * 0.42)
  const width = 2 * SKY_R * Math.sin(Math.max(half, 25) * DEG) + 30
  const fov = Math.tan((camera.fov / 2) * DEG) * Math.min(camera.aspect, 1.6)
  const distance = width / 2 / fov
  const back = point(mid + 180, 0, 1).multiplyScalar(distance * Math.cos(40 * DEG))
  camera.position.copy(target).add(back).add(new THREE.Vector3(0, distance * Math.sin(40 * DEG), 0))
  controls.target.copy(target)
  controls.update()
}

update()
highlight()
frame()
