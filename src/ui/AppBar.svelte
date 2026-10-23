<script lang="ts">
  // The top bar shared by Day, Week, Month and Sky (user, 2026-10-23). First row: the ▾/▴
  // toggle, the screen's date part (the snippet), the ☰ menu. Second row, closed by default
  // and remembered in settings: the place and the view-mode chip. A ★ on the toggle shows
  // the personal view while the row is closed.
  import type { Snippet } from 'svelte'
  import Menu from './Menu.svelte'
  import ModeChip from './ModeChip.svelte'
  import VersionTag from './VersionTag.svelte'
  import { t } from './format'
  import { icon } from './icons'
  import { app, setSetting } from './state.svelte'

  let { children }: { children: Snippet } = $props()

  const open = $derived(app.settings.barOpen)
  const personal = $derived(!!app.birth && app.settings.mine)
</script>

<header class="appbar">
  <div class="appbar-row">
    <button class="icon-btn bar-toggle" aria-label={t(open ? 'barHide' : 'barShow')} aria-expanded={open} aria-controls="appbar-more" onclick={() => setSetting('barOpen', !open)}>
      {@html open ? icon.up : icon.down}
      {#if personal && !open}<b class="bar-star" aria-hidden="true">★</b>{/if}
    </button>
    {@render children()}
    <VersionTag />
    <Menu />
  </div>
  {#if open}
    <div id="appbar-more" class="appbar-more">
      <a class="chip" href="#/settings">{@html icon.navigate}<span>{app.location.name}, {app.location.cc}</span></a>
      <ModeChip />
    </div>
  {/if}
</header>
