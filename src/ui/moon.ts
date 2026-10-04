// The hero Moon: a shaded sphere with maria (dark "seas") and a soft terminator, drawn as
// SVG so it stays sharp, themeable and offline. Lit on the right while waxing, on the left
// while waning (northern-hemisphere view).

/** Path of the lit part of a disc of radius r centred at c. */
function litPath(c: number, r: number, illumination: number, waxing: boolean): string {
  const rx = Math.abs(1 - 2 * illumination) * r
  const crescent = illumination < 0.5
  const outer = waxing ? 1 : 0
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0
  return `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${inner} ${c} ${c - r} Z`
}

// Maria and craters as [x, y, radius, opacity] on a 100-unit disc (roughly the near side).
const MARIA: [number, number, number, number][] = [
  [38, 34, 13, 0.28], [55, 30, 9, 0.22], [62, 46, 11, 0.24], [44, 52, 8, 0.2], [30, 56, 7, 0.18],
  [58, 64, 6, 0.16], [70, 30, 5, 0.14], [36, 72, 4, 0.12], [66, 74, 5, 0.14], [50, 82, 3, 0.12],
]

let uid = 0

export function realisticMoon(illumination: number, waxing: boolean, size: number, label: string): string {
  const id = `m${++uid}`
  const c = 50
  const r = 48
  const s = (n: number) => (n / 100) * r * 2 + (c - r) // scale disc-units into the viewBox
  const dark =
    illumination > 0.995
      ? ''
      : illumination < 0.005
        ? `<circle cx="${c}" cy="${c}" r="${r}" fill="var(--moon-shadow)"/>`
        : `<path d="${litPath(c, r, 1 - illumination, !waxing)}" fill="var(--moon-shadow)" filter="url(#${id}-soft)"/>`
  return `<svg class="moon-real" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}">
    <defs>
      <radialGradient id="${id}-sphere" cx="42%" cy="38%" r="65%">
        <stop offset="0" stop-color="var(--moon-hi)"/>
        <stop offset="1" stop-color="var(--moon-lo)"/>
      </radialGradient>
      <clipPath id="${id}-clip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>
      <filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>
    </defs>
    <g clip-path="url(#${id}-clip)">
      <circle cx="${c}" cy="${c}" r="${r}" fill="url(#${id}-sphere)"/>
      ${MARIA.map(([x, y, rr, o]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${rr}" fill="var(--moon-mare)" opacity="${o}"/>`).join('')}
      ${dark}
    </g>
  </svg>`
}
