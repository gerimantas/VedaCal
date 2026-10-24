<script lang="ts">
  // Glossary (user, 2026-10-24): every term with its explanation and, where it has them, all its
  // values, then how times are calculated. Split out of the old two-part About screen (2026-10-06).
  import { tick } from 'svelte'
  import { sheet, t, tradition, traditionSource } from './format'
  import { glossaryTerms, suggestGlossary, type Suggestion } from './glossary'
  import { icon } from './icons'
  import Menu from './Menu.svelte'
  import VersionTag from './VersionTag.svelte'
  import { app } from './state.svelte'
  import { termGroups, terms } from './terms'

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
  <header class="appbar">
    <a class="chip" href="#/day" aria-label={t('back')}>{@html icon.left}<span>{t('back')}</span></a>
    <VersionTag />
    <Menu />
  </header>
  <h1 class="page-title">{t('guideGlossary')}</h1>

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
</main>
