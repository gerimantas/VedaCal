# VedaCal — code map

Session state, rules and the task queue live in `CONTEXT.md`. Specs and research live in
`.planning/` (a separate local-only repo, not indexed by the graphs below).

## Ask the graph before you search

Two local indexes, refreshed by `.git/hooks/post-commit` after every commit. A guard
(`.claude/hooks/graphify-guard.py`) denies Grep over `src/`, `tests/`, `scripts/` and
recursive grep/rg/find until one of them has returned a real answer in the current task.

| Question | Command (repo root; set `PYTHONUTF8=1`) |
|---|---|
| Where is symbol X defined? | `code-review-graph search "X"` |
| Who calls X? (sees calls inside `.svelte`) | `code-review-graph query callers_of X` |
| What does a file change reach? | `code-review-graph impact --files <path> --depth 1` |
| A file or symbol with its neighbours | `graphify explain "<name>"` |
| How do A and B connect? | `graphify path "A" "B"` |

Known blind spots, measured 2026-10-24 with graphify 0.9.95 (needs ≥ 0.9.76; 0.9.26 parsed
a whole `.svelte` file as JS, failed on the markup and kept only its imports):
- graphify sees calls inside `.svelte` functions (`dayclock_inner → ringOf`), but a call in
  a top-level `$derived(...)` or in the markup shows only as an `imports` edge:
  `explain "daySummary"` lists `Week.svelte [imports] L12`, not the call at L87. For exact
  call sites use `code-review-graph query callers_of`.
- `graphify explain` takes the first node when two share a name. Locate symbols with
  `code-review-graph search`.
- A file added since the last commit is in neither index. Run `code-review-graph build`
  and `graphify update .` by hand if you need it before committing.

"I ran the graph" is not orientation. Say what it returned — "`daySummary` is at
`src/ui/week.ts:179`, called from `Week.svelte:87`" — then open those files. If `impact`
or `callers_of` lists a direct caller of what you change, read it before editing.

## Layout

- `src/core/` — pure calculation, no screen code.
  - `panchang.ts` — the day's elements: `computeDay` (the hub), `computeMonth`,
    `monthMarks`, `skyAt` (SPEC 4, 11).
  - `periods.ts` — periods of the day and the segment verdict, incl. the personal layer:
    `dayPeriods` (SPEC 13).
  - `time.ts` — time zones and dates (`zonedTimeToUtc`, `addDays`, `civilDate`).
  - `types.ts` — shared types.
- `src/ui/` — Svelte 5 screens and their view models.
  - Screens: `Day.svelte` + `DayClock.svelte`, `Week.svelte`, `Month.svelte`,
    `Sky.svelte`; shell `App.svelte`, `AppBar.svelte`, `Menu.svelte`.
  - View models (testable TS): `day.ts` (`dayView`), `week.ts`, `month.ts`, `sky.ts`.
  - `verdict.ts` — colour scale and verdict wording (`scalePos`, `periodNameHtml`).
  - `format.ts` — i18n `t()`, times, Sanskrit marking (`labelHtml`, `markSanskrit`).
  - `state.svelte.ts` — location, settings and birth data in `localStorage`; the route.
- `src/content/en.json`, `lt.json` — all user-facing text, each with its source.
- `tests/` — Vitest; `npm test`. `tests/content.test.ts` enforces a source on every text.
- `scripts/` — fetchers that build the reference fixtures from Drik Panchang and others.
