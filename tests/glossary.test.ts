import { describe, expect, it } from 'vitest'
import { glossaryTerms, suggestGlossary, type GlossaryTerm } from '../src/ui/glossary'

const all = glossaryTerms()
const synth: GlossaryTerm[] = [
  { key: 'tithi', name: 'Žvaigždė', sanskrit: '', values: [['1', { title: 'Mėnulio žvaigždė', name: 'Rohini' }], ['2', { title: 'Žvaigždynas', name: 'Ardra' }]] },
]

describe('suggestGlossary', () => {
  it('an empty query gives nothing', () => {
    expect(suggestGlossary('', all)).toEqual([])
    expect(suggestGlossary('   ', all)).toEqual([])
  })

  it('"rohini" suggests the Rohini value of nakshatra first', () => {
    const [first] = suggestGlossary('rohini', all)
    expect(first.id.startsWith('g-nakshatra-')).toBe(true)
    expect(first.sanskrit).toBe('Rohini')
    expect(first.parent).toBe(all.find((g) => g.key === 'nakshatra')!.name)
  })

  it('a name starting with the query beats a later-word match', () => {
    // "zvaig" starts "Žvaigždė" and "Žvaigždynas"; only "Mėnulio žvaigždė" has it as a later word.
    expect(suggestGlossary('zvaig', synth).map((s) => s.id)).toEqual(['g-tithi', 'g-tithi-2', 'g-tithi-1'])
  })

  it('ignores case and accents', () => {
    expect(suggestGlossary('ZVAIGZDE', synth).map((s) => s.title)).toContain('Žvaigždė')
    expect(suggestGlossary('menulio', synth)).toHaveLength(1)
  })

  it('respects the limit and has no duplicates', () => {
    const s = suggestGlossary('a', all)
    expect(s).toHaveLength(8)
    expect(new Set(s.map((x) => x.id)).size).toBe(8)
    expect(suggestGlossary('a', all, 3)).toHaveLength(3)
  })

  it('no match gives nothing', () => {
    expect(suggestGlossary('qqqzzz', all)).toEqual([])
  })
})
