# VedaCal — CONTEXT

## Status
Planned, no code yet. Moon-calendar PWA on the Hindu Panchang for Western wellness
users; all calculation on the device with `astronomy-engine`. Detailed spec and gated
build plan written. `astronomy-engine` matched Drik Panchang for Vilnius 2026-10-04
within ~1.5 min on every element. NotebookLM material is input only — SPEC section 9
lists what in it is wrong.

## Next Tasks
- P0 project setup, then P1 calculation core validated against 36 Drik fixtures.
  plan: `.planning/PLAN.md` (P0, P1); rules: `.planning/SPEC.md` section 4.

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

## Key Facts
- NotebookLM notebook "VedaCal": `2a0fad75-caeb-4d03-9f73-7c91e341d1f2`
  (5 Panchang websites, 1 research report, 1 YouTube video; 9 notes, 2 PRD reports)
- Local copies: `.planning/notebooklm/PRD-en.md`, `PRD-lt.md`, `notes/`
- Spec: `.planning/SPEC.md` · build order + gates: `.planning/PLAN.md`
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
