# CONTEXT ARCHIVE

Older session entries moved out of `CONTEXT.md`.

## Session 2026-10-10 (S9) — brief day sheets; plan for one view of the day's periods

- **Done:** Every sheet with a lead is brief: general text folds out ("More about …"), closed on each opening; `data-sheet-brief` gone. Rhythm card has its own fold label. Nakshatra/Yoga/Ritu general texts lose "shown when you tap the row". Rahu Kaal/Yamaganda/Gulika lead writes the weekday lower-case mid-sentence (LT "; šeštadienis:").
- **Done:** Plan `.planning/PLAN-periods.md`: catalogue → source registry (tiers, fake checks, links) → combination model with worked examples → graphic research + mockups + phone task test → engine values one at a time with `scripts/day-trace.ts` → combination engine → texts → views → release. Personal values (default = Drik-style general lists; "My data" switch) run through all phases.
- **Decided / overturned:** One view replaces time list + folded Choghadiya (Gulika/Rahu/Yamaganda = Choghadiya parts 1/3/6). No "hour" level: a day is periods. Q1 evidence, not the user, decides what enters. No invented default birth date.
- **Code:** `src/ui/Sheet.svelte`, `src/ui/Day.svelte`, `src/ui/day.ts`, `src/content/en.json`, `lt.json`; `.planning/SPEC.md` 5.1, `.planning/PLAN-periods.md` (planning repo).
- **Entry point:** `npm run dev`; `npm test` (1197).
- **Not measured:** Q0 catalogue file not written; Drik Chandrabalam/Tarabalam and Panchaka Rahita sections are empty in fixtures (fetcher does not capture them).
## Session 2026-10-10 (S8) — favoured/avoid days, day tracks, every day sheet about that day

- **Done:** Amrit Siddhi = green favoured day (month grid, key dates); Sarvartha Siddhi day screen only. Key dates replace the legend (grid swatch + note on first row); rest days stronger violet; today glows. Day time list adds Bhadra, Vyatipata, Vaidhriti, eclipse window and the favoured window; one shared day track per row, red stripes where avoid overlaps good. Every day sheet leads with that day (times, why, tradition); Choghadiya sheets hold only the part tapped, general text folds out. Live at 950f429.
- **Decided / overturned:** Moon-light curve built then reverted (user: no use). Days to avoid NOT on the month (Drik Oct 2026: 19/31 days). Abhijit cancel-out rule (S7) overturned: nothing cut, as Drik. Chal stays neutral. New-moon rest stays one day; text says why.
- **Code:** `src/core/panchang.ts` (star days, eclipse `seen`, `limbUp`), `src/ui/day.ts` (rows, tracks, leads), `src/ui/month.ts`, `src/ui/marks.ts`, `src/ui/Sheet.svelte`, `src/content/*.json` (`leads`, `tradition`, rashi/masa meanings), `scripts/fetch-marks.ts` (Amrit, Sarvartha, Bhadra, Vyatipata, Vaidhriti), `tests/fixtures/marks/*`.
- **Entry point:** `npm run dev`; `npm test` (1197); `node scripts/fetch-marks.ts <city> 2026`. Rules: SPEC 4.11, 5.1, 5.2.
- **Not measured:** new moon 18:49 (tithi end) vs 18:50 (key dates) — two methods ~40 s apart. Library moonrise 4–10 min off Drik (not shown; Drik = centre, no refraction). Other day sheets still carry general text below the lead.
## Session 2026-10-07 (S7) — Yamaganda/Gulika/Choghadiya on the day screen; no-card redesign

- **Done:** Yamaganda + Gulika rows and dial arcs; Choghadiya folded under the rows (16 parts,
  last night's parts before sunrise). Good time and an overlapping avoid window cancel out:
  both rows trimmed, note line under the good time. Checked vs Drik (48 day fixtures; new
  Choghadiya fixtures for all 7 weekdays).
- **Done:** About split into "Using the app" (install/use/offline, texts after BakeStack) and
  "Glossary" (every term with all its values). Top bar sticky on Day/Month/Sky; bars edge to
  edge on the page sky with an amber line. No cards anywhere (lines between sections). One text
  size per row (tabs excepted). Background lights after vakruska.lt. Pushed, CI green (6136f80).
- **Decided / overturned:** Choghadiya is our own code — panchangam-js 3.0.0 swaps Rog/Shubh in
  its Sun/Mon/Wed/Fri day tables. The cancel-out rule is the user's product choice; those two
  rows differ from Drik by the shared part. Rules recorded in SPEC 4.5, 5, 5.1, 5.4.
- **Code:** `src/core/panchang.ts`, `types.ts`, `src/ui/day.ts`, `Day.svelte`, `About.svelte`,
  `Month.svelte`, `Sky.svelte`, `fireflies.ts`, `screens.css`, `scripts/fetch-choghadiya.ts`,
  `tests/choghadiya.test.ts`, `tests/fixtures/choghadiya/`
- **Entry point:** `npm test` (1159 pass); `node scripts/fetch-choghadiya.ts <city> <dates>`
- **Not measured:** the background lights' battery/CPU cost on a real phone; mockups for
  About/Sky not updated to the no-card look.
## Session 2026-10-06 (S6) — tablet install fixed; Chrome 154 install-sheet bug found

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
## Session 2026-10-05 (S5) — Sky tab, About texts rewritten for Western readers, sources linked

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
## Session 2026-10-05 (S4) — P6 done, Drik evidence complete, ayanamsha fixed, dial redesigned

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
## Session 2026-10-05 (S3) — P3 approved, P4 + P5 built, source audit, Lithuanian, deployed

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
## Session 2026-10-04 (S2) — P3 mockups v4 → v21 from the user's fixes

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
