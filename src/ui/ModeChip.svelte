<script lang="ts">
  // View-mode chip for the top app bar (user, 2026-10-21): shows general or personal view.
  // Without birth data a tap opens Settings at "My data"; with it, a tap switches the view.
  import { t } from './format'
  import { app, setSetting } from './state.svelte'

  const personal = $derived(!!app.birth && app.settings.mine)
</script>

{#if app.birth}
  <button class="chip modechip" class:on={personal} aria-pressed={personal} aria-label={t(personal ? 'modePersonalAria' : 'modeGeneralToggleAria')} onclick={() => setSetting('mine', !personal)}>
    {personal ? `★ ${t('modePersonal')}` : t('modeGeneral')}
  </button>
{:else}
  <a class="chip modechip" href="#/settings/mydata" aria-label={t('modeGeneralAria')}>{t('modeGeneral')}</a>
{/if}
