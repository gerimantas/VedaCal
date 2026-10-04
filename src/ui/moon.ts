// The hero Moon: a real full-moon photograph (NASA Scientific Visualization Studio, public
// domain — svs.gsfc.nasa.gov/5048) with the night side drawn over it as SVG at the true
// illumination. Lit on the right while waxing, on the left while waning (northern-hemisphere
// view). The photo ships in public/, so it works offline.

const PHOTO = `${import.meta.env.BASE_URL}moon-full.webp`

/** Path of the lit part of a disc of radius r centred at c. */
function litPath(c: number, r: number, illumination: number, waxing: boolean): string {
  const rx = Math.abs(1 - 2 * illumination) * r
  const crescent = illumination < 0.5
  const outer = waxing ? 1 : 0
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0
  return `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${inner} ${c} ${c - r} Z`
}

let uid = 0

export function realisticMoon(illumination: number, waxing: boolean, size: number, label: string): string {
  const id = `m${++uid}`
  const c = 50
  const r = 50
  // The night side is the lit path of the opposite phase. It is drawn as the photo itself,
  // dimmed, not as a painted shape: browser auto-dark modes recolour fills (they turned a
  // black shadow white) but leave photos alone. The blur softens the terminator.
  const night =
    illumination > 0.995
      ? ''
      : illumination < 0.005
        ? `<circle cx="${c}" cy="${c}" r="${r}"/>`
        : `<path d="${litPath(c, r, 1 - illumination, !waxing)}"/>`
  const photo = (extra = '') =>
    `<image href="${PHOTO}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" ${extra}/>`
  return `<svg class="moon-real" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}">
    <defs>
      <clipPath id="${id}-clip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>
      ${night ? `<clipPath id="${id}-night">${night}</clipPath>` : ''}
      <filter id="${id}-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter>
      <filter id="${id}-dim" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.1 0 0 0 0 0 0.1 0 0 0 0 0 0.12 0 0 0 0 0 1 0"/></filter>
    </defs>
    <g clip-path="url(#${id}-clip)">
      ${photo()}
      ${night ? `<g filter="url(#${id}-soft)"><g clip-path="url(#${id}-night)">${photo(`filter="url(#${id}-dim)"`)}</g></g>` : ''}
    </g>
    <circle class="moon-rim" cx="${c}" cy="${c}" r="${r - 1}" fill="none" stroke="var(--color-neutral)" stroke-opacity="0.45" stroke-width="2"/>
  </svg>`
}
