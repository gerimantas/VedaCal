# VedaCal — CONTEXT

## Status
P0–P6 done and live (https://gerimantas.github.io/VedaCal/, commit 765faff, CI green).
S5 added a fifth tab, **Sky** (top-down Sun/Moon/stars chart, SPEC 5.5), and reworked About:
Yamaganda/Gulika/Choghadiya explained, terms grouped, every sheet rewritten in plain facts
for Western readers, sources linked in Credits. 1127 tests pass. The day screen still shows
only Brahma/Abhijit/Rahu Kaal — the three new windows are texts only. Next: P7 pilot.
S6 (no code change): VedaCal now installed as an app on the user's tablet. Chrome 154's
menu install says "already installed" for any app on `gerimantas.github.io` once one app
there is installed — install via the app's own Settings → Install app (Key Facts).
Workflow: the user reviews on localhost; commit locally, push only on the user's command.

## Next Tasks
- P7 pilot: the user shares the link with 5–10 people and collects what confuses them;
  then the user picks the next backlog items (SPEC 10). Fix what the pilot reports first.
  plan: `.planning/PLAN.md` P7.
- Day screen: show Yamaganda, Gulika and the Choghadiya hour list (engine ready in
  panchangam-js; Drik fixtures hold Yamaganda/Gulika). The user picks the layout first.
  rules: SPEC 4.5, 5.1; texts already in `sheets` + `choghadiya` content group.
- Ask the user: delete the rejected 3D prototype (`mockups/sky.*`, `mockups/sky/*.jpg`,
  devDependency `three`)?
- Optional: find the uniform ~57 s Moon offset vs Drik (`npm run accuracy`; mypanchang agrees
  with us on tithi to 8 s). Inside the gate, so only if the user asks. rules: SPEC 4.11.

## Done Log

### 2026-10-06 (S6)
- Tablet install fixed (no code); Chrome 154 same-origin install bug documented

### 2026-10-05 (S5)
- About: Yamaganda/Gulika/Choghadiya texts; key grouped; all sheets factual; Credits sources
- Sky tab (top-down chart) live at 765faff

### 2026-10-05 (S4)
- P6 PWA + offline (gate met); update-prompt bar
- Drik evidence complete (Sankranti, eclipses, Pushya, Parana 2027, adhika); ayanamsha fix
- Sun dial redesign: clock face, overlap shown, solid window colours, other-day clock time

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main` (only on the user's command); `.github/workflows/ci.yml` tests and
  publishes. Check: `gh run list --limit 1`. Dev server must be restarted for the About
  version label to show a new commit.
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
- Android install: Chrome 154 menu "Install and create shortcut" checks by origin, so with
  BakeStack installed it shows "already installed" for VedaCal. Use Settings → Install app
  (`src/ui/install.svelte.ts`). Keep that button. Details: vault
  `wiki/frameworks/chrome-android-pwa-install-same-origin.md`
- App shows `v<package version> · <git commit> · built <time>` (vite `define`, `src/globals.d.ts`)
- NotebookLM notebook "VedaCal": `2a0fad75-caeb-4d03-9f73-7c91e341d1f2`
  (Panchang websites, research imports on daily windows and month names; notes, 2 PRD reports)
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

### Session 2026-10-06 (S6) — tablet install fixed; Chrome 154 install-sheet bug found

- **Done:** VedaCal installed as a real app (WebAPK, scope `/VedaCal/`) on the user's Galaxy Tab
  S9+ and confirmed opening standalone. No code change, nothing pushed.
- **Done:** root cause from Chromium source + adb on the tablet: Chrome 154's menu item
  "Install and create shortcut" (`AppInstallMenuHandler.doUniversalInstall`) calls
  `WebappRegistry.isAppInstalledForUrl`, which matches by ORIGIN. BakeStack's WebAPK on
  `gerimantas.github.io` makes every app on that origin read "already installed"; "open"
  then fails. Workaround: the app's own Settings → Install app button (`beforeinstallprompt`,
  scope-based check) installs normally.
- **Decided / overturned:** S6's first guesses (stale SVG-only icon, broken old install) were wrong.
- **Code:** none. Write-up: vault `wiki/frameworks/chrome-android-pwa-install-same-origin.md`
- **Entry point:** tablet diagnosis: `adb forward tcp:9333 localabstract:chrome_devtools_remote`,
  then CDP `Page.getInstallabilityErrors`; `adb shell pm list packages | grep webapk`
- **Not measured:** whether pilot users with no other `gerimantas.github.io` app hit this (they
  should not, by the code).

### Session 2026-10-05 (S5) — Sky tab, About texts rewritten for Western readers, sources linked

- **Done:** Yamaganda, Gulika, Choghadiya (+7 kinds) explained on About (EN+LT, NotebookLM
  research); About key grouped (calendar / times of day / special days); every sheet rewritten
  for a reader new to the Panchang, vague prose replaced by facts (lunar month naming corrected);
  Credits link 8 sources; new **Sky** tab: top-down chart (30 lunar days around the Moon's
  orbit from the Sun, 27 Moon stars, 12 signs) + facts panel, folded legend, ±15-day slider.
  Live: 765faff, CI green.
- **Decided / overturned:** 3D sky (three.js) rejected — bodies share one plane; constellation
  sketches rejected; stars/signs fixed (real motion), not a Sun-fixed frame; only short marks
  on the chart, names in the panel; labels slide off Sun/Moon lines. Never push without the
  user's command (global CLAUDE.md).
- **Code:** `src/ui/{sky.ts,Sky.svelte}`, `src/core/panchang.ts` (`skyAt`), `src/ui/{terms,
  icons,state.svelte}.ts`, `src/ui/About.svelte`, `src/App.svelte`, `src/content/{en,lt}.json`,
  `src/styles/screens.css`, `tests/{ui,content}.test.ts`; prototypes `mockups/sky{,-flat}.{html,ts}`,
  `mockups/sky/`; rules SPEC 5.5; research `.planning/notebooklm/notes/{daily-windows,month-names}.md`.
- **Entry point:** `npm run dev` → `/VedaCal/#/sky`; `npm test` (1127)
- **Not measured:** Sky tab on a real phone; Yamaganda/Gulika/Choghadiya times not yet on
  the day screen (texts only; Drik fixtures already hold Yamaganda/Gulika).

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
