<script lang="ts">
  // Week screen (user, 2026-10-23): a summary row of seven day colours, then one bar per day on a
  // shared hour axis. The average and the bars are built on its 7 steps.
  import AppBar from './AppBar.svelte'
  import { computeDay } from '../core/panchang'
  import { addDays, civilDate } from '../core/time'
  import { resolveBirth } from './birth'
  import { duration, LOCALE, MONTH, t, time } from './format'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { colourVar, levelWord, periodName, RAINBOW_ORDER, shadeWord, type DayRow } from './verdict'
  import { axisStartHour, axisWindow, axisX, barGradient, daySummary, mondayOf, scaleColour, weekDates, weekLabel, weekModel } from './week'

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
      probe.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(colourVar(s)).trim()
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
  // A tap on a day opens its sheet (user, 2026-10-24); a polar day has no model, so it only highlights.
  let dialog: HTMLDialogElement
  const sheetRow = $derived(rows.find((r) => r.date === picked))
  const sum = $derived(sheetRow?.w ? daySummary(sheetRow.w.model) : null)
  const title = $derived(sheetRow ? new Intl.DateTimeFormat(LOCALE, { weekday: 'long', month: MONTH, day: 'numeric', timeZone: 'UTC' }).format(new Date(`${sheetRow.date}T12:00:00Z`)) : '')
  function tap(date: string) {
    pick(date)
    if (rows.find((r) => r.date === date)?.w) dialog.showModal()
  }
  /** The row's label: the base goes by "day base", as in the Day screen's list. */
  const rowNames = (r: DayRow) => [...new Set(r.why.map((p) => (p.kind === 'base' ? t('segmentBase') : periodName(p))))].join(', ')
  function open(date: string) {
    app.date = date === today ? null : date
    location.hash = '#/day'
  }
</script>

<main class="screen">
  <AppBar now={{ show: shown !== mondayOf(today) || app.date !== null, reset: () => ((app.date = null), (picked = null), (shown = mondayOf(today))) }}>
    <div class="datechip">
      <button aria-label={t('previousWeek')} onclick={() => (shown = addDays(shown, -7))}>{@html icon.left}</button>
      <h1 class="num">{weekLabel(dates)}</h1>
      <button aria-label={t('nextWeek')} onclick={() => (shown = addDays(shown, 7))}>{@html icon.right}</button>
    </div>
  </AppBar>

  <div class="summary" role="group" aria-label={t('week')}>
    {#each rows as r (r.date)}
      <button class="block" class:today={r.isToday} class:picked={picked === r.date} onclick={() => tap(r.date)} aria-label="{r.name} {r.n}{r.w?.star ? `, ★ ${t('weekStarAria')}` : ''}">
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
      <a id="wk-{r.date}" class="row" class:picked={picked === r.date} class:today={r.isToday} href="#/day" aria-label="{r.name} {r.n}" onclick={(e) => (e.preventDefault(), r.w ? tap(r.date) : open(r.date))}>
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

{#snippet times(list: DayRow[])}
  {#if list.length}
    <ul class="times">
      {#each list as r (r.start.getTime())}
        <li><i class="dot" style:background="var({colourVar(r.shade)})"></i><span class="num">{time(r.start, loc)}–{time(r.end, loc)}</span><span class="why">{rowNames(r)}</span></li>
      {/each}
    </ul>
  {:else}
    <p class="none">{t('daySheetNone')}</p>
  {/if}
{/snippet}

<dialog class="sheet" bind:this={dialog} onclick={(e) => e.target === dialog && dialog.close()}>
  <div class="sheet-body">
    {#if sheetRow?.w && sum}
      <h3 class="dtitle">{title}
        <span class="sw dsw" style:background={sheetRow.colour ?? 'var(--color-card)'}></span>
        <span class="dword">{shadeWord(RAINBOW_ORDER[Math.round(sheetRow.w.avg)])}{#if sheetRow.w.star} <b class="star">★</b>{/if}</span>
      </h3>
      <h4>{t('daySheetWhy')}</h4>
      <p class="none">{t('daySheetAvg')}</p>
      <div class="share" aria-hidden="true">
        {#each sum.shares as x (x.shade)}<i style:flex="{x.ms} 0 0" style:background="var({colourVar(x.shade)})"></i>{/each}
      </div>
      <p class="shares">{sum.shares.map((x) => `${shadeWord(x.shade)} ${duration(x.ms)}`).join(' · ')}</p>
      <h4>{t('daySheetBest')}</h4>
      {@render times(sum.best)}
      <h4>{t('daySheetWorst')}</h4>
      {@render times(sum.worst)}
      <h4>{t('daySheetReasons')}</h4>
      <ul class="times">
        {#each sum.reasons as p (periodName(p))}<li><span class="why">{periodName(p)} — {levelWord(p)}</span></li>{/each}
      </ul>
      <button class="sheet-close open" onclick={() => (dialog.close(), open(sheetRow.date))}>{t('daySheetOpen')}</button>
    {/if}
    <button class="sheet-close" onclick={() => dialog.close()}>{t('close')}</button>
  </div>
</dialog>

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
  .dtitle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs);
  }
  .dsw {
    display: inline-block;
    width: 1.75rem;
    height: 1.25rem;
  }
  .dword {
    font-size: var(--text-sm);
    font-weight: 500;
  }
  .sheet h4 {
    margin: var(--space-sm) 0 var(--space-3xs, 2px);
    font-size: var(--text-sm);
    font-weight: 650;
  }
  .none,
  .shares {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-muted);
  }
  .share {
    display: flex;
    height: 0.6rem;
    margin: var(--space-3xs, 2px) 0;
    border-radius: 3px;
    overflow: hidden;
  }
  .times {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }
  .times li {
    display: flex;
    align-items: baseline;
    gap: var(--space-2xs);
    padding: 2px 0;
  }
  .times .why {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .dot {
    flex: none;
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
  }
  .sheet-close.open {
    background: var(--color-accent);
    color: var(--color-paper);
    border-color: transparent;
  }
  .note {
    margin: var(--space-2xs) 0 0;
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
</style>
