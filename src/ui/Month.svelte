<script lang="ts">
  // Month screen (SPEC 5.2) — the approved P3 mockup (mockups/month.ts) in Svelte. Both render
  // monthView() from ./month. Tapping a day or a key date opens that day.
  import { computeMonth } from '../core/panchang'
  import { civilDate } from '../core/time'
  import { t } from './format'
  import { icon } from './icons'
  import { keyDateWhen, monthView, shiftMonth } from './month'
  import { realisticMoon } from './moon'
  import { app } from './state.svelte'

  const loc = $derived(app.location)
  const today = $derived(civilDate(loc.tz, new Date()))
  // Opens on the month of the day last shown, else this month.
  let shown = $state((app.date ?? civilDate(app.location.tz, new Date())).slice(0, 7))
  const v = $derived.by(() => {
    void app.settings.hour12 // key-date times are formatted inside monthView
    const [y, m] = shown.split('-').map(Number)
    return monthView(computeMonth(y, m, loc), loc, today)
  })

  function open(date: string) {
    app.date = date === today ? null : date
    location.hash = '#/day'
  }
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/settings">{@html icon.navigate}<span>{loc.name}, {app.location.cc}</span></a>
  </header>
  <div class="card month-head">
    <button class="icon-btn" aria-label={t('previousMonth')} onclick={() => (shown = shiftMonth(shown, -1))}>{@html icon.left}</button>
    <h1>{v.title}</h1>
    <button class="icon-btn" aria-label={t('nextMonth')} onclick={() => (shown = shiftMonth(shown, 1))}>{@html icon.right}</button>
  </div>

  <div class="grid">
    {#each v.weekdays as w, i (i)}<span class="dow" aria-hidden="true">{w}</span>{/each}
    {#each Array(v.lead) as _, i (i)}<span></span>{/each}
    {#each v.cells as c (c.date)}
      <a class="cell" class:rest={c.rest} class:today={c.today} href="#/day" aria-label={c.label} onclick={(e) => (e.preventDefault(), open(c.date))}>
        {#if c.ekadashi}<span class="dot"></span>{/if}
        <span class="d num">{c.n}</span>
        {@html realisticMoon(c.illumination, c.waxing, 24, '')}
      </a>
    {/each}
  </div>
  <p class="legend">
    <span>{@html realisticMoon(0.6, true, 14, '')}{t('legendMoonShape')}</span>
    <span><i class="rest-swatch"></i>{t('legendRest')}</span>
    <span><i style="background:var(--color-accent);border-radius:50%;width:6px;height:6px"></i>{t('legendEkadashi')} <span class="sk">Ekadashi</span></span>
    <span><i style="border:1px solid var(--color-moon)"></i>{t('legendToday')}</span>
  </p>

  <h2 class="section-title">{t('keyDates')}</h2>
  <ul class="events">
    {#each v.events as e (`${e.date}${e.title}`)}
      <li>
        <a class="card event {e.cls}" href="#/day" style="color:inherit;text-decoration:none" onclick={(ev) => (ev.preventDefault(), open(e.date))}>
          {@html e.svg}
          <div><b>{e.title}</b><small>{e.sub}</small></div>
          <span class="when num">{keyDateWhen(e, loc)}</span>
        </a>
      </li>
    {/each}
  </ul>
</main>
