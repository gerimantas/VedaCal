import { describe, expect, it } from 'vitest'
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
})
