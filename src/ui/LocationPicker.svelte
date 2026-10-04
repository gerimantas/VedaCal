<script lang="ts">
  // Settings tab: the location picker (SPEC 6) — the approved P3 mockup (mockups/location.ts)
  // with the real GeoNames search, offline, every city above 15,000 people — and the zodiac
  // choice (Vedic by default). P5 adds time format and theme here.
  import { inZone, loadCities, nearest, search, type CityIndex, type Place } from './cities'
  import { t } from './format'
  import { icon } from './icons'
  import { app, setLocation, setSetting } from './state.svelte'

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  let index = $state<CityIndex | null>(null)
  let query = $state('')
  let status = $state<'' | 'locating' | 'error'>('')
  loadCities().then((i) => (index = i))

  const same = (a: Place, b: Place) => a.name === b.name && a.lat === b.lat && a.lon === b.lon
  // Before anything is typed: the current location, then the largest cities in the device's time zone.
  const places = $derived.by(() => {
    if (query.trim()) return index ? search(index, query) : []
    const local = index ? inZone(index, deviceTz).filter((p) => !same(p, app.location)) : []
    return [app.location, ...local]
  })

  function choose(p: Place) {
    setLocation(p)
    location.hash = '#/day'
  }

  function useMyLocation() {
    if (!navigator.geolocation) return (status = 'error')
    status = 'locating'
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        // Name and elevation come from the nearest listed city; the zone is the device's (SPEC 6).
        const near = nearest(await loadCities(), coords.latitude, coords.longitude)
        const round = (x: number) => Math.round(x * 1e4) / 1e4
        status = ''
        choose({ ...near, lat: round(coords.latitude), lon: round(coords.longitude), tz: deviceTz })
      },
      () => (status = 'error'),
      { timeout: 15_000, maximumAge: 600_000 },
    )
  }

  const localTime = (tz: string) => new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: tz }).format(new Date())
  const onKey = (e: KeyboardEvent, p: Place) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(p))
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/day" aria-label={t('back')}>{@html icon.left}<span>{t('back')}</span></a>
  </header>
  <h1 class="page-title">{t('location')}</h1>

  <label class="card search">
    {@html icon.search}
    <input type="search" placeholder={t('searchCity')} autocomplete="off" bind:value={query} />
  </label>
  <button class="gps" onclick={useMyLocation} disabled={status === 'locating'}>
    {@html icon.locate}<span>{status === 'locating' ? t('locating') : t('useMyLocation')}</span>
  </button>
  {#if status === 'error'}<p class="footnote" role="alert">{t('locationError')}</p>{/if}

  <ul class="cities" role="listbox" aria-label={t('location')}>
    {#each places as p (`${p.name}${p.lat}${p.lon}`)}
      <li
        class="card city"
        role="option"
        tabindex="0"
        aria-selected={same(p, app.location)}
        onclick={() => choose(p)}
        onkeydown={(e) => onKey(e, p)}
      >
        {@html icon.pin}
        <div><b>{p.name}</b><small>{p.region && p.region !== p.name ? `${p.region}, ` : ''}{p.country}</small></div>
        <span class="quiet num">{localTime(p.tz)}</span>
      </li>
    {/each}
  </ul>
  {#if query.trim() && !index}
    <p class="footnote">{t('loadingCities')}</p>
  {:else if query.trim() && !places.length}
    <p class="footnote">{t('noCities')}</p>
  {/if}

  <h2 class="about-head">{t('zodiac')}</h2>
  <section class="card about-intro">
    <div class="segmented" role="group" aria-label={t('zodiac')}>
      {#each [['vedic', t('zodiacVedic')], ['western', t('zodiacWestern')]] as const as [value, label] (value)}
        <button aria-pressed={app.settings.zodiac === value} onclick={() => setSetting('zodiac', value)}>{label}</button>
      {/each}
    </div>
    <p class="quiet">{t('zodiacNote')}</p>
  </section>
</main>
