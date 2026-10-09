// The Moon's light over the month (user, 2026-10-09): one curve from new moon (0 %) to full
// moon (100 %) and back, with the month grid's marks on it — rest days as violet bands,
// Ekadashi, Pushya and eclipses as dots, today as a line. x is in days: day i spans [i, i+1),
// its noon is i + 0.5. Between noons the Moon's angle from the Sun grows almost evenly, so it
// is interpolated and the lit share taken from it; the turns fall where the angle crosses
// 0° or 180°. Colours come from screens.css (.wave), so both themes work.
import type { MonthDay } from '../core/types'
import { t } from './format'

export type WavePhase = { kind: 'new' | 'full'; x: number }
export type MoonWave = { svg: string; phases: WavePhase[]; lit: (x: number) => number }

const W = 350
const X0 = 6
const X1 = W - 6
const TOP = 16
const BOT = 92
const f = (n: number) => n.toFixed(1)

export function moonWave(days: MonthDay[], today: string): MoonWave {
  const n = days.length
  // The angle at each noon, unwrapped so it only grows.
  const u: number[] = []
  for (const d of days) {
    const e = d.moon.elongation
    u.push(u.length ? u[u.length - 1] + ((((e - u[u.length - 1]) % 360) + 360) % 360) : e)
  }
  /** Unwrapped angle at x, straight between noons and beyond the first and last. */
  const angle = (x: number) => {
    const i = Math.min(Math.max(Math.floor(x - 0.5), 0), n - 2)
    return u[i] + (u[i + 1] - u[i]) * (x - 0.5 - i)
  }
  const lit = (x: number) => (1 - Math.cos((angle(x) * Math.PI) / 180)) / 2

  const phases: WavePhase[] = []
  for (let k = Math.ceil(angle(0) / 180); k * 180 < angle(n); k++) {
    const j = u.findIndex((a) => a >= k * 180) // -1: after the last noon
    const i = j < 0 ? n - 2 : Math.min(Math.max(j - 1, 0), n - 2)
    const x = i + 0.5 + (k * 180 - u[i]) / (u[i + 1] - u[i])
    if (x >= 0 && x < n) phases.push({ kind: k % 2 ? 'full' : 'new', x })
  }

  const dw = (X1 - X0) / n
  const X = (x: number) => X0 + x * dw
  const Y = (l: number) => BOT - l * (BOT - TOP)
  const out: string[] = []

  days.forEach((d, i) => {
    if (d.rhythm.restDay) out.push(`<rect class="rest" x="${f(X(i))}" y="${TOP - 6}" width="${f(dw)}" height="${BOT - TOP + 6}"/>`)
  })
  out.push(`<line class="grid" x1="${X0}" y1="${f(Y(0.5))}" x2="${X1}" y2="${f(Y(0.5))}"/>`)

  const line: string[] = []
  for (let s = 0; s <= n * 8; s++) line.push(`${f(X(s / 8))} ${f(Y(lit(s / 8)))}`)
  out.push(`<path class="area" d="M${line.join('L')}L${X1} ${BOT}L${X0} ${BOT}Z"/>`)
  out.push(`<path class="curve" d="M${line.join('L')}"/>`)
  out.push(`<line class="base" x1="${X0}" y1="${BOT}" x2="${X1}" y2="${BOT}"/>`)

  const t0 = days.findIndex((d) => d.date === today)
  if (t0 >= 0) out.push(`<line class="today" x1="${f(X(t0 + 0.5))}" y1="${TOP - 8}" x2="${f(X(t0 + 0.5))}" y2="${BOT}"/>`)

  for (const p of phases) out.push(`<circle class="${p.kind}" cx="${f(X(p.x))}" cy="${f(Y(p.kind === 'full' ? 1 : 0))}" r="4.5"/>`)

  // Day marks on the curve at that day's noon, stacked upward when a day has several.
  days.forEach((d, i) => {
    const marks = [
      d.ekadashi && 'ekadashi',
      d.marks.some((m) => m.kind === 'pushya') && 'favoured',
      d.marks.some((m) => m.kind === 'eclipse') && 'eclipse',
    ].filter(Boolean)
    marks.forEach((cls, k) => {
      const y = Math.max(Y(lit(i + 0.5)) - k * 9, TOP - 4)
      out.push(`<circle class="${cls}" cx="${f(X(i + 0.5))}" cy="${f(y)}" r="${cls === 'eclipse' ? 3.5 : 3.2}"/>`)
    })
  })

  // Day numbers: the 1st, every 5th, and the last.
  days.forEach((_, i) => {
    const day = i + 1
    if (day === 1 || day % 5 === 0 || (day === n && n % 5 > 1))
      out.push(`<text class="${i === t0 ? 'dn on' : 'dn'}" x="${f(X(i + 0.5))}" y="${BOT + 12}" text-anchor="middle">${day}</text>`)
  })
  out.push(`<text class="pc" x="${X0}" y="${TOP - 8}">100 %</text>`)

  // A tap anywhere on a day's column opens that day.
  days.forEach((d, i) => out.push(`<rect class="hit" data-date="${d.date}" x="${f(X(i))}" y="0" width="${f(dw)}" height="${BOT + 16}"/>`))

  const svg = `<svg class="wave" viewBox="0 0 ${W} ${BOT + 16}" role="img" aria-label="${t('waveTitle')}">
    <defs><linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1"><stop class="s0" offset="0"/><stop class="s1" offset="1"/></linearGradient></defs>
    ${out.join('')}
  </svg>`
  return { svg, phases, lit }
}
