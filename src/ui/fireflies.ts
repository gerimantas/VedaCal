// Background lights (user, 2026-10-06), after the firefly canvas on vakruska.lt: soft points of
// light drift across the night sky behind every screen, each fading in, shimmering a while,
// fading out, resting, then lighting again elsewhere in a new colour. VedaCal's take is
// calmer — the app's own gold, amber, warm white and pale blue, fewer lights, 30 frames a
// second. Nothing runs when the system asks for reduced motion or the app is in the background.

type Rgb = readonly [number, number, number]
type Light = {
  x: number; y: number; r: number; vx: number; vy: number
  alpha: number; maxAlpha: number; glow: number; glowMax: number
  state: 'in' | 'on' | 'out' | 'rest'; fade: number; timer: number; until: number
  phase: number; shimmerSpeed: number; shimmerAmp: number; color: Rgb
}

// Weighted by repetition: mostly gold and amber, like the Moon and the accents.
const DARK: Rgb[] = [[212, 175, 55], [212, 175, 55], [255, 179, 0], [255, 179, 0], [255, 236, 200], [140, 180, 255]]
const LIGHT: Rgb[] = [[176, 128, 20], [176, 128, 20], [200, 120, 0], [90, 120, 200]]
const FRAME = 1000 / 30

const rnd = (min: number, max: number) => Math.random() * (max - min) + min
const dark = () => {
  const theme = document.documentElement.dataset.theme
  return theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}
const pick = () => {
  const colors = dark() ? DARK : LIGHT
  return colors[Math.floor(Math.random() * colors.length)]
}

export function startFireflies() {
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const canvas = document.createElement('canvas')
  canvas.className = 'fireflies'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.prepend(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let w = 0, h = 0
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    w = innerWidth
    h = innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  addEventListener('resize', resize, { passive: true })

  const lights: Light[] = Array.from({ length: w < 768 ? 36 : 70 }, () => {
    const maxAlpha = rnd(0.3, 0.85)
    const state = (['in', 'on', 'out', 'rest'] as const)[Math.floor(Math.random() * 4)]
    return {
      x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.8),
      vx: rnd(-0.09, 0.09), vy: rnd(-0.09, 0.09),
      alpha: state === 'on' ? maxAlpha : state === 'in' ? rnd(0, maxAlpha) : 0, maxAlpha,
      glow: 1, glowMax: rnd(3, 10),
      state, fade: rnd(0.003, 0.012), timer: 0, until: rnd(1500, 7000),
      phase: rnd(0, Math.PI * 2), shimmerSpeed: rnd(0.02, 0.05), shimmerAmp: rnd(0.015, 0.06),
      color: pick(),
    }
  })

  // Rates below are per 1/60 s, as on vakruska; `k` scales them to the time that passed.
  const step = (s: Light, k: number, ms: number) => {
    s.x += s.vx * k
    s.y += s.vy * k
    if (s.x < -3) s.x = w + 3
    if (s.x > w + 3) s.x = -3
    if (s.y < -3) s.y = h + 3
    if (s.y > h + 3) s.y = -3
    if (s.state === 'in') {
      s.alpha = Math.min(s.maxAlpha, s.alpha + s.fade * k)
      s.glow = (s.alpha / s.maxAlpha) * s.glowMax
      if (s.alpha === s.maxAlpha) Object.assign(s, { state: 'on', timer: 0, until: rnd(1500, 7000) })
    } else if (s.state === 'on') {
      s.phase += s.shimmerSpeed * k
      s.alpha = Math.max(0, Math.min(s.maxAlpha, s.maxAlpha + Math.sin(s.phase) * s.shimmerAmp))
      s.glow = s.glowMax + Math.sin(s.phase * 0.7) * s.glowMax * 0.08
      if ((s.timer += ms) >= s.until) s.state = 'out'
    } else if (s.state === 'out') {
      s.alpha = Math.max(0, s.alpha - s.fade * k)
      s.glow = Math.max(1, (s.alpha / s.maxAlpha) * s.glowMax)
      if (s.alpha === 0) {
        Object.assign(s, {
          state: 'rest', timer: 0, until: rnd(500, 7000), maxAlpha: rnd(0.25, 0.8),
          glowMax: rnd(2.5, 9), fade: rnd(0.003, 0.012), color: pick(),
        })
      }
    } else if ((s.timer += ms) >= s.until) {
      s.state = 'in'
    }
  }

  const draw = (s: Light, dim: number) => {
    const a = s.alpha * dim
    if (a < 0.01) return
    const c = s.color.join(',')
    const halo = s.r * s.glow
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, halo)
    g.addColorStop(0, `rgba(${c},${a})`)
    g.addColorStop(0.4, `rgba(${c},${a * 0.3})`)
    g.addColorStop(1, `rgba(${c},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(s.x, s.y, halo, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(${c},${Math.min(a * 1.8, 0.95)})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }

  let running = false
  let last = 0
  const frame = (now: number) => {
    if (!running) return
    requestAnimationFrame(frame)
    const ms = now - last
    if (ms < FRAME) return
    last = now
    const k = Math.min(ms, 100) / (1000 / 60)
    const dim = dark() ? 1 : 0.6 // softer on the light page
    ctx.clearRect(0, 0, w, h)
    for (const s of lights) {
      step(s, k, Math.min(ms, 100))
      draw(s, dim)
    }
  }
  const update = () => {
    const on = !still.matches && !document.hidden
    if (on === running) return
    running = on
    if (on) {
      last = performance.now()
      requestAnimationFrame(frame)
    } else if (still.matches) {
      ctx.clearRect(0, 0, w, h)
    }
  }
  document.addEventListener('visibilitychange', update)
  still.addEventListener('change', update)
  update()
}
