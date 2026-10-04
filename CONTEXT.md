# VedaCal — CONTEXT

## Status
P0, P1, P2 done; P3 in progress. The calculation core (`src/core/panchang.ts`) passes 504
tests. P3 mockups are at v21 after a full session of the user's fixes: NASA moon photo,
24-hour sun dial with calm/good/avoid rows, plain-English fact rows (Sanskrit same size,
gold), tap-to-explain sheets, About tab, photo moons in the month grid. Design rules are in
`.planning/SPEC.md` 5.1. Not approved yet; P4 waits for approval. Live site is still the
placeholder.

## Next Tasks
- P4, the source-audit additions and P5 (month screen + settings) are done and committed,
  not pushed: push to `main` (= deploy to the live site) once the user says so. Then P6
  (PWA, offline — precache misses the moon photo and fonts). plan: `.planning/PLAN.md` P6.
- Fetch the Drik evidence the reCAPTCHA cut off (2026-10-05), in the background (~15 min at
  12 s per page): `node scripts/fetch-parana.ts new-york 2027`, `… new-delhi 2027`, and
  `node scripts/fetch-drik.ts <vilnius|new-york|new-delhi> 2026-05-10 2026-05-25 2026-06-08`
  (adhika month); plus Drik's Grahan (eclipse), Sankranti and Guru/Ravi Pushya pages for
  2026 — needs a new small fetch script on `scripts/drik-page.ts` and tests (SPEC 4.11).
  Then `npm test`; a mismatch is a finding, not a fixture to edit.
  rules: `.planning/SPEC.md` 4.10 (Evidence).

## Done Log

### 2026-10-04 (S2)
- P3 mockups v5–v21: NASA moon photo, sun dial, fact rows, sheets, About tab, month photo moons
- Plain-English rule written into SPEC 5.1; user page idea recorded in SPEC 10 backlog

### 2026-10-04 (S1)
- P3: mockups v1–v4 (day, month, location; dark + light); version badge + no-store dev server
- P2: 113 content entries approved; `tests/content.test.ts` blocks health claims
- P1: core validated (Drik + mypanchang fixtures, Ekadashi rule, edge cases, speed, bundle check)
- Analysed the NotebookLM notebook; audience chosen: Western wellness users
- PWA + `astronomy-engine` chosen; calibrated against Drik (SPEC 4.9)
- `.planning/SPEC.md` (what/how) and `.planning/PLAN.md` (P0–P7 with gates) written
- Checked plan against the 7 NotebookLM sources + mypanchang; decided: Drik sunrise,
  English UI, public repo; GitHub prior art searched (SPEC 11)
- Concept module 3 kept in v1 as "Traditional rhythm" (rest days, Ekadashi, Ayana,
  Ritu — no health claims); concept coverage table in SPEC 12
- Engine: `@ishubhamx/panchangam-js` 3.0.0 behind own adapter; security-checked
  (SPEC 11); new-moon rest day = the new-moon day only
- `.planning/` split into its own local repo (history kept); removed from main-repo history
- P0: scaffold, pinned deps, CSP, scan script, CI + Pages; gate passed (live page, CI green)

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main`; `.github/workflows/ci.yml` tests and publishes. Check:
  `gh run list --limit 1`
- After any dependency change: `npm run scan` (security scan, also runs in CI)
- Drik fixture scripts go through `scripts/drik-page.ts`: pages cached in `.cache/drik/`
  (re-parse without re-fetching), 12 s between requests (`DRIK_DELAY_MS`), stop at the first
  reCAPTCHA. Drik blocks after ~150 quick requests.
- Accuracy vs references: `npm run accuracy`. Refetch references: `node scripts/fetch-drik.ts`,
  `fetch-mypanchang.ts`, `fetch-ekadashi.ts` (fixtures in `tests/fixtures/`, never hand-typed)
- Speed: `npm run dev`, open `/VedaCal/tests/perf/perf.html` (dev-only harness)
- Mockups (P3): `npm run dev` → http://localhost:5173/VedaCal/mockups/ . Bump `MOCKUP_VERSION`
  in `mockups/version.ts` on every visible change — each screen shows a version badge so the
  user can tell a stale browser copy from a real change. Dev server sends `Cache-Control: no-store`.
- Mockups are NOT covered by `npm run check` (tsconfig.app includes `src/` only). Type-check
  them with: `node_modules/.bin/tsc --ignoreConfig --noEmit --strict --noUnusedLocals --module esnext
  --moduleResolution bundler --target es2022 --lib es2022,dom,dom.iterable --skipLibCheck
  --resolveJsonModule --types vite/client mockups/*.ts src/globals.d.ts`
- Browser auto-dark (Chrome force-dark) ignores `color-scheme` and inverts SVG fills; reproduce
  with Chromium arg `--blink-settings=forceDarkModeEnabled=true`. Photos are left alone.
- App shows `v<package version> · <git commit> · built <time>` (vite `define`, `src/globals.d.ts`)
- NotebookLM notebook "VedaCal": `2a0fad75-caeb-4d03-9f73-7c91e341d1f2`
  (5 Panchang websites, 1 research report, 1 YouTube video; 9 notes, 2 PRD reports)
- Local copies: `.planning/notebooklm/PRD-en.md`, `PRD-lt.md`, `notes/`
- Spec: `.planning/SPEC.md` · build order + gates: `.planning/PLAN.md`
- `.planning/` is a **separate local-only git repo** (ignored by the main repo, never
  pushed — user decision 2026-10-04: plans stay private, code is public). Commit planning
  changes with `git -C .planning commit`; session end must commit both repos.
- Reference for validation: Drik day page, fetch with firecrawl:
  `https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=<id>&date=DD/MM/YYYY`
  (Vilnius `593116`, New York `5128581`, New Delhi `1261481`)
- Sunrise: Drik = upper limb, mypanchang = centre (Madhyabimb); ~2 min apart, both measured (SPEC 4.9)
- Swiss Ephemeris is AGPL — closed paid app needs a commercial licence
- No medical claims in product text (app-store and EU risk) — SPEC section 7

## Dead Ends
- **Using NotebookLM numbers as data.** Its 2026-10-04 example (Shukla Navami, waxing)
  is wrong; real value is Krishna Navami, waning. Only computed or Drik-fetched values count.

## Archive

### Session 2026-10-04 (S2) — P3 mockups v4 → v21 from the user's fixes

- **Done:** real NASA moon photo (public domain) replaces the fake SVG moon; night side drawn
  as the dimmed photo so browser auto-dark cannot invert it; 24-hour sun dial with live sun,
  calm/good/avoid rows as its key; six Sanskrit tiles → plain-English fact rows ("More
  details" folds yoga/karana); tap-to-explain sheets; About tab; month grid uses photo moons,
  no tithi number; duplicates removed (legend, window cards, footer, season card).
- **Decided / overturned:** rule — plain English first, Sanskrit name same size in gold,
  never alone, one fact one place (SPEC 5.1); user page (birth data, horoscope, biorhythms)
  deferred to backlog (SPEC 10); six-tile grid and half sun arc overturned.
- **Code:** `src/ui/moon.ts`, `src/ui/format.ts` (moonSvg removed), `src/styles/tokens.css`
  (`--color-calm`), `src/content/en.json` (new ui keys), `mockups/{day,month,common,about,
  version}.ts`, `mockups/{about,index}.html`, `mockups/screens.css`, `public/moon-full.webp`.
- **Entry point:** `npm run dev` → `/VedaCal/mockups/day.html` (`?at=HH:MM`, `?date=`).
- **Not measured:** user has not approved v21; moonrise/moonset not in mockups (decide
  before P4); forced-dark fix verified only in headless Chromium, not the user's browser.

### Session 2026-10-04 (S1) — project start through P0, P1, P2 and P3 mockups v4

- **Done:** NotebookLM analysis → SPEC + gated PLAN (private `.planning/` repo); P0 PWA
  skeleton live on Pages with CI; P1 calculation core validated (383 tests, 61 reference
  days, 147 Ekadashi dates); P2 113 plain-English entries approved; P3 mockups v1→v4.
- **Decided / overturned:** audience = Western wellness; PWA; English UI; public code repo,
  private plans; Drik upper-limb sunrise; engine = panchangam-js for rise/set/ayanamsa/
  window formulas + own element search (library too slow, drops fixed karanas); Smarta
  Ekadashi rule (SPEC 4.7); new-moon rest = that day only; design direction A
  "dashboard" (user's reference image) — v1–v3 calm/editorial overturned.
- **Code:** `src/core/{panchang,time,types}.ts`, `src/ui/{format,moon}.ts`,
  `src/styles/tokens.css`, `src/content/en.json`, `mockups/*`, `scripts/{fetch-drik,
  fetch-mypanchang,fetch-ekadashi,cities}.ts`, `scripts/{scan-deps,check-bundle}.mjs`,
  `tests/*` + `tests/fixtures/`, `.github/workflows/ci.yml`.
- **Entry point:** `npm run dev` → http://localhost:5173/VedaCal/mockups/ ; `npm test` ;
  `npm run accuracy`.
- **Not measured:** month speed on a real phone (throttled browser looked weaker than 4×);
  user has not approved the v4 design and has not yet said what to change.
