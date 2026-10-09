<script lang="ts">
  // About (SPEC 5.4) in two parts (user, 2026-10-06): "Using the app" — what VedaCal is, how
  // to install it, what each tab does, offline/updates/removal, credits; "Glossary" — every
  // term with its explanation and, where it has them, all its values, then how times are
  // calculated.
  import { content, sheet, t, tradition } from './format'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { termGroups, terms, type Term } from './terms'

  let part = $state<'use' | 'glossary'>('use')

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

  const steps = ['guideUseDay', 'guideUseTap', 'guideUseMonth', 'guideUseSky', 'guideUseSettings'] as const

  type Value = { title: string; name: string; meaning?: string }
  // Every value a term can take, in calendar order; terms without a list (the day's windows,
  // the special days) return none.
  const lists: Partial<Record<Term, Record<string, Value>>> = {
    tithi: content.tithi,
    vara: content.vara,
    masa: content.masa,
    nakshatra: content.nakshatra,
    rashi: content.rashi,
    yoga: content.yoga,
    karana: content.karana,
    choghadiya: content.choghadiya,
    rhythm: content.rhythm,
  }
  const values = (key: Term): Value[] => Object.values(lists[key] ?? {})
</script>

<main class="screen">
  <h1 class="page-title">{t('about')}</h1>

  <div class="segmented about-parts" role="group" aria-label={t('about')}>
    <button aria-pressed={part === 'use'} onclick={() => (part = 'use')}>{t('guideUse')}</button>
    <button aria-pressed={part === 'glossary'} onclick={() => (part = 'glossary')}>{t('guideGlossary')}</button>
  </div>

  {#if part === 'use'}
    <section class="card about-intro">
      <p>{sheet('about')}</p>
    </section>

    <h2 class="about-head">{t('guideInstallHead')}</h2>
    <section class="card about-intro">
      <p>{t('guideInstallIntro')}</p>
      <p>{t('guideInstallAndroid')}</p>
      <p class="quiet">{t('guideInstallChrome')}</p>
      <p>{t('guideInstallIphone')}</p>
    </section>

    <h2 class="about-head">{t('guideUseHead')}</h2>
    <section class="card about-intro">
      {#each steps as key (key)}<p>{t(key)}</p>{/each}
    </section>

    <h2 class="about-head">{t('guideOfflineHead')}</h2>
    <section class="card about-intro">
      <p>{t('guideOfflineText')}</p>
    </section>

    <h2 class="about-head">{t('credits')}</h2>
    <section class="card about-intro">
      {#each credits as [name, url, key] (name)}
        <p><a href={url} target="_blank" rel="noopener">{name}</a> – {t(key)}</p>
      {/each}
      <p class="quiet num">{t('version')} {__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_TIME__}</p>
    </section>
  {:else}
    <p class="about-lead">{t('guideGlossaryIntro')}</p>
    {#each termGroups as [title, keys] (title)}
      <h3 class="about-sub">{title}</h3>
      <ul class="card terms">
        {#each keys.map((k) => [k, terms[k]] as const) as [key, [name, sanskrit]] (key)}
          <li>
            <details>
              <summary><b>{name}</b>{#if sanskrit}<span class="sk">{sanskrit}</span>{/if}{@html icon.down}</summary>
              <!-- What tradition does in this window, then how it is found (the day sheet leads with today). -->
              {#if tradition(key)}<p>{tradition(key)}</p>{/if}
              <p>{sheet(key)}</p>
              {#if values(key).length}
                <dl class="kinds">
                  {#each values(key) as v, i (i)}
                    <dt><b>{v.title}</b><span class="sk">{v.name}</span></dt>
                    {#if v.meaning}<dd>{v.meaning}</dd>{/if}
                  {/each}
                </dl>
              {/if}
            </details>
          </li>
        {/each}
      </ul>
    {/each}

    <section class="card about-intro">
      <p>{sheet('times', { city: app.location.name })}</p>
    </section>
  {/if}
</main>
