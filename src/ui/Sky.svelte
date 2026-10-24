<script lang="ts">
  // Sky screen (user, 2026-10-05): a top-down chart of the Sun, the Moon and the Earth over
  // the 30 lunar days, 27 Moon stars and 12 signs (./sky), then the facts it shows, a folded
  // legend and a time slider (±15 days).
  // Smooth Play (user, 2026-10-24): the signs/stars rings are their own group and redraw only when
  // their highlights change; Play runs on requestAnimationFrame at 2 h per 60 ms; a short tap on
  // the chart starts/stops it; the panel Moon is rebuilt only when its percent or phase changes.
  import AppBar from './AppBar.svelte'
  import { civilDate } from '../core/time'
  import { LOCALE, barDate, entry, t } from './format'
  import { icon } from './icons'
  import { realisticMoon } from './moon'
  import { SKY_DEFS, rashi, skyView, skyViewSun } from './sky'
  import { app } from './state.svelte'

  const HOUR = 3600_000
  let base = $state(Date.now())
  let offset = $state(0) // hours from base
  let frame = 0
  let playing = $state(false)

  const when = $derived(new Date(base + offset * HOUR))
  let tab = $state<'earth' | 'sun'>('earth') // nothing is remembered between visits
  const v = $derived(tab === 'sun' ? skyViewSun(when) : skyView(when, { still: playing }))
  const day = $derived(entry('tithi', v.tithi))
  const star = $derived(entry('nakshatra', v.nakshatra))
  const num = (n: number) => n.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const fmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })

  // The top bar is the Day screen's: city, then the date with ‹ › — a day back or on.
  const DAY = 24 * HOUR
  const shortDate = $derived(
    barDate(civilDate(app.location.tz, when)),
  )

  const now = () => {
    base = Date.now()
    offset = 0
  }
  const HOURS_PER_MS = 2 / 60 // same speed as before: 2 h per 60 ms
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }
  const toggle = () => {
    playing = !playing
    if (!playing) return stop()
    let last = performance.now()
    const step = (ts: number) => {
      const next = offset + (ts - last) * HOURS_PER_MS
      last = ts
      offset = next > 360 ? -360 : next
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  }
  $effect(() => stop)

  // A short tap on the chart toggles Play; a long press or a drag (scroll) does not.
  let down: { t: number; x: number; y: number } | null = null
  const pointerdown = (e: PointerEvent) => (down = { t: e.timeStamp, x: e.clientX, y: e.clientY })
  const pointerup = (e: PointerEvent) => {
    if (down && e.timeStamp - down.t < 300 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) toggle()
    down = null
  }
  const keydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    toggle()
  }

  // Panel Moon: a primitive key first, so the string (and the DOM) is the same between frames.
  const moonKey = $derived(`${Math.round(v.illumination * 100)}:${v.elongation < 180 ? 1 : 0}`)
  const moonSvg = $derived.by(() => {
    const [pct, waxing] = moonKey.split(':')
    return realisticMoon(Number(pct) / 100, waxing === '1', 28, t('skyFromEarth'))
  })
</script>

<main class="screen sky">
  <AppBar now={{ show: offset !== 0 || civilDate(app.location.tz, when) !== civilDate(app.location.tz, new Date()), reset: now }}>
    <div class="datechip">
      <button aria-label={t('previousDay')} onclick={() => (base -= DAY)}>{@html icon.left}</button>
      <span class="num">{shortDate}</span>
      <button aria-label={t('nextDay')} onclick={() => (base += DAY)}>{@html icon.right}</button>
    </div>
  </AppBar>

  <div class="segmented sky-tabs" role="group" aria-label={t('skyTitle')}>
    {#each [['earth', t('skyTabEarth')], ['sun', t('skyTabSun')]] as const as [value, label] (value)}
      <button aria-pressed={tab === value} onclick={() => (tab = value)}>{label}</button>
    {/each}
  </div>

  <div
    class="card sky-card"
    role="button"
    tabindex="0"
    aria-label={playing ? 'Pause' : 'Play'}
    onpointerdown={pointerdown}
    onpointerup={pointerup}
    onpointercancel={() => (down = null)}
    onkeydown={keydown}
  >
    <svg class="sky-chart" viewBox="34 34 332 332" role="img" aria-label={t('skyTitle')}>
      <defs>{@html SKY_DEFS}</defs>
      <g>{@html v.rings}</g>
      <g>{@html v.moving}</g>
    </svg>
  </div>

  <section class="card sky-facts">
    <dl>
      <dt>{t('labelTithi')}</dt>
      <dd><b class="ring-no">{v.tithi}</b> {day.title} <span class="sk">· {day.name}</span></dd>
      <dt>{t('skyAngle')}</dt>
      <dd>
        <span class="moon-text">{num(v.elongation)}°</span>
        <span class="quiet">÷ 12° = {num(v.elongation / 12)}: {t('skyDone', { done: v.tithi - 1, day: v.tithi })}</span>
      </dd>
      <dt>{t('labelStar')}</dt>
      <dd><b class="ring-no">{v.nakshatra}</b> {star.title} <span class="sk">· {star.name}</span></dd>
      <dt>{t('skyMoonSign')}</dt>
      <dd><span class="moon-text">{rashi(v.moonSign).title}</span> <span class="sk">· {rashi(v.moonSign).name}</span></dd>
      <dt>{t('skySunSign')}</dt>
      <dd><span class="sun-text">{rashi(v.sunSign).title}</span> <span class="sk">· {rashi(v.sunSign).name}</span></dd>
      <dt>{t('skyFromEarth')}</dt>
      <dd class="seen">
        {@html moonSvg}
        {t('skyLit', { percent: Math.round(v.illumination * 100) })}
      </dd>
    </dl>
  </section>

  <details class="card sky-legend">
    <summary>{t('skyLegendTitle')}</summary>
    <p class="key orbit">{t('skyLegendOrbit')}</p>
    <p class="key stars">{t('skyLegendStars')}</p>
    <p class="key signs">{t('skyLegendSigns')}</p>
    <p class="quiet">{t('skyLegendNote')}</p>
  </details>

  <section class="card sky-time">
    <p class="num">{fmt.format(when)}</p>
    <div class="sky-controls">
      <button type="button" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
      <input type="range" min="-360" max="360" step="1" bind:value={offset} aria-label={t('skyTitle')} />
      <button type="button" onclick={now}>{t('now')}</button>
    </div>
  </section>
</main>
