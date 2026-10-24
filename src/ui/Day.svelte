<script lang="ts">
  // Day screen (SPEC 5.1): renders dayView() from ./day and the day clock, so every value on
  // screen is the engine's output.
  import AppBar from './AppBar.svelte'
  import { computeDay } from '../core/panchang'
  import { addDays, civilDate } from '../core/time'
  import DayClock from './DayClock.svelte'
  import { dayView, momentFor, type Fact, type SignLine } from './day'
  import { labelHtml, t } from './format'
  import { icon } from './icons'
  import { realisticMoon } from './moon'
  import { app } from './state.svelte'

  // The clock moves the day clock's hand and the lunar-day bar; it ticks twice a minute and
  // whenever the app comes back to the foreground.
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

  const loc = $derived(app.location)
  const today = $derived(civilDate(loc.tz, clock))
  // app.date null = follow today, so the screen rolls over at midnight on its own. The month
  // screen sets it when a day is tapped.
  const date = $derived(app.date ?? today)
  const day = $derived(computeDay(date, loc))
  const prev = $derived(computeDay(addDays(date, -1), loc))
  const v = $derived.by(() => {
    void app.settings.hour12 // times are formatted inside dayView; re-run when the format changes
    return dayView(day, loc, momentFor(day, loc, clock), app.settings.zodiac)
  })

  // Where the clock's hand was moved to (null = now); the top bar's Now brings back today and now.
  let picked = $state<Date | null>(null)
  const atNow = $derived(date === today && !picked)

  const go = (days: number) => {
    const d = addDays(date, days)
    app.date = d === today ? null : d
  }
</script>

{#snippet fact(f: Fact)}
  <li class="fact" data-sheet={f.term} data-sheet-lead-title={f.lead?.title} data-sheet-lead={f.lead?.text}>
    {@html f.icon}
    <div>
      <span class="label">{@html labelHtml(f.label)}</span><strong>{f.value}</strong><span class="sk">{f.sanskrit}</span>
      {#if f.next}<span class="next">{f.next}</span>{/if}
    </div>
    {#if f.right}<span class="right num">{f.right}</span>{/if}
  </li>
{/snippet}

{#snippet sign(s: SignLine)}
  <p class="sign" data-sheet="rashi" data-sheet-lead-title={s.lead.title} data-sheet-lead={s.lead.text}>
    <span>{s.text} · <span class="sk">{s.sanskrit}</span></span>
    <small class="num">{s.until}{s.next ? `, ${s.next}` : ''}</small>
  </p>
{/snippet}

<main class="screen">
  <!-- Today and now in one button, on the bar so it stays in reach while the page scrolls (user, 2026-10-14). -->
  <AppBar now={{ show: !atNow, reset: () => ((app.date = null), (picked = null)) }}>
    <div class="datechip">
      <button aria-label={t('previousDay')} onclick={() => go(-1)}>{@html icon.left}</button>
      <!-- Tap the date for the system calendar: any day in one step (user, 2026-10-14). -->
      <label class="datepick">
        <span class="num">{v.shortDate}</span>
        <input
          type="date"
          value={date}
          aria-label={t('pickDate')}
          onclick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              // older browsers open their own picker on the tap
            }
          }}
          onchange={(e) => {
            const d = e.currentTarget.value
            if (d) app.date = d === today ? null : d
          }}
        />
      </label>
      <button aria-label={t('nextDay')} onclick={() => go(1)}>{@html icon.right}</button>
    </div>
  </AppBar>

  <section class="hero" aria-label={v.tithi.name} data-sheet="tithi" data-sheet-lead-title={v.tithi.lead.title} data-sheet-lead={v.tithi.lead.text}>
    {@html realisticMoon(v.moon.illumination, v.moon.waxing, 150, v.moon.label)}
    <h2>{v.tithi.title}</h2>
    <p class="sub num"><b><span class="sk">{v.tithi.name}</span></b> · {t('percentLit', { percent: v.tithi.percent })}</p>
    {@render sign(v.moonSign)}
    <div class="track" aria-hidden="true"><span style:width="{(v.tithi.progress * 100).toFixed(1)}%"></span></div>
    <p class="track-label num">{v.tithi.ends}</p>
    <p class="meaning">{@html labelHtml(v.tithi.meaning)}</p>
  </section>

  <DayClock {day} {prev} {loc} now={clock} bind:picked />

  <div class="card facts">
    {@render sign(v.sunSign)}
    <ul>
      {#each v.facts as f (f.term)}{@render fact(f)}{/each}
    </ul>
    <details class="more">
      <summary>{t('moreDetails')}{@html icon.down}</summary>
      <ul>
        {#each v.moreFacts as f (f.term)}{@render fact(f)}{/each}
      </ul>
    </details>
  </div>

  {#if v.tradition}
    <section class="card tradition" aria-label={t('sectionTradition')} data-sheet="rhythm" data-sheet-lead-title={v.tradition.lead.title} data-sheet-lead={v.tradition.lead.text}>
      <div class="head">{@html icon.leaf}<h3>{v.tradition.title}</h3></div>
      <p>{@html labelHtml(v.tradition.meaning)}</p>
    </section>
  {/if}
</main>
