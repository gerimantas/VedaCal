<script lang="ts">
  // About (SPEC 5.4), short (user, 2026-10-24): what VedaCal is, then credits with the version
  // line. How to use and the Glossary have their own screens in the ☰ menu.
  import { sheet, t } from './format'
  import { icon } from './icons'
  import Menu from './Menu.svelte'
  import VersionTag from './VersionTag.svelte'

  // Main sources (user, 2026-10-05): what each one is used for, with its link.
  const credits: [string, string, Parameters<typeof t>[0]][] = [
    ['Drik Panchang', 'https://www.drikpanchang.com', 'creditDrik'],
    ['mypanchang.com', 'http://www.mypanchang.com', 'creditMypanchang'],
    ['Shubh Panchang', 'https://shubhpanchang.com/blog/rahu-kaal-yamagandam-and-gulika-kaal-explained', 'creditShubh'],
    ['The Calendars of India (arXiv)', 'https://arxiv.org/abs/1007.0062', 'creditArxiv'],
    ['Astronomy Engine', 'https://github.com/cosinekitty/astronomy', 'creditAstronomy'],
    ['panchangam-js', 'https://github.com/ishubhamx/Hindu-Panchangam-Legal', 'creditPanchangam'],
    ['NASA Scientific Visualization Studio', 'https://svs.gsfc.nasa.gov', 'creditMoon'],
    ['GeoNames', 'https://www.geonames.org', 'creditCities'],
  ]
</script>

<main class="screen">
  <header class="appbar">
    <a class="chip" href="#/day" aria-label={t('back')}>{@html icon.left}<span>{t('back')}</span></a>
    <VersionTag />
    <Menu />
  </header>
  <h1 class="page-title">{t('about')}</h1>

  <section class="card about-intro">
    <p>{sheet('about')}</p>
  </section>

  <h2 class="about-head">{t('credits')}</h2>
  <section class="card about-intro">
    {#each credits as [name, url, key] (name)}
      <p><a href={url} target="_blank" rel="noopener">{name}</a> – {t(key)}</p>
    {/each}
    <p class="quiet num">{t('version')} {__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_TIME__}</p>
  </section>
</main>
