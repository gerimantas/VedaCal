<script lang="ts">
  // About (SPEC 5.4) in two parts (user, 2026-10-06): "Using the app" — what VedaCal is, how
  // to install it, what each tab does, offline/updates/removal, credits; "Glossary" — every
  // term with its explanation and, where it has them, all its values, then how times are
  // calculated.
  import { sheet, t, tradition, traditionSource } from './format'
  import { glossaryTerms, searchGlossary, timesMatches } from './glossary'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { termGroups, terms } from './terms'

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

  let query = $state('')
  const all = glossaryTerms()
  const info = new Map(all.map((g) => [g.key, g]))
  const byKey = $derived(new Map(searchGlossary(query, all).map((h) => [h.key, h.shown])))
  const searching = $derived(query.trim() !== '')
  const timesText = $derived(sheet('times', { city: app.location.name }))
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
    <label class="card search">
      {@html icon.search}
      <input type="search" placeholder={t('searchGlossary')} autocomplete="off" bind:value={query} />
    </label>
    {#if searching && !byKey.size}<p class="footnote">{t('glossaryNothing')}</p>{/if}
    <!-- Keyed on the query: open is set from the match when the query changes; a tap on a term
         still opens or closes it after that (user, 2026-10-21). -->
    {#key query.trim()}
      {#each termGroups as [title, keys] (title)}
        {#if keys.some((k) => byKey.has(k))}
          <h3 class="about-sub">{title}</h3>
          <ul class="card terms">
            {#each keys.filter((k) => byKey.has(k)) as key (key)}
              {@const [name, sanskrit] = terms[key]}
              {@const shown = byKey.get(key) ?? []}
              <li>
                <details open={searching}>
                  <summary><b>{name}</b>{#if sanskrit}<span class="sk">{sanskrit}</span>{/if}{@html icon.down}</summary>
                  <!-- What tradition does in this window, then how it is found (the day sheet leads with today). -->
                  {#if tradition(key)}<p>{tradition(key)}</p>{/if}
                  {#if traditionSource(key)}<p class="src">{t('source')}: {traditionSource(key)}</p>{/if}
                  <p>{sheet(key)}</p>
                  {#if shown.length}
                    <dl class="kinds">
                      {#each shown as i (i)}
                        {@const v = info.get(key)!.values[i]}
                        <dt><b>{v.title}</b><span class="sk">{v.name}</span></dt>
                        {#if v.meaning}<dd>{v.meaning}</dd>{/if}
                        {#if v.source}<dd class="src">{t('source')}: {v.source}</dd>{/if}
                      {/each}
                    </dl>
                  {/if}
                </details>
              </li>
            {/each}
          </ul>
        {/if}
      {/each}
    {/key}

    {#if timesMatches(query, timesText)}
      <section class="card about-intro">
        <p>{timesText}</p>
      </section>
    {/if}
  {/if}
</main>
