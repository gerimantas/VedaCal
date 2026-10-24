<script lang="ts">
  // Tap anything marked data-sheet="<term>" and its explanation opens as a bottom sheet —
  // the same text as the About page (one list in en.json).
  import { labelHtml, sheet, t } from './format'
  import { icon } from './icons'
  import { terms, type Term } from './terms'

  let dialog: HTMLDialogElement
  let term = $state<Term>('tithi')
  // A row can lead its sheet with what its own value means (the season now), before the term.
  let lead = $state<{ title: string; text: string } | null>(null)
  // A sheet with a lead holds only what is about the row tapped; the general text folds out
  // below it, in the same sheet — the day screen stays where it was (user, 2026-10-10: first
  // the Choghadiya rows, then every day sheet).
  const [name, sanskrit] = $derived(terms[term])
  // "More about Tradicinis ritmas" would break Lithuanian grammar: the rhythm has its own label.
  const more = $derived(term === 'rhythm' ? t('moreAboutRhythm') : t('moreAbout', { name: sanskrit || name }))

  $effect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (e.target === dialog) return dialog.close()
      const el = target.closest<HTMLElement>('[data-sheet]')
      if (!el || dialog.contains(el)) return
      term = el.dataset.sheet as Term
      lead = el.dataset.sheetLead ? { title: el.dataset.sheetLeadTitle ?? '', text: el.dataset.sheetLead } : null
      dialog.showModal()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  })
</script>

<dialog class="sheet" bind:this={dialog}>
  <!-- Focus lands on the text, not on "Close": the browser drew its focus ring on the button
       only sometimes, depending on how the sheet was opened (user, 2026-10-10). Tab still
       reaches the button, ring and all. -->
  <!-- svelte-ignore a11y_autofocus -->
  <div class="sheet-body" tabindex="-1" autofocus>
    <h3>{@html labelHtml(name)}{#if sanskrit}{' '}<span class="sk">{sanskrit}</span>{/if}</h3>
    <!-- {' '}: a bare space before {/if} is dropped, which glued "Kanya.The Moon". -->
    {#if lead}<p>{#if lead.title}<b>{@html labelHtml(lead.title)}.</b>{' '}{/if}{@html labelHtml(lead.text)}</p>{/if}
    {#if lead}
      <!-- Folded again on every opening: the dialog element is reused. -->
      {#key lead}
        <details class="more sheet-more">
          <summary>{@html labelHtml(more)}{@html icon.down}</summary>
          <p>{@html labelHtml(sheet(term))}</p>
        </details>
      {/key}
    {:else}
      <p>{@html labelHtml(sheet(term))}</p>
    {/if}
    <button class="sheet-close" onclick={() => dialog.close()}>{t('close')}</button>
  </div>
</dialog>
