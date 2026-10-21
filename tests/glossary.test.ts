import { describe, expect, it } from 'vitest'
import { glossaryTerms, searchGlossary } from '../src/ui/glossary'

const all = glossaryTerms()
const hit = (q: string) => searchGlossary(q, all)

describe('glossary search', () => {
  it('an empty query shows every term with every value', () => {
    for (const q of ['', '   ']) {
      const h = hit(q)
      expect(h.map((x) => x.key)).toEqual(all.map((g) => g.key))
      h.forEach((x, i) => expect(x.shown).toHaveLength(all[i].values.length))
    }
  })

  it('a value name finds only its term and only that value', () => {
    const h = hit('rohini')
    // Amrit Siddhi's own text names Rohini, so it matches too; only the nakshatra list is narrowed.
    expect(h.map((x) => x.key)).toEqual(['nakshatra', 'amritSiddhi'])
    expect(h[0].shown).toHaveLength(1)
    expect(all.find((g) => g.key === 'nakshatra')!.values[h[0].shown[0]].name).toBe('Rohini')
  })

  it('ignores case and accents', () => {
    const word = [{ key: 'tithi' as const, name: 'Žvaigždė', sanskrit: '', texts: [''], values: [{ title: 'Šviesa', name: 'x' }] }]
    expect(searchGlossary('ZVAIGZDE', word)).toEqual([{ key: 'tithi', shown: [0] }])
    expect(searchGlossary('sviesa', [{ ...word[0], name: 'a' }])).toEqual([{ key: 'tithi', shown: [0] }])
  })

  it('a term name shows all its values', () => {
    const n = hit('Nakshatra').find((x) => x.key === 'nakshatra')!
    expect(n.shown).toHaveLength(all.find((g) => g.key === 'nakshatra')!.values.length)
  })

  it('no match gives nothing', () => {
    expect(hit('qqqzzz')).toEqual([])
  })
})
