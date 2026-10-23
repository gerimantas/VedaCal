<script lang="ts">
  // The ☰ menu at the right end of every top bar (user, 2026-10-23): Settings and About live
  // here, so the bottom bar keeps four tabs. Closes on an item tap, Escape, a tap outside and
  // any route change; Escape returns focus to the button.
  import { t } from './format'
  import { icon } from './icons'
  import { routeFromHash } from './state.svelte'

  const items = [
    ['settings', 'settings'],
    ['about', 'about'],
  ] as const

  let open = $state(false)
  let root: HTMLDivElement
  let button: HTMLButtonElement
  let route = $state(routeFromHash(location.hash))

  $effect(() => {
    const onHash = () => {
      route = routeFromHash(location.hash)
      open = false
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  $effect(() => {
    if (!open) return
    root.querySelector<HTMLAnchorElement>('a')?.focus()
    const onPointer = (e: PointerEvent) => {
      if (!root.contains(e.target as Node)) open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      open = false
      button.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  })
</script>

<div class="menu" bind:this={root}>
  <button bind:this={button} class="icon-btn menu-btn" aria-label={t('menu')} aria-expanded={open} aria-controls="app-menu" onclick={() => (open = !open)}>
    {@html icon.menu}
  </button>
  {#if open}
    <nav id="app-menu" class="menu-panel" aria-label={t('menu')}>
      {#each items as [id, key] (id)}
        <a href="#/{id}" aria-current={route === id ? 'page' : undefined} onclick={() => (open = false)}>{@html icon[id]}<span>{t(key)}</span></a>
      {/each}
    </nav>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    flex-shrink: 0;
  }

  .menu-btn[aria-expanded='true'] {
    color: var(--color-accent);
  }

  .menu-panel {
    position: absolute;
    top: calc(100% + var(--space-3xs));
    right: 0;
    display: grid;
    min-width: 11rem;
    padding: var(--space-3xs);
    border: var(--rule-hair) solid var(--color-card-line);
    border-radius: var(--radius-md);
    background: var(--color-card);
    box-shadow: 0 6px 18px color-mix(in oklch, black 35%, transparent);
  }

  .menu-panel a {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    min-height: 2.75rem;
    padding: 0 var(--space-xs);
    border-radius: var(--radius-sm);
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: 550;
    text-decoration: none;
    white-space: nowrap;
  }

  .menu-panel a :global(svg) {
    color: var(--color-muted);
  }

  .menu-panel a:hover {
    background: var(--color-paper-3);
  }

  .menu-panel a[aria-current='page'] {
    color: var(--color-accent);
    background: var(--color-paper-2);
  }

  .menu-panel a[aria-current='page'] :global(svg) {
    color: var(--color-accent);
  }
</style>
