<script lang="ts">
  // Month screen (SPEC 5.2) — the approved P3 mockup (mockups/month.ts) in Svelte. Both render
  // monthView() from ./month. Tapping a day or a key date opens that day.
  import { computeMonth } from '../core/panchang'
  import { civilDate } from '../core/time'
  import { t } from './format'
  import { icon } from './icons'
  import { keyDateWhen, legend, monthView, shiftMonth } from './month'
  import { realisticMoon } from './moon'
  import { app } from './state.svelte'

  const loc = $derived(app.location)
  const today = $derived(civilDate(loc.tz, new Date()))
  // Opens on the month of the day last shown, else this month.
  let shown = $state((app.date ?? civilDate(app.location.tz, new Date())).slice(0, 7))
  const v = $derived.by(() => {
    void app.settings.hour12 // key-date times are formatted inside monthView
    const [y, m] = shown.split('-').map(Number)
    return monthView(computeMonth(y, m, loc), loc, today, app.settings.zodiac)
  })

  function open(date: string) {
    app.date = date === today ? null : date
    location.hash = '#/day'
  }
</script>

<main class="screen">
  <!-- The same top bar as the Day screen: city, then the month with ‹ › (user, 2026-10-06). -->
  <header class="appbar">
    <a class="chip" href="#/settings">{@html icon.navigate}<span>{loc.name}, {app.location.cc}</span></a>
    <div class="datechip">
      <button aria-label={t('previousMonth')} onclick={() => (shown = shiftMonth(shown, -1))}>{@html icon.left}</button>
      <h1 class="num">{v.title}</h1>
      <button aria-label={t('nextMonth')} onclick={() => (shown = shiftMonth(shown, 1))}>{@html icon.right}</button>
    </div>
  </header>

  <div class="grid">
    {#each v.weekdays as w, i (i)}<span class="dow" aria-hidden="true">{w}</span>{/each}
    {#each Array(v.lead) as _, i (i)}<span></span>{/each}
    {#each v.cells as c (c.date)}
      <a class="cell" class:rest={c.rest} class:today={c.today} href="#/day" aria-label={c.label} onclick={(e) => (e.preventDefault(), open(c.date))}>
        {#if c.ekadashi || c.favoured || c.eclipse}
          <span class="marks" aria-hidden="true">
            {#if c.ekadashi}<i class="ekadashi"></i>{/if}{#if c.favoured}<i class="favoured"></i>{/if}{#if c.eclipse}<i class="eclipse"></i>{/if}
          </span>
        {/if}
        <span class="d num">{c.n}</span>
        {@html realisticMoon(c.illumination, c.waxing, 24, '')}
      </a>
    {/each}
  </div>
  <ul class="legend">
    {#each legend() as item (item.swatch)}
      <li>
        {#if item.swatch === 'moon'}{@html realisticMoon(0.6, true, 14, '')}{:else}<i class="sw {item.swatch}"></i>{/if}
        <span>{item.label}{#if item.sanskrit}{' '}<span class="sk">{item.sanskrit}</span>{/if}</span>
      </li>
    {/each}
  </ul>

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
