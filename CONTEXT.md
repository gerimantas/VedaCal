# VedaCal — CONTEXT

## Status
P0–P6 done and live (https://gerimantas.github.io/VedaCal/, commit 10fdce2, CI green).
Installable PWA, works offline; "new version" bar with an Update button. All Drik evidence
is in: ayanamsha now equals Drik's printed Lahiri (Sankranti within 2 min); every element
vs Drik has one uniform ~57 s Moon offset (max 93 s, gate 2 min). Day screen sun dial:
24 h clock face, sun outside the ring by day (hidden at night), sunrise/sunset in the
corners, Friday Abhijit/Rahu Kaal overlap shown with real times. 1116 tests pass. Rules:
`.planning/SPEC.md` 4.10, 4.11, 5.1. Next phase: P7 pilot (user shares the link).

## Next Tasks
- P7 pilot: the user shares the link with 5–10 people and collects what confuses them;
  then the user picks the next backlog items (SPEC 10). Fix what the pilot reports first.
  plan: `.planning/PLAN.md` P7.
- Optional: find the uniform ~57 s Moon offset vs Drik (`npm run accuracy`; mypanchang agrees
  with us on tithi to 8 s). Inside the gate, so only if the user asks. rules: SPEC 4.11.

## Done Log

### 2026-10-05 (S4)
- P6 PWA + offline (gate met); update-prompt bar
- Drik evidence complete (Sankranti, eclipses, Pushya, Parana 2027, adhika); ayanamsha fix
- Sun dial redesign: clock face, overlap shown, solid window colours, other-day clock time

### 2026-10-05 (S3)
- P3 approved (v22); P4 day screen + location; P5 month + settings; all gates met
- Source audit additions (live elements, masa, signs, Parana); month marks; Lithuanian UI
- Drik fetching made polite (`scripts/drik-page.ts`); deployed to the live site; QR code made

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main`; `.github/workflows/ci.yml` tests and publishes. Check:
  `gh run list --limit 1`
- After any dependency change: `npm run scan` (security scan, also runs in CI)
- Drik fixture scripts go through `scripts/drik-page.ts`: pages cached in `.cache/drik/`
  (re-parse without re-fetching), 12 s between requests (`DRIK_DELAY_MS`), stop at the first
  reCAPTCHA. Drik blocks after ~150 quick requests.
- Two languages: `src/content/en.json` and `lt.json` (same keys, `tests/content.test.ts`).
  lt.json is the one file allowed to hold Lithuanian (product text the user asked for); code,
  comments and docs stay English. New UI text = a key in both files.
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
- Reference for validation: Drik day page, fetched by `scripts/fetch-drik.ts`:
  `https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=<id>&date=DD/MM/YYYY`
  (Vilnius `593116`, New York `5128581`, New Delhi `1261481`)
- Sunrise: Drik = upper limb, mypanchang = centre (Madhyabimb); ~2 min apart, both measured (SPEC 4.9)
- Swiss Ephemeris is AGPL — closed paid app needs a commercial licence
- No medical claims in product text (app-store and EU risk) — SPEC section 7

## Dead Ends
- **Using NotebookLM numbers as data.** Its 2026-10-04 example (Shukla Navami, waxing)
  is wrong; real value is Krishna Navami, waning. Only computed or Drik-fetched values count.

## Archive

### Session 2026-10-05 (S4) — P6 done, Drik evidence complete, ayanamsha fixed, dial redesigned

- **Done:** P6 gate met (offline precache of moon photo/fonts/cities, PNG icons, install
  button; offline reload works; Chrome manifest clean; Lighthouse mobile perf 94). All
  reCAPTCHA-blocked Drik evidence fetched (Parana NY/Delhi 2027, adhika day pages, Sankranti,
  eclipse, Guru/Ravi Pushya pages). Sun dial redesigned to the user's spec (24 h clock face,
  sun outside ring by day, overlap shown, solid blue/red/green). Update-prompt bar.
- **Decided / overturned:** Lahiri ayanamsha = Drik's printed value (library +24.14″, constant
  on all 48 pages) — Sankranti 9 min gap closed; lunar eclipse typed by local view; Abhijit/
  Rahu Kaal Friday overlap shown with real times (not shortened); dial on other days at the
  device clock time; sun hidden at night; update check only on app open (no hourly poll).
- **Code:** `scripts/fetch-marks.ts`, `tests/drik-marks.test.ts`, `tests/fixtures/{marks,parana,drik}`,
  `src/core/panchang.ts` (DRIK_LAHIRI_OFFSET, lunar type), `src/ui/day.ts` (sunDial, clockOn,
  overlap), `src/ui/{install,update}.svelte.ts`, `src/ui/UpdateBar.svelte`, `vite.config.ts`
- **Entry point:** `npm test`; `npm run accuracy`; `node scripts/fetch-marks.ts <city> 2026`
- **Not measured:** remaining uniform ~57 s Moon offset vs Drik (tithi/nakshatra/yoga/karana,
  max 93 s, inside the gate) — cause unknown. Install prompt not tried on a real phone.

### Session 2026-10-05 (S3) — P3 approved, P4 + P5 built, source audit, Lithuanian, deployed

- **Done:** P3 approved at mockups v22; P4 (Svelte day screen, offline GeoNames search, GPS,
  About) and P5 (lean month view, settings) with gates met; NotebookLM source audit → live
  elements + "then …", lunar month, Moon/Sun signs (Vedic default), Ekadashi Parana; month
  marks (eclipses, Sankranti, Guru/Ravi Pushya); Lithuanian UI; deployed (38d2853, CI green).
- **Decided / overturned:** moonrise/moonset dropped; signs on the moon/sun cards; Vedic
  default + Western setting; month marks option A only; no Sanskrit for "Rest day"; English
  vs device-locale dates fixed (app language rules); Settings shows only the current city.
- **Code:** `src/ui/{day,month,marks,cities,format,terms,icons}.ts`, `src/ui/*.svelte`,
  `src/ui/state.svelte.ts`, `src/core/panchang.ts` (masa, signs, parana, monthMarks, lean
  `computeMonth`), `src/content/lt.json`, `src/data/cities.json`, `scripts/{build-cities,
  fetch-parana,drik-page}.ts`, `tests/{ui,calendar,month,marks}.test.ts`; rules SPEC 4.10, 4.11, 5.2, 5.3.
- **Entry point:** `npm run dev` → `/VedaCal/`; `npm test` (918); live https://gerimantas.github.io/VedaCal/
- **Not measured:** Drik pages for eclipses, Sankranti, Pushya, adhika day pages, NY/Delhi
  2027 Parana (reCAPTCHA) — Next Tasks; month speed on a real phone (4× throttle: 169–232 ms).

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
