import { describe, expect, it } from 'vitest'
import en from '../src/content/en.json'
import lt from '../src/content/lt.json'
import { labelHtml, markSanskrit } from '../src/ui/format'

const sk = (s: string) => `<span class="sk">${s}</span>`

describe('markSanskrit', () => {
  it('wraps whole-word matches only', () => {
    expect(markSanskrit('Ekadashi pasninko pabaiga', ['Ekadashi'])).toBe(`${sk('Ekadashi')} pasninko pabaiga`)
    expect(markSanskrit('Rogas ir Rog', ['Rog'])).toBe(`Rogas ir ${sk('Rog')}`)
    expect(markSanskrit('Šiva Shivax', ['Shiva'])).toBe('Šiva Shivax')
  })
  it('matches the longest name first', () => {
    expect(markSanskrit('Shukla Pratipada', ['Shukla', 'Shukla Pratipada'])).toBe(sk('Shukla Pratipada'))
  })
  it('escapes everything, marked or not', () => {
    expect(markSanskrit('A & <b> Bhadra "x"', ['Bhadra'])).toBe(`A &amp; &lt;b&gt; ${sk('Bhadra')} &quot;x&quot;`)
    expect(markSanskrit('a<b', [])).toBe('a&lt;b')
  })
  it('does not match inside Lithuanian words', () => {
    expect(markSanskrit('Ašvinų žvaigždė, Vaišnavas', ['Vara', 'Aš'])).toBe('Ašvinų žvaigždė, Vaišnavas')
  })
  it('marks a parenthesised name and treats names literally', () => {
    expect(markSanskrit('Bhadra (Vishti)', ['Bhadra', 'Vishti'])).toBe(`${sk('Bhadra')} (${sk('Vishti')})`)
    expect(markSanskrit('a.b axb', ['a.b'])).toBe(`${sk('a.b')} axb`)
  })
  it('labelHtml knows the content names', () => {
    expect(labelHtml('Ekadashi fast ends')).toContain(sk('Ekadashi'))
    expect(labelHtml('Bhadra (Vishti)')).toBe(`${sk('Bhadra')} (${sk('Vishti')})`)
  })

  it('keeps brand names whole and unmarked, but marks a bare Panchang', () => {
    expect(labelHtml('Drik Panchang and Shubh Panchang')).toBe('Drik Panchang and Shubh Panchang')
    expect(labelHtml('see mypanchang.com and panchangam-js')).toBe('see mypanchang.com and panchangam-js')
    expect(labelHtml("VedaCal's Rahu Kaal")).toBe(`VedaCal&#39;s ${sk('Rahu Kaal')}`)
    expect(labelHtml('kalendorių (Panchang)')).toBe(`kalendorių (${sk('Panchang')})`)
    expect(markSanskrit('Drik Panchang', ['Panchang'], ['Drik Panchang'])).toBe('Drik Panchang')
  })
  it('marks lowercase prose terms', () => {
    expect(labelHtml('A tithi is a lunar day; each yoga and karana')).toBe(`A ${sk('tithi')} is a lunar day; each ${sk('yoga')} and ${sk('karana')}`)
    expect(labelHtml('Muhurta Chintamani (1.34–35)')).toBe(`${sk('Muhurta Chintamani')} (1.34–35)`)
  })
  it('respects Lithuanian letters at word edges', () => {
    expect(labelHtml('jogos pratybos')).toBe('jogos pratybos')
    expect(labelHtml('30 tithių ir tithi')).toBe(`30 tithių ir ${sk('tithi')}`)
    expect(labelHtml('ištithi tithiš')).toBe('ištithi tithiš')
    expect(labelHtml('Ašvinų yogą')).toBe('Ašvinų yogą')
  })
  it('is memoised: the same string gives the same result', () => {
    expect(labelHtml('Tithi · Yoga')).toBe(labelHtml('Tithi · Yoga'))
  })
  it('never changes the text of any content string', () => {
    const unescape = (h: string) => h.replace(/<\/?span[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    const strings: string[] = []
    const walk = (o: unknown) => {
      if (typeof o === 'string') strings.push(o)
      else if (o && typeof o === 'object') Object.values(o).forEach(walk)
    }
    walk(en)
    walk(lt)
    expect(strings.length).toBeGreaterThan(500)
    for (const str of strings) expect(unescape(labelHtml(str))).toBe(str)
  })
})
