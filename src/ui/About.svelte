<script lang="ts">
  // About (SPEC 5.4) in two parts (user, 2026-10-06): "Using the app" — what VedaCal is, how
  // to install it, what each tab does, offline/updates/removal, credits; "Glossary" — every
  // term with its explanation and, where it has them, all its values, then how times are
  // calculated.
  import { tick } from 'svelte'
  import { sheet, t, tradition, traditionSource } from './format'
  import { glossaryTerms, suggestGlossary, type Suggestion } from './glossary'
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
  const suggestions = $derived(suggestGlossary(query, all))
  const timesText = $derived(sheet('times', { city: app.location.name }))

  // Picking a suggestion (user, 2026-10-21): close the list, open the term, scroll to the row
  // and flash it for 2 s.
  async function pick(s: Suggestion) {
    query = ''
    const [termId] = s.id.split(/(?<=^g-[A-Za-z]+)-/)
    const details = document.getElementById(termId) as HTMLDetailsElement | null
    if (details) details.open = true
    await tick()
    const el = s.id === termId ? details?.querySelector('summary') : document.getElementById(s.id)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.remove('flash')
    void (el as HTMLElement).offsetWidth
    el.classList.add('flash')
    setTimeout(() => el.classList.remove('flash'), 2000)
  }
  // Enter in the field takes the first suggestion.
  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (suggestions[0]) pick(suggestions[0])
  }
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
      <input type="search" placeholder={t('searchGlossary')} autocomplete="off" bind:value={query} onkeydown={onSearchKey} />
    </label>
    <!-- mousedown kept from blurring the field, as in the city search. -->
    {#if suggestions.length}
      <ul class="cities" role="listbox" aria-label={t('searchGlossary')}>
        {#each suggestions as s (s.id)}
          <li
            class="card city"
            role="option"
            tabindex="0"
            aria-selected="false"
            onmousedown={(e) => e.preventDefault()}
            onclick={() => pick(s)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick(s))}
          >
            {@html icon.search}
            <div><b>{s.title}</b><small>{[s.sanskrit, s.parent].filter(Boolean).join(' · ')}</small></div>
          </li>
        {/each}
      </ul>
    {:else if query.trim()}
      <p class="footnote">{t('glossaryNothing')}</p>
    {/if}

    {#each termGroups as [title, keys] (title)}
      <h3 class="about-sub">{title}</h3>
      <ul class="card terms">
        {#each keys as key (key)}
          {@const [name, sanskrit] = terms[key]}
          {@const values = all.find((g) => g.key === key)!.values}
          <li>
            <details id="g-{key}">
              <summary><b>{name}</b>{#if sanskrit}<span class="sk">{sanskrit}</span>{/if}{@html icon.down}</summary>
              <!-- What tradition does in this window, then how it is found (the day sheet leads with today). -->
              {#if tradition(key)}<p>{tradition(key)}</p>{/if}
              {#if traditionSource(key)}<p class="src">{t('source')}: {traditionSource(key)}</p>{/if}
              <p>{sheet(key)}</p>
              {#if values.length}
                <dl class="kinds">
                  {#each values as [slot, v] (slot)}
                    <dt id="g-{key}-{slot}"><b>{v.title}</b><span class="sk">{v.name}</span></dt>
                    {#if v.meaning}<dd>{v.meaning}</dd>{/if}
                    {#if v.source}<dd class="src">{t('source')}: {v.source}</dd>{/if}
                  {/each}
                </dl>
              {/if}
            </details>
          </li>
        {/each}
      </ul>
    {/each}

    <section class="card about-intro">
      <p>{timesText}</p>
    </section>
  {/if}
</main>
