<script lang="ts">
  // The top bar shared by Day, Week, Month and Sky (user, 2026-10-23). First row: the ▾/▴
  // toggle, the screen's date part (the snippet), the ☰ menu. Second row, closed by default
  // and closing by itself on scroll or route change: the place and the view-mode switch.
  // An optional `now` prop adds the "↺ Now" chip on the bar's bottom edge (same on every screen). A ★ on the toggle shows
  // the personal view while the row is closed.
  import type { Snippet } from 'svelte'
  import Menu from './Menu.svelte'
  import ModeChip from './ModeChip.svelte'
  import VersionTag from './VersionTag.svelte'
  import { t } from './format'
  import { icon } from './icons'
  import { app, ui } from './state.svelte'

  let { children, now }: { children: Snippet; now?: { show: boolean; reset: () => void } } = $props()

  const open = $derived(ui.barOpen)
  // Closes on a scroll of more than a few px from where it was opened, and on a route change.
  $effect(() => {
    if (!open) return
    const from = window.scrollY
    const close = () => (ui.barOpen = false)
    const onScroll = () => Math.abs(window.scrollY - from) > 8 && close()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', close)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', close)
    }
  })
  const personal = $derived(!!app.birth && app.settings.mine)
</script>

<header class="appbar">
  <div class="appbar-row">
    <button class="icon-btn bar-toggle" aria-label={t(open ? 'barHide' : 'barShow')} aria-expanded={open} aria-controls="appbar-more" onclick={() => (ui.barOpen = !open)}>
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
  {#if now?.show}
    <button class="chip nowchip" class:below={open} onclick={now.reset}>↺ {t('clockNow')}</button>
  {/if}
</header>
