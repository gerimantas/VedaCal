<script lang="ts">
  // About (SPEC 5.4), the approved P3 mockup (mockups/about.ts): what VedaCal is, a
  // plain-English key to every term on the day screen, how times are calculated, credits.
  import { content, sheet, t } from './format'
  import { icon } from './icons'
  import { app } from './state.svelte'
  import { terms, type Term } from './terms'

  const list = Object.entries(terms) as [Term, (typeof terms)[Term]][]
</script>

<main class="screen">
  <h1 class="page-title">{t('about')}</h1>

  <section class="card about-intro">
    <p>{sheet('about')}</p>
  </section>

  <h2 class="about-head">{t('howToRead')}</h2>
  <ul class="card terms">
    {#each list as [key, [name, sanskrit]] (key)}
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

  <section class="card about-intro">
    <p>{sheet('times', { city: app.location.name })}</p>
  </section>

  <h2 class="about-head">{t('credits')}</h2>
  <section class="card about-intro">
    <p>{t('creditMoon')}</p>
    <p>{t('creditCities')}</p>
    <p class="quiet num">{t('version')} {__APP_VERSION__} · {__GIT_COMMIT__} · {__BUILD_TIME__}</p>
  </section>
</main>
