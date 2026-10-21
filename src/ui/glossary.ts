import { fold } from './cities'
import { content } from './format'
import { terms, termGroups, type Term } from './terms'

export type Value = { title: string; name: string; meaning?: string; source?: string }
export type GlossaryTerm = { key: Term; name: string; sanskrit: string; values: [slot: string, value: Value][] }
/** One row of the suggestion list; `id` is the DOM id to scroll to. */
export type Suggestion = { id: string; title: string; sanskrit: string; parent: string }

// Every value a term can take, in calendar order; terms without a list (the day's windows,
// the special days) return none.
const lists: Partial<Record<Term, Record<string, Value>>> = {
  tithi: content.tithi,
  vara: content.vara,
  masa: content.masa,
  nakshatra: content.nakshatra,
  rashi: content.rashi,
  yoga: content.yoga,
  karana: content.karana,
  choghadiya: content.choghadiya,
  rhythm: content.rhythm,
}

/** Every glossary term with its values; a value's slot is its key in the content (the DOM id suffix). */
export const glossaryTerms = (): GlossaryTerm[] =>
  termGroups
    .flatMap(([, keys]) => keys)
    .map((key) => ({ key, name: terms[key][0], sanskrit: terms[key][1], values: Object.entries(lists[key] ?? {}) }))

/**
 * Suggestions while typing, like the city search (user, 2026-10-21): names only — a term's
 * name and Sanskrit name, a value's title and name. Case and accents ignored; names that start
 * with the query first, then names with a later word that does; terms before values.
 */
export function suggestGlossary(query: string, all: GlossaryTerm[], limit = 8): Suggestion[] {
  const q = fold(query.trim())
  if (!q) return []
  const rows: { names: string[]; s: Suggestion }[] = [
    ...all.map((g) => ({ names: [g.name, g.sanskrit], s: { id: `g-${g.key}`, title: g.name, sanskrit: g.sanskrit, parent: '' } })),
    ...all.flatMap((g) =>
      g.values.map(([slot, v]) => ({ names: [v.title, v.name], s: { id: `g-${g.key}-${slot}`, title: v.title, sanskrit: v.name, parent: g.name } })),
    ),
  ]
  const folded = rows.map((r) => r.names.filter(Boolean).map(fold))
  const first: Suggestion[] = [], later: Suggestion[] = []
  rows.forEach((r, i) => {
    if (folded[i].some((n) => n.startsWith(q))) first.push(r.s)
    else if (folded[i].some((n) => n.includes(` ${q}`))) later.push(r.s)
  })
  return [...first, ...later].slice(0, limit)
}
