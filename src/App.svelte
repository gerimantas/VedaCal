<script lang="ts">
  // App shell: four tabs (SPEC 5.4) routed by the URL hash, plus the explanation sheet.
  import About from './ui/About.svelte'
  import Day from './ui/Day.svelte'
  import LocationPicker from './ui/LocationPicker.svelte'
  import Month from './ui/Month.svelte'
  import Sheet from './ui/Sheet.svelte'
  import UpdateBar from './ui/UpdateBar.svelte'
  import { t } from './ui/format'
  import { icon } from './ui/icons'
  import { needsLocation, routeFromHash, type Route } from './ui/state.svelte'

  if (needsLocation && !location.hash) location.hash = '#/settings'
  let route = $state(routeFromHash(location.hash))

  $effect(() => {
    const onHash = () => {
      route = routeFromHash(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  const tabs: [Route, string][] = [
    ['day', t('day')],
    ['month', t('month')],
    ['settings', t('settings')],
    ['about', t('about')],
  ]
</script>

{#if route === 'day'}
  <Day />
{:else if route === 'settings'}
  <LocationPicker />
{:else if route === 'about'}
  <About />
{:else}
  <Month />
{/if}

<nav class="tabs" aria-label="Main">
  {#each tabs as [id, label] (id)}
    <a href="#/{id}" aria-current={id === route ? 'page' : undefined}>{@html icon[id]}<span>{label}</span></a>
  {/each}
</nav>

<UpdateBar />

<Sheet />
