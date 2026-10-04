<script lang="ts">
  // Placeholder until P4: shows that the calculation core runs in the browser.
  import { computeDay } from './core/panchang'
  import { civilDate } from './core/time'

  const vilnius = { name: 'Vilnius', country: 'LT', lat: 54.68916, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius' }
  const day = computeDay(civilDate(vilnius.tz, new Date()), vilnius)
  const TITHI = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima']
  const t = day.tithi[0]?.index ?? 0
  const tithi = t ? `${t > 15 ? 'Krishna' : 'Shukla'} ${t === 30 ? 'Amavasya' : TITHI[(t - 1) % 15]}` : '—'
  const time = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: vilnius.tz }) : '—'
</script>

<main>
  <h1>VedaCal</h1>
  <p class="tag">The traditional lunar calendar, in plain words. Coming soon.</p>
  <p class="probe">
    Vilnius today · {tithi} · sunrise {time(day.sunrise)} · sunset {time(day.sunset)}
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
