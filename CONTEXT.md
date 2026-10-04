# VedaCal — CONTEXT

## Status
New project (2026-10-04). Concept only, no code. A moon-calendar app built on the Hindu
Panchang, aimed at Western wellness users (decided S1), with a calm dark design.
NotebookLM research and two PRDs are copied into `.planning/notebooklm/`; their sample
data is invented and some claims are wrong — `.planning/MVP.md` lists what to ignore.

## Next Tasks
- Build and validate the calculation core (no UI): 10 dates × 2 cities must match
  drikpanchang.com within 2 minutes. First decide platform/engine (recommended: PWA +
  `astronomy-engine`). plan: `.planning/MVP.md` → "Step 1" and "Open decisions".

## Done Log

### 2026-10-04 (S1)
- Analysed the NotebookLM notebook; audience chosen: Western wellness users
- MVP scope and validation gate written to `.planning/MVP.md`

## Key Facts
- NotebookLM notebook "VedaCal": `2a0fad75-caeb-4d03-9f73-7c91e341d1f2`
  (5 Panchang websites, 1 research report, 1 YouTube video; 9 notes, 2 PRD reports)
- Local copies: `.planning/notebooklm/PRD-en.md`, `PRD-lt.md`, `notes/`
- Reference for validation: https://www.drikpanchang.com/ (fetch with firecrawl)
- Swiss Ephemeris is AGPL — closed paid app needs a commercial licence
- No medical claims in product text (app-store and EU risk) — see MVP.md "Content rules"

## Dead Ends
- **Using NotebookLM numbers as data.** Its 2026-10-04 example (Shukla Navami, waxing)
  is wrong; real value is Krishna Navami, waning. Only computed or Drik-fetched values count.

## Archive

### Session 2026-10-04 (S1) — project start, NotebookLM analysis
Read all notebook notes and both PRDs. Found: invented sample data, oversized scope,
pseudo-medical claims, Swiss Ephemeris licence trap, ads contradiction. User chose
Western wellness audience. Wrote MVP plan; created CONTEXT.md and git repo.
