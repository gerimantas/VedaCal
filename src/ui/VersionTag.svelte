<script lang="ts">
  // Dev server only: the commit the code is at, on the top bar's line, so a change can be
  // checked against the commit it came in (user, 2026-10-14). The About screen keeps the full line.
  // The server's start time, local: "2026-10-14 08:35 UTC" → "11:35".
  const started = new Date(__BUILD_TIME__.replace(' ', 'T').replace(' UTC', 'Z'))
  const time = started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
</script>

{#if import.meta.env.DEV}
  <span class="version-tag num" title="{__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_TIME__}">{__GIT_COMMIT__} · {time}</span>
{/if}

<style>
  .version-tag {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 50%);
    padding: 0 var(--space-3xs);
    border: 1px solid color-mix(in oklch, var(--color-accent) 75%, transparent);
    border-radius: var(--radius-pill);
    background: var(--color-paper);
    color: var(--color-muted);
    font-size: 0.6875rem;
    line-height: 1.4;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
