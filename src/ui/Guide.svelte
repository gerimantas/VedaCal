<script lang="ts">
  // How to use (user, 2026-10-24): the five steps, how to install, offline use. Split out of
  // the old two-part About screen; the Glossary and About have their own screens in the ☰ menu.
  import { labelHtml, t } from './format'
  import { icon } from './icons'
  import Menu from './Menu.svelte'
  import VersionTag from './VersionTag.svelte'

  const steps = ['guideUseDay', 'guideUseTap', 'guideUseMonth', 'guideUseSky', 'guideUseSettings'] as const
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/day" aria-label={t('back')}>{@html icon.left}<span>{t('back')}</span></a>
    <VersionTag />
    <Menu />
  </header>
  <h1 class="page-title">{t('guideUseHead')}</h1>

  <section class="card about-intro">
    {#each steps as key (key)}<p>{@html labelHtml(t(key))}</p>{/each}
  </section>

  <h2 class="about-head">{t('guideInstallHead')}</h2>
  <section class="card about-intro">
    <p>{@html labelHtml(t('guideInstallIntro'))}</p>
    <p>{@html labelHtml(t('guideInstallAndroid'))}</p>
    <p class="quiet">{@html labelHtml(t('guideInstallChrome'))}</p>
    <p>{@html labelHtml(t('guideInstallIphone'))}</p>
  </section>

  <h2 class="about-head">{t('guideOfflineHead')}</h2>
  <section class="card about-intro">
    <p>{@html labelHtml(t('guideOfflineText'))}</p>
  </section>
</main>
