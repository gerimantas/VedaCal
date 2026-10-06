<script lang="ts">
  // Day screen (SPEC 5.1) — the approved P3 mockup (mockups/day.ts, v22) in Svelte. Both
  // render dayView() from ./day, so every value on screen is the engine's output.
  import { computeDay } from '../core/panchang'
  import { addDays, civilDate } from '../core/time'
  import { clockOn, dayView, momentFor, nowHtml, type Fact, type SignLine } from './day'
  import { t } from './format'
  import { icon } from './icons'
  import { realisticMoon } from './moon'
  import { terms } from './terms'
  import { app } from './state.svelte'

  // The clock moves the sun on the dial and the lunar-day bar; it ticks twice a minute and
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
  const v = $derived.by(() => {
    void app.settings.hour12 // times are formatted inside dayView; re-run when the format changes
    return dayView(day, loc, momentFor(day, loc, clock), app.settings.zodiac, clockOn(day, loc, clock))
  })

  // Choghadiya list sections: what is left of last night (before sunrise only), day, night.
  const chogParts = [
    ['before', t('untilSunrise')],
    ['day', `${t('sunrise')} → ${t('sunset')}`],
    ['night', `${t('sunset')} → ${t('sunrise')}`],
  ] as const

  const go = (days: number) => {
    const d = addDays(date, days)
    app.date = d === today ? null : d
  }
</script>

{#snippet fact(f: Fact)}
  <li class="fact" data-sheet={f.term}>
    {@html f.icon}
    <div>
      <span class="label">{f.label}</span><strong>{f.value}</strong><span class="sk">{f.sanskrit}</span>
      {#if f.next}<span class="next">{f.next}</span>{/if}
    </div>
    {#if f.right}<span class="right num">{f.right}</span>{/if}
  </li>
{/snippet}

{#snippet sign(s: SignLine)}
  <p class="sign" data-sheet="rashi">
    <span>{s.text} · <span class="sk">{s.sanskrit}</span></span>
    <small class="num">{s.until}{s.next ? `, ${s.next}` : ''}</small>
  </p>
{/snippet}

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/settings">{@html icon.navigate}<span>{loc.name}, {loc.cc}</span></a>
    <div class="datechip">
      <button aria-label={t('previousDay')} onclick={() => go(-1)}>{@html icon.left}</button>
      <span class="num">{v.shortDate}</span>
      <button aria-label={t('nextDay')} onclick={() => go(1)}>{@html icon.right}</button>
    </div>
  </header>
  {#if date !== today}
    <a class="today-link" href="#/day" onclick={() => (app.date = null)}>{t('today')} →</a>
  {/if}

  <section class="hero" aria-label={v.tithi.name} data-sheet="tithi">
    {@html realisticMoon(v.moon.illumination, v.moon.waxing, 150, v.moon.label)}
    <h2>{v.tithi.title}</h2>
    <p class="sub num"><b>{v.tithi.name}</b> · {t('percentLit', { percent: v.tithi.percent })}</p>
    {@render sign(v.moonSign)}
    <div class="track" aria-hidden="true"><span style:width="{(v.tithi.progress * 100).toFixed(1)}%"></span></div>
    <p class="track-label num">{v.tithi.ends}</p>
    <p class="meaning">{v.tithi.meaning}</p>
  </section>

  <section class="card arcbox" aria-labelledby="s-sun">
    <h2 id="s-sun">{t('sectionRhythm')}</h2>
    {#if v.polar}
      <p class="footnote">{t('notice.polar')}</p>
    {:else}
      <div class="arcwrap">
        <div class="dial-wrap">
          {@html v.dial}
          <div class="dial-center">
            {@html nowHtml(v.nowWindows)}
            {#if v.next}<small>{v.next.label}</small><b class="num">{v.next.in}</b>{/if}
          </div>
        </div>
      </div>
    {/if}
    {@render sign(v.sunSign)}
    <ul class="wins">
      {#each v.windows as w (w.term)}
        <li class="win {w.kind}" class:none={!w.start} data-sheet={w.term}>
          <i aria-hidden="true"></i>
          <div><b>{w.name}</b><span class="sk">{w.sanskrit}</span>{#if w.overlap}<small class="overlap num">{w.overlap}</small>{/if}</div>
          <!-- "12:44–13:29" breaks only at the dash, never inside a time (12-hour clocks). -->
          <span class="when num">
            {#if w.start}<span class="nw">{w.start}–</span><span class="nw">{w.end}</span>{:else}{w.none}{/if}
          </span>
        </li>
      {/each}
    </ul>
    {#if v.choghadiya.length}
      <!-- Choghadiya, folded like "More details": its part now in the summary, all 16 inside. -->
      <details class="more chog">
        <summary>
          <span>
            <span class="chog-title">{terms.choghadiya[0]} · <span class="sk">Choghadiya</span></span>
            {#if v.choghadiyaNow}
              <span class="chog-now {v.choghadiyaNow.rating}">{t('now')}: <b>{v.choghadiyaNow.name}</b> · <span class="sk">{v.choghadiyaNow.sanskrit}</span></span>
            {/if}
          </span>
          {@html icon.down}
        </summary>
        {#each chogParts as [part, head] (part)}
          {@const rows = v.choghadiya.filter((c) => c.part === part)}
          {#if rows.length}
            <p class="chog-head">{head}</p>
            <ul class="chog-list">
              {#each rows as c (c.start)}
                <li class="chog-row {c.rating}" class:current={c.current} data-sheet="choghadiya">
                  <i aria-hidden="true"></i>
                  <div><b>{c.name}</b><span class="sk">{c.sanskrit}</span></div>
                  <span class="when num"><span class="nw">{c.start}–</span><span class="nw">{c.end}</span></span>
                </li>
              {/each}
            </ul>
          {/if}
        {/each}
      </details>
    {/if}
  </section>

  <div class="card facts">
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
    <section class="card tradition" aria-label={t('sectionTradition')} data-sheet="rhythm">
      <div class="head">{@html icon.leaf}<h3>{v.tradition.title}</h3></div>
      <p>{v.tradition.meaning}</p>
    </section>
  {/if}
</main>
