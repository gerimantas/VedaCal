<script lang="ts">
  // Week screen (user, 2026-10-23): a summary row of seven day colours, then one bar per day on a
  // shared hour axis. Always the rainbow scale: the average and the bars are built on its 7 steps.
  import Menu from './Menu.svelte'
  import ModeChip from './ModeChip.svelte'
  import VersionTag from './VersionTag.svelte'
  import { computeDay } from '../core/panchang'
  import { addDays, civilDate } from '../core/time'
  import { resolveBirth } from './birth'
  import { t } from './format'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { colourVar, RAINBOW_ORDER } from './verdict'
  import { axisStartHour, axisWindow, axisX, barGradient, mondayOf, scaleColour, weekDates, weekLabel, weekModel } from './week'

  const loc = $derived(app.location)
  // The clock only moves the "now" marker: twice a minute and when the app comes back to the foreground.
  let clock = $state(new Date())
  $effect(() => {
    const tick = () => (clock = new Date())
    const id = setInterval(tick, 30_000)
    const onShow = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onShow)
    }
  })
  const today = $derived(civilDate(loc.tz, clock))
  // Opens on the week of the day last shown, else this week.
  let shown = $state(mondayOf(app.date ?? civilDate(app.location.tz, new Date())))
  const dates = $derived(weekDates(shown))

  // The panchang of 8 days (the day before Monday feeds Monday's window) depends on the place and
  // the week only, so changing the group, direction or view mode does not recompute it.
  const days = $derived(dates.map((d) => computeDay(d, loc)))
  const before = $derived(computeDay(addDays(shown, -1), loc))

  // The same inputs as the Day clock.
  const group = $derived(app.settings.activity)
  const dir = $derived(group === 1 ? app.settings.travelDir : null)
  const birth = $derived((app.birth && app.settings.mine ? resolveBirth(app.birth) : null)?.birth ?? null)
  const week = $derived(weekModel(days, before, group, dir, birth))

  const hour = $derived(axisStartHour(week.flatMap((w) => (w ? [w.model.window.start] : [])), loc.tz) ?? 0)
  // Hour ticks every 3 hours, from the axis start to its end.
  const hours = $derived(Array.from({ length: 9 }, (_, i) => ({ x: i / 8, label: String((hour + i * 3) % 24).padStart(2, '0') })))
  const names = t('weekdaysShort').split(' ')

  // Scale colours as RGB, read from the theme's tokens (the ring does the same).
  const scaleRgb = $derived.by(() => {
    void app.settings.theme
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    if (!probe) return null
    return RAINBOW_ORDER.map((s) => {
      probe.clearRect(0, 0, 1, 1)
      probe.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(colourVar(s, 'rainbow')).trim()
      probe.fillRect(0, 0, 1, 1)
      return [...probe.getImageData(0, 0, 1, 1).data.slice(0, 3)]
    })
  })

  const rows = $derived(
    dates.map((date, i) => {
      const w = week[i]
      const win = axisWindow(date, hour, loc.tz)
      return {
        date,
        name: names[i],
        n: Number(date.slice(8)),
        isToday: date === today,
        w,
        colour: w && scaleRgb ? scaleColour(scaleRgb, w.avg) : null,
        bar: w && scaleRgb ? barGradient(w.model, win, loc.tz, scaleRgb) : 'none',
        start: w ? axisX(w.model.window.start, win, loc.tz) : 0,
        now: date === today ? axisX(clock, win, loc.tz) : -1,
      }
    }),
  )

  let picked = $state<string | null>(null)
  function pick(date: string) {
    picked = date
    document.getElementById(`wk-${date}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  function open(date: string) {
    app.date = date === today ? null : date
    location.hash = '#/day'
  }
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/settings">{@html icon.navigate}<span>{loc.name}, {loc.cc}</span></a>
    <div class="datechip">
      <button aria-label={t('previousWeek')} onclick={() => (shown = addDays(shown, -7))}>{@html icon.left}</button>
      <h1 class="num"><span class="wk-long">{weekLabel(dates)}</span><span class="wk-short">{weekLabel(dates).replace(/^\d{4}-/, '')}</span></h1>
      <button aria-label={t('nextWeek')} onclick={() => (shown = addDays(shown, 7))}>{@html icon.right}</button>
    </div>
    <ModeChip />
    <VersionTag />
    <Menu />
  </header>

  <div class="summary" role="group" aria-label={t('week')}>
    {#each rows as r (r.date)}
      <button class="block" class:today={r.isToday} class:picked={picked === r.date} onclick={() => pick(r.date)} aria-label="{r.name} {r.n}{r.w?.star ? `, ★ ${t('weekStarAria')}` : ''}">
        <span class="sw" style:background={r.colour ?? 'var(--color-card)'}>{#if r.w?.star}<b class="star">★</b>{/if}</span>
        <span class="dow">{r.name}</span>
      </button>
    {/each}
  </div>

  <div class="bars">
    <div class="axis" aria-hidden="true">
      <span></span>
      <span class="ticks num">{#each hours as h (h.x)}<span style:left="{h.x * 100}%">{h.label}</span>{/each}</span>
    </div>
    {#each rows as r (r.date)}
      <a id="wk-{r.date}" class="row" class:picked={picked === r.date} class:today={r.isToday} href="#/day" aria-label="{r.name} {r.n}" onclick={(e) => (e.preventDefault(), open(r.date))}>
        <span class="lab num">{r.name} {r.n}</span>
        <span class="bar" style:background-image={r.bar}>
          {#each hours as h (h.x)}<i class="hr" style:left="{h.x * 100}%"></i>{/each}
          {#if r.w}<i class="t0" style:left="{r.start * 100}%"></i>{/if}
          {#if r.now >= 0 && r.now <= 1}<i class="now" style:left="{r.now * 100}%"></i>{/if}
        </span>
      </a>
    {/each}
  </div>

  <p class="note">{t('paletteNote')}</p>
  <p class="note">{t('weekNote')}</p>
</main>

<style>
  .summary {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    margin-top: var(--space-sm);
  }
  .block {
    display: grid;
    gap: 2px;
    justify-items: center;
    padding: 3px;
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    background: none;
    color: var(--color-muted);
    font: inherit;
    cursor: pointer;
  }
  .block.today {
    border-color: color-mix(in oklch, var(--color-accent) 55%, transparent);
  }
  .block.picked {
    border-color: var(--color-ink);
  }
  .sw {
    display: grid;
    place-items: center;
    width: 100%;
    height: 2.25rem;
    border-radius: 6px;
  }
  /* A star sits on any colour: dark with a light halo. */
  .star {
    color: #111;
    font-size: var(--text-sm);
    text-shadow: 0 0 3px #fff, 0 0 3px #fff;
  }
  .dow {
    font-size: var(--text-sm);
  }
  .bars {
    position: relative;
    display: grid;
    gap: 6px;
    margin-top: var(--space-md);
  }
  .axis,
  .row {
    display: grid;
    grid-template-columns: 3.6rem minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2xs);
  }
  .axis {
    height: 1rem;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .ticks {
    position: relative;
    height: 100%;
  }
  .ticks span {
    position: absolute;
    transform: translateX(-50%);
  }
  .row {
    padding: 2px 0;
    border-radius: var(--radius-md);
    color: inherit;
    text-decoration: none;
  }
  .row.picked {
    background: color-mix(in oklch, var(--color-ink) 12%, transparent);
  }
  .lab {
    font-size: var(--text-sm);
    color: var(--color-muted);
    white-space: nowrap;
  }
  .row.today .lab {
    color: var(--color-accent);
    font-weight: 650;
  }
  .bar {
    position: relative;
    height: 1.6rem;
    border-radius: 4px;
    background-color: var(--color-card);
    background-repeat: no-repeat;
    overflow: hidden;
  }
  .hr {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: color-mix(in oklch, var(--color-paper) 55%, transparent);
  }
  /* Day start: the same idea as the clock's tick. */
  .t0 {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--color-ink);
    box-shadow: 0 0 0 1px var(--color-card);
  }
  .now {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    margin: -4.5px 0 0 -4.5px;
    border-radius: 50%;
    background: var(--color-ink);
    box-shadow: 0 0 0 2px var(--color-card);
  }
  .note {
    margin: var(--space-2xs) 0 0;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
</style>
