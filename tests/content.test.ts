// Content rules (.planning/SPEC.md section 7): every element has an entry, titles are short,
// meanings are one or two sentences, and no text makes a health or body claim.
import { describe, expect, it } from 'vitest'
import en from '../src/content/en.json'

type Entry = { name: string; title: string; meaning: string }
const groups: Record<string, [Record<string, Entry>, string[]]> = {
  tithi: [en.tithi, Array.from({ length: 30 }, (_, i) => String(i + 1))],
  nakshatra: [en.nakshatra, Array.from({ length: 27 }, (_, i) => String(i + 1))],
  yoga: [en.yoga, Array.from({ length: 27 }, (_, i) => String(i + 1))],
  karana: [en.karana, Array.from({ length: 11 }, (_, i) => String(i + 1))],
  vara: [en.vara, Array.from({ length: 7 }, (_, i) => String(i))],
  rhythm: [en.rhythm, ['restFullMoon', 'restNewMoon', 'ekadashi', 'uttarayana', 'dakshinayana', 'ritu1', 'ritu2', 'ritu3', 'ritu4', 'ritu5', 'ritu6']],
}

// Words that would turn tradition into a health claim. "medical" is allowed only in the
// About sheet's disclaimer, which is checked separately.
const HEALTH = /\b(heal|healing|cure[sd]?|detox|cleans(e|ing)|immun\w*|hormon\w*|cells?|cellular|ions?|neur\w*|brain|disease|illness|medic\w*|treatment|symptoms?|blood|metabolis\w*|digest\w*|health\w*|bod(y|ies)|organs?|therap\w*|chakras?|vitality|toxins?|wellbeing|well-being)\b/i

const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length

describe.each(Object.entries(groups))('%s', (_, [entries, keys]) => {
  it('has exactly the expected entries', () => {
    expect(Object.keys(entries).sort()).toEqual([...keys].sort())
  })

  it.each(keys)('%s: short title, 1–2 sentence meaning, no health words', (k) => {
    const e = entries[k]
    expect(e.name.length).toBeGreaterThan(0)
    expect(e.title.split(/\s+/).length, e.title).toBeLessThanOrEqual(6)
    expect(sentences(e.meaning), e.meaning).toBeGreaterThanOrEqual(1)
    expect(sentences(e.meaning), e.meaning).toBeLessThanOrEqual(2)
    expect(`${e.title} ${e.meaning}`).not.toMatch(HEALTH)
  })
})

it('has 113 meaning entries in total', () => {
  expect(Object.values(groups).reduce((n, [e]) => n + Object.keys(e).length, 0)).toBe(113)
})

it('sheets and labels make no health claims (About may disclaim medical advice)', () => {
  const { about, ...sheets } = en.sheets
  for (const text of [...Object.values(sheets), ...Object.values(en.ui)]) expect(text).not.toMatch(HEALTH)
  expect(about.replace('not medical or professional advice', '')).not.toMatch(HEALTH)
})
