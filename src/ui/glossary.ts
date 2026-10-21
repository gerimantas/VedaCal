import { fold } from './cities'
import { content, sheet, tradition, traditionSource } from './format'
import { terms, termGroups, type Term } from './terms'

export type Value = { title: string; name: string; meaning?: string; source?: string }
export type GlossaryTerm = { key: Term; name: string; sanskrit: string; texts: string[]; values: Value[] }
export type GlossaryHit = { key: Term; shown: number[] }

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

/** Every glossary term with the texts the search looks in. */
export const glossaryTerms = (): GlossaryTerm[] =>
  termGroups
    .flatMap(([, keys]) => keys)
    .map((key) => ({
      key,
      name: terms[key][0],
      sanskrit: terms[key][1],
      texts: [tradition(key), traditionSource(key), sheet(key)],
      values: Object.values(lists[key] ?? {}),
    }))

/**
 * The terms to show for a query (user, 2026-10-21): case and accents ignored. A term whose
 * name or own texts match shows all its values; otherwise only the values that match.
 * An empty query shows everything.
 */
export function searchGlossary(query: string, all: GlossaryTerm[]): GlossaryHit[] {
  const q = fold(query.trim())
  const every = (g: GlossaryTerm) => g.values.map((_, i) => i)
  if (!q) return all.map((g) => ({ key: g.key, shown: every(g) }))
  const has = (s?: string) => !!s && fold(s).includes(q)
  return all.flatMap((g) => {
    if ([g.name, g.sanskrit, ...g.texts].some(has)) return [{ key: g.key, shown: every(g) }]
    const shown = every(g).filter((i) => [g.values[i].title, g.values[i].name, g.values[i].meaning, g.values[i].source].some(has))
    return shown.length ? [{ key: g.key, shown }] : []
  })
}

/** The closing "how times are calculated" card shows with no query, or when the word is in it. */
export const timesMatches = (query: string, text: string): boolean => {
  const q = fold(query.trim())
  return !q || fold(text).includes(q)
}
