<script lang="ts">
  // "A new version is ready. [Update]" — sits above the tab bar until tapped.
  import { t } from './format'
  import { applyUpdate, update } from './update.svelte'
</script>

{#if update.ready}
  <div class="update-bar" role="status">
    <span>{t('updateReady')}</span>
    <button onclick={applyUpdate}>{t('updateNow')}</button>
  </div>
{/if}
