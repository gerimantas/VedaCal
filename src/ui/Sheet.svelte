<script lang="ts">
  // Tap anything marked data-sheet="<term>" and its explanation opens as a bottom sheet —
  // the same text as the About page (one list in en.json).
  import { sheet, t } from './format'
  import { terms, type Term } from './terms'

  let dialog: HTMLDialogElement
  let term = $state<Term>('tithi')
  const [name, sanskrit] = $derived(terms[term])

  $effect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (e.target === dialog) return dialog.close()
      const el = target.closest<HTMLElement>('[data-sheet]')
      if (!el || dialog.contains(el)) return
      term = el.dataset.sheet as Term
      dialog.showModal()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  })
</script>

<dialog class="sheet" bind:this={dialog}>
  <div class="sheet-body">
    <h3>{name}{#if sanskrit}{' '}<span class="sk">{sanskrit}</span>{/if}</h3>
    <p>{sheet(term)}</p>
    <button class="sheet-close" onclick={() => dialog.close()}>{t('close')}</button>
  </div>
</dialog>
