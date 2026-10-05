<script lang="ts">
  // Sky screen (user, 2026-10-05): a top-down chart of the Sun, the Moon and the Earth over
  // the 30 lunar days, 27 Moon stars and 12 signs (./sky), then the facts it shows, a folded
  // legend and a time slider (±15 days). Prototype: mockups/sky-flat.ts.
  import { LOCALE, entry, t } from './format'
  import { realisticMoon } from './moon'
  import { rashi, skyView } from './sky'

  const HOUR = 3600_000
  let base = $state(Date.now())
  let offset = $state(0) // hours from base
  let timer = 0
  let playing = $state(false)

  const when = $derived(new Date(base + offset * HOUR))
  const v = $derived(skyView(when))
  const day = $derived(entry('tithi', v.tithi))
  const star = $derived(entry('nakshatra', v.nakshatra))
  const num = (n: number) => n.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const fmt = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })

  const now = () => {
    base = Date.now()
    offset = 0
  }
  const toggle = () => {
    playing = !playing
    if (!playing) return clearInterval(timer)
    timer = window.setInterval(() => (offset = offset >= 360 ? -360 : offset + 2), 60)
  }
  $effect(() => () => clearInterval(timer))
</script>

<main class="screen sky">
  <section class="card sky-card">{@html v.svg}</section>

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
        {@html realisticMoon(v.illumination, v.elongation < 180, 28, t('skyFromEarth'))}
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
