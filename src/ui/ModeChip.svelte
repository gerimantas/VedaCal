<script lang="ts">
  // View-mode switch for the top app bar (user, 2026-10-23): both modes as plain text buttons,
  // the active one underlined in the accent colour. Accessibility: a labelled group of two
  // toggle buttons with aria-pressed (a radiogroup would need arrow-key handling).
  // Without birth data "Personal" is a link to Settings at "My data".
  import { t } from './format'
  import { app, setSetting } from './state.svelte'

  const personal = $derived(!!app.birth && app.settings.mine)
</script>

<div class="modeswitch" role="group" aria-label={t('modeLabel')}>
  <button type="button" class="modebtn" class:on={!personal} aria-pressed={!personal} onclick={() => setSetting('mine', false)}>{t('modeGeneral')}</button>
  {#if app.birth}
    <button type="button" class="modebtn" class:on={personal} aria-pressed={personal} onclick={() => setSetting('mine', true)}>★ {t('modePersonal')}</button>
  {:else}
    <a class="modebtn" href="#/settings/mydata" aria-label={t('modeGeneralAria')}>★ {t('modePersonal')}</a>
  {/if}
</div>
