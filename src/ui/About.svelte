<script lang="ts">
  // About (SPEC 5.4), the approved P3 mockup (mockups/about.ts): what VedaCal is, a
  // plain-English key to every term on the day screen, how times are calculated, credits.
  import { content, sheet, t } from './format'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { termGroups, terms } from './terms'

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
  <h1 class="page-title">{t('about')}</h1>

  <section class="card about-intro">
    <p>{sheet('about')}</p>
  </section>

  <h2 class="about-head">{t('howToRead')}</h2>
  {#each termGroups as [title, keys] (title)}
    <h3 class="about-sub">{title}</h3>
    <ul class="card terms">
      {#each keys.map((k) => [k, terms[k]] as const) as [key, [name, sanskrit]] (key)}
        <li>
          <details>
            <summary><b>{name}</b>{#if sanskrit}<span class="sk">{sanskrit}</span>{/if}{@html icon.down}</summary>
            <p>{sheet(key)}</p>
            {#if key === 'choghadiya'}
              <dl class="kinds">
                {#each Object.values(content.choghadiya) as kind (kind.name)}
                  <dt><b>{kind.title}</b><span class="sk">{kind.name}</span></dt>
                  <dd>{kind.meaning}</dd>
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

  <h2 class="about-head">{t('credits')}</h2>
  <section class="card about-intro">
    {#each credits as [name, url, key] (name)}
      <p><a href={url} target="_blank" rel="noopener">{name}</a> – {t(key)}</p>
    {/each}
    <p class="quiet num">{t('version')} {__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_TIME__}</p>
  </section>
</main>
