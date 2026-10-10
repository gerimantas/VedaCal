# CONTEXT ARCHIVE

Older session entries moved out of `CONTEXT.md`.

## Session 2026-10-04 (S1) — project start through P0, P1, P2 and P3 mockups v4

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
