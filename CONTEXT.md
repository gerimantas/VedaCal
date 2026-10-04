# VedaCal — CONTEXT

## Status
P0 done: Vite + Svelte 5 + PWA skeleton live at https://gerimantas.github.io/VedaCal/,
CI green (audit, signatures, dependency scan, tests, type check, build, Pages deploy).
The placeholder page computes today's Vilnius tithi and sunrise with `panchangam-js`
in the browser (sunrise matches Drik). Next is P1: the adapter and its validation.
Engine: `panchangam-js` 3.0.0 behind our own adapter; Drik upper-limb sunrise; English UI.

## Next Tasks
- P1: fixture fetchers (Drik + mypanchang), then the adapter in `src/core/` meeting
  SPEC 4 and the SPEC 8 contract. plan: `.planning/PLAN.md` P1; library quirks: SPEC 11
  "Library behaviour found in P0" (0-based indexes, karana names, CJS/ESM alias).

## Done Log

### 2026-10-04 (S1)
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
