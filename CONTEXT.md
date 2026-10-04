# VedaCal — CONTEXT

## Status
P0 and P1 done. The calculation core (`src/core/panchang.ts`: `computeDay`, `computeMonth`)
passes 383 tests against 39 Drik days, 22 mypanchang days and Drik's Ekadashi lists for
2026 + 2027 (147 dates). Accuracy vs mypanchang: 8–12 s mean per element. Month computes in
140–206 ms at 4× CPU throttle. Live page is still the placeholder (shows today's Vilnius
tithi via the new core). No UI or content yet.

## Next Tasks
- P2 content (113 plain-English entries, user approves) and P3 design mockups with real
  engine values (user approves) — both before any UI code. plan: `.planning/PLAN.md` P2, P3;
  rules: `.planning/SPEC.md` sections 5 and 7.

## Done Log

### 2026-10-04 (S1)
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
- Accuracy vs references: `npm run accuracy`. Refetch references: `node scripts/fetch-drik.ts`,
  `fetch-mypanchang.ts`, `fetch-ekadashi.ts` (fixtures in `tests/fixtures/`, never hand-typed)
- Speed: `npm run dev`, open `/VedaCal/tests/perf/perf.html` (dev-only harness)
- Mockups (P3): `npm run dev` → http://localhost:5173/VedaCal/mockups/ . Bump `MOCKUP_VERSION`
  in `mockups/version.ts` on every visible change — each screen shows a version badge so the
  user can tell a stale browser copy from a real change. Dev server sends `Cache-Control: no-store`.
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

### Session 2026-10-04 (S1) — project start, NotebookLM analysis
Read all notebook notes and both PRDs. Found: invented sample data, oversized scope,
pseudo-medical claims, Swiss Ephemeris licence trap, ads contradiction. User chose
Western wellness audience and PWA. Calibrated `astronomy-engine` against a scraped
Drik page (sunrise rule, Lahiri ayanamsha, Rahu/Abhijit/Brahma rules). Wrote SPEC + PLAN.
