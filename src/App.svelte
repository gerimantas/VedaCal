<script lang="ts">
  // P0 placeholder: proves the calculation library runs in the browser bundle.
  import { Observer } from 'astronomy-engine'
  import { getPanchangam } from '@ishubhamx/panchangam-js/dist/core/panchangam'

  const vilnius = new Observer(54.68889, 25.27972, 98)
  const now = new Date()
  const offset = -now.getTimezoneOffset()
  const p = getPanchangam(now, vilnius, { timezoneOffset: offset })
  const time = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
</script>

<main>
  <h1>VedaCal</h1>
  <p class="tag">The traditional lunar calendar, in plain words. Coming soon.</p>
  <p class="probe">
    Vilnius today · {p.paksha} {p.tithis[0]?.name} · sunrise {time(p.sunrise)} · sunset {time(p.sunset)}
  </p>
</main>

<style>
  main {
    max-width: 32rem;
    margin: 0 auto;
    padding: 4rem 1.5rem;
    text-align: center;
  }
  h1 {
    color: var(--gold);
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .tag {
    color: var(--text);
  }
  .probe {
    color: var(--muted);
    font-size: 0.85rem;
  }
</style>
