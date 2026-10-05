<script lang="ts">
  // App shell: five tabs (SPEC 5.4, Sky 5.5) routed by the URL hash, plus the explanation sheet.
  import About from './ui/About.svelte'
  import Day from './ui/Day.svelte'
  import LocationPicker from './ui/LocationPicker.svelte'
  import Month from './ui/Month.svelte'
  import Sheet from './ui/Sheet.svelte'
  import Sky from './ui/Sky.svelte'
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
    ['sky', t('sky')],
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
{:else if route === 'sky'}
  <Sky />
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
