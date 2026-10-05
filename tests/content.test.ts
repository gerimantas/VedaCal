// Content rules (.planning/SPEC.md section 7): every element has an entry, titles are short,
// meanings are one or two sentences, and no text makes a health or body claim.
import { describe, expect, it } from 'vitest'
import en from '../src/content/en.json'
import lt from '../src/content/lt.json'

type Entry = { name: string; title: string; meaning: string }
const groups: Record<string, [Record<string, Entry>, string[]]> = {
  tithi: [en.tithi, Array.from({ length: 30 }, (_, i) => String(i + 1))],
  nakshatra: [en.nakshatra, Array.from({ length: 27 }, (_, i) => String(i + 1))],
  yoga: [en.yoga, Array.from({ length: 27 }, (_, i) => String(i + 1))],
  karana: [en.karana, Array.from({ length: 11 }, (_, i) => String(i + 1))],
  vara: [en.vara, Array.from({ length: 7 }, (_, i) => String(i))],
  choghadiya: [en.choghadiya, ['amrit', 'shubh', 'labh', 'chal', 'udveg', 'rog', 'kaal']],
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

it('has 120 meaning entries in total', () => {
  expect(Object.values(groups).reduce((n, [e]) => n + Object.keys(e).length, 0)).toBe(120)
})

it('sheets and labels make no health claims (About may disclaim medical advice)', () => {
  const { about, ...sheets } = en.sheets
  for (const text of [...Object.values(sheets), ...Object.values(en.ui)]) expect(text).not.toMatch(HEALTH)
  expect(about.replace('not medical or professional advice', '')).not.toMatch(HEALTH)
})

// ── Lithuanian (user, 2026-10-05) ────────────────────────────────────────────
// Same shape as en.json, same content rules, and a Lithuanian health-word list.
describe('lt.json', () => {
  const shape = (o: unknown): unknown =>
    o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : typeof o
  const LT_HEALTH = /(gyd(o\b|om|ym|yt(i|is|u)\b)|išgyd|detoks|apvalym|imunit|hormon|ląstel|\bjon(ai|ų)\b|nerv|smegen|\blig(a|os|ų|oms)\b|medicin|simptom|\bkraujo?\b|medžiagų apykait|virškin|sveikat|\bkūn(as|o|ui|e)\b|\borgan(as|ai|ų)\b|terap|čakr|toksin|gerovė)/i

  it('has every key of en.json and nothing else', () => {
    expect(shape(lt)).toEqual(shape(en))
  })

  it('keeps the Sanskrit names', () => {
    for (const g of ['tithi', 'nakshatra', 'yoga', 'karana', 'vara', 'rhythm', 'masa', 'rashi', 'choghadiya'] as const)
      for (const [k, e] of Object.entries(en[g])) expect((lt[g] as Record<string, { name: string }>)[k].name, `${g} ${k}`).toBe((e as { name: string }).name)
  })

  it.each(Object.keys(groups))('%s: short title, 1–2 sentence meaning, no health words', (g) => {
    for (const [k, e] of Object.entries(lt[g as keyof typeof groups] as Record<string, Entry>)) {
      expect(e.title.split(/\s+/).length, `${k} ${e.title}`).toBeLessThanOrEqual(6)
      expect(sentences(e.meaning), e.meaning).toBeGreaterThanOrEqual(1)
      expect(sentences(e.meaning), e.meaning).toBeLessThanOrEqual(2)
      expect(`${e.title} ${e.meaning}`).not.toMatch(LT_HEALTH)
    }
  })

  it('sheets and labels make no health claims (About may disclaim medical advice)', () => {
    const { about, ...sheets } = lt.sheets
    for (const text of [...Object.values(sheets), ...Object.values(lt.ui)]) expect(text).not.toMatch(LT_HEALTH)
    expect(about.replace('nėra medicininis ar profesionalus patarimas', '')).not.toMatch(LT_HEALTH)
  })
})
