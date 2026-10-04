<script lang="ts">
  // Settings tab (SPEC 5.3, 6): the location picker — the approved P3 mockup
  // (mockups/location.ts) with the real GeoNames search, offline, every city above 15,000
  // people — then zodiac signs (Vedic by default), time format and theme.
  import { loadCities, nearest, search, type CityIndex, type Place } from './cities'
  import { LANG, countryName, deviceHour12, t, time } from './format'
  import { icon } from './icons'
  import { app, setLocation, setSetting } from './state.svelte'

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  let index = $state<CityIndex | null>(null)
  let query = $state('')
  let status = $state<'' | 'locating' | 'error'>('')
  // The city list (~750 KB) is fetched only once a search starts, not when Settings opens.
  $effect(() => {
    if (query.trim() && !index) loadCities().then((i) => (index = i))
  })

  const same = (a: Place, b: Place) => a.name === b.name && a.lat === b.lat && a.lon === b.lon
  // Before anything is typed: only the current location (user, 2026-10-05).
  const places = $derived(query.trim() ? (index ? search(index, query) : []) : [app.location])

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

  const hour12 = $derived(app.settings.hour12 ?? deviceHour12())
  const onKey = (e: KeyboardEvent, p: Place) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(p))
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/day" aria-label={t('back')}>{@html icon.left}<span>{t('back')}</span></a>
  </header>
  <h1 class="page-title">{t('settings')}</h1>
  <h2 class="about-head">{t('location')}</h2>

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
        <div><b>{p.name}</b><small>{p.region && p.region !== p.name ? `${p.region}, ` : ''}{countryName(p.cc, p.country)}</small></div>
        <span class="quiet num">{(void app.settings.hour12, time(new Date(), p))}</span>
      </li>
    {/each}
  </ul>
  {#if query.trim() && !index}
    <p class="footnote">{t('loadingCities')}</p>
  {:else if query.trim() && !places.length}
    <p class="footnote">{t('noCities')}</p>
  {/if}

  <h2 class="about-head">{t('language')}</h2>
  <section class="card about-intro">
    <div class="segmented" role="group" aria-label={t('language')}>
      {#each [['en', t('langEn')], ['lt', t('langLt')]] as const as [value, label] (value)}
        <button aria-pressed={LANG === value} lang={value} onclick={() => setSetting('lang', value)}>{label}</button>
      {/each}
    </div>
  </section>

  <h2 class="about-head">{t('zodiac')}</h2>
  <section class="card about-intro">
    <div class="segmented" role="group" aria-label={t('zodiac')}>
      {#each [['vedic', t('zodiacVedic')], ['western', t('zodiacWestern')]] as const as [value, label] (value)}
        <button aria-pressed={app.settings.zodiac === value} onclick={() => setSetting('zodiac', value)}>{label}</button>
      {/each}
    </div>
    <p class="quiet">{t('zodiacNote')}</p>
  </section>

  <h2 class="about-head">{t('timeFormat')}</h2>
  <section class="card about-intro">
    <div class="segmented" role="group" aria-label={t('timeFormat')}>
      {#each [[true, t('hours12')], [false, t('hours24')]] as const as [value, label] (label)}
        <button aria-pressed={hour12 === value} onclick={() => setSetting('hour12', value)}>{label}</button>
      {/each}
    </div>
  </section>

  <h2 class="about-head">{t('theme')}</h2>
  <section class="card about-intro">
    <div class="segmented" role="group" aria-label={t('theme')}>
      {#each [['system', t('themeSystem')], ['dark', t('themeDark')], ['light', t('themeLight')]] as const as [value, label] (value)}
        <button aria-pressed={app.settings.theme === value} onclick={() => setSetting('theme', value)}>{label}</button>
      {/each}
    </div>
  </section>
</main>
