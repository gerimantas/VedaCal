# VedaCal — CONTEXT

## Status
Live: P0–P6 (https://gerimantas.github.io/VedaCal/, 950f429). Local, not pushed: S9's brief
sheets and all of S12.
Periods work (`.planning/PLAN-periods.md`): Q0–Q2 done (registry `research/rules.md`, model
SPEC 13, worked examples `research/examples.md`). S12: day view direction approved = the
24 h clock (mockup `mockups/research/d7-clock.html`; every user decision in PLAN-periods Q3
"Decisions so far"). Engine step 1 built: `src/core/periods.ts` (values derivable from
computeDay + SPEC 13.4 verdict; still-missing values listed in its `MISSING`). Step 2 built:
the clock on the Day screen (`src/ui/DayClock.svelte`), under the moon hero; the old sun dial
and time list stay below it until the user approves the clock. Choghadiya is shown only,
never decides (R21). Known: with values missing, some times look better than they are (e.g.
2026-10-06 shows Sarvartha good; the eclipse-star veto E1 is not computed yet) — the clock
says so. Open SPEC questions: day start BM (13.1) vs sunrise (13.5); D3 paksha-randhra
remainder neutral or fallback.
Workflow: the user reviews on localhost; show proposals before changing code; commit
locally, push only on the user's command.

## Next Tasks
- Engine step 3 (PLAN-periods Q4): compute the `MISSING` values in `src/core/periods.ts` one
  at a time, test-first vs Drik fixtures (3 cities), each then shown by the clock. Order:
  E1 eclipse star + 3-day windows (rules.md E1; example 2 and example 4 = 2026-08-12, pages
  fetched), Dur Muhurtam (R10), Varjyam (R7), Amrit Kalam (R23), lagna junctions (D5, needs
  ascendant — Q4.g), Baana (R19), month rules (M1–M6). Read first: PLAN-periods Q3 decisions
  + Q4, SPEC 13, `tests/periods.test.ts`. Ask the user how the app clock looks before starting.
- User review of the app clock (Day screen); on approval remove the old sun dial, time list
  and folded Choghadiya (PLAN-periods Q7 gate). Button style: one decision for all pages.
- Open SPEC questions for the user: day start BM vs sunrise (13.1 vs 13.5); D3 remainder.
- New moon shows 18:49 (tithi end, moon card) and 18:50 (key dates, tradition card): two
  methods ~40 s apart (SPEC 11). Use one instant for both. Code: `src/core/panchang.ts`.
- P7 pilot: the user shares the link with 5–10 people and collects what confuses them;
  then the user picks the next backlog items (SPEC 10). Fix what the pilot reports first.
  plan: `.planning/PLAN.md` P7.
- Mockups `mockups/about.ts`, `sky*.ts`, `location.ts` predate S7's About split and no-card
  look; update them or retire the P3 mockups (ask the user).
- Ask the user: delete the rejected 3D prototype (`mockups/sky.*`, `mockups/sky/*.jpg`,
  devDependency `three`)?
- Optional: find the uniform ~57 s Moon offset vs Drik (`npm run accuracy`; mypanchang agrees
  with us on tithi to 8 s). Inside the gate, so only if the user asks. rules: SPEC 4.11.

## Done Log

### 2026-10-10 (S12)
- D6 graph variants, D7 24 h clock mockup (approved direction); Choghadiya → shown only
- `src/core/periods.ts` (engine step 1) + tests; day clock on the Day screen; activity and palette settings

### 2026-10-10 (S11)
- Drik extra fixtures complete (Delhi dates, Vilnius Do Ghati, 2026-08-12)
- Q3.1 survey page `mockups/research/` + D5 graded day graph

### 2026-10-10 (S10)
- PLAN-periods audited (16 fixes); Q0 catalogue + `fetch-drik-extra.ts`; Q1 registry; Q2 model (SPEC 13) + examples

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main` (only on the user's command); `.github/workflows/ci.yml` tests and
  publishes. Check: `gh run list --limit 1`. Dev server must be restarted for the About
  version label to show a new commit.
- After any dependency change: `npm run scan` (security scan, also runs in CI)
- Drik fixture scripts go through `scripts/drik-page.ts`: pages cached in `.cache/drik/`
  (re-parse without re-fetching), 12 s between requests (`DRIK_DELAY_MS`), stop at the first
  reCAPTCHA. Drik blocked even at 12 s spacing after ~180 pages (S10); the block lifted
  within an hour. WebFetch gets the reCAPTCHA too — read Drik text from `.cache/drik/`.
- Periods engine: `src/core/periods.ts` (pure; `dayPeriods`, `daySegments`, `verdictOf`,
  `MISSING`); clock view model `src/ui/verdict.ts`. To print a day's segments, a throwaway
  vitest file calling `daySegments` works (Node cannot run `src/` TS directly: extensionless
  imports). Every verdict must match `.planning/research/examples.md`; fix the example when
  the engine proves it wrong, and say so in the example.
- Source texts for the periods registry are archive.org scans; the clean Muhurta
  Chintamani is Pyarelal Mishra's Hindi edition (link in `.planning/research/rules.md`).
- Two languages: `src/content/en.json` and `lt.json` (same keys, `tests/content.test.ts`).
  lt.json is the one file allowed to hold Lithuanian (product text the user asked for); code,
  comments and docs stay English. New UI text = a key in both files.
- Accuracy vs references: `npm run accuracy`. Refetch references: `node scripts/fetch-drik.ts`,
  `fetch-mypanchang.ts`, `fetch-ekadashi.ts`, `fetch-choghadiya.ts`, `fetch-drik-extra.ts` (fixtures in
  `tests/fixtures/`, never hand-typed)
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

Older entries live in `CONTEXT-ARCHIVE.md` (moved there by session-end rotation, newest first). This section keeps the most recent 10 sessions.

### Session 2026-10-10 (S12) — day clock designed (D6, D7), engine step 1, clock in the app

- **Done:** D6 (5 graph variants) → user picked the ring → D7 24 h clock mockup, iterated (12 on top, sun marks, hand B, icons, inner rings hidden, two days). Audit: SPEC 13.4 made every day 43–65 % "avoid", mostly Choghadiya → Choghadiya now shown only (R21).
- **Done:** Engine step 1: `src/core/periods.ts` — easy values, day base per group, 13.4 verdict, `MISSING` list; 25 tests from the examples. Examples 1–3 corrected (3 hand errors the tests found), example 5 (2026-05-10) added.
- **Done:** Step 2: day clock on the Day screen (`DayClock.svelte`), activity setting (10 groups, General default), palette setting (current / rainbow), EN+LT labels.
- **Decided / overturned:** Choghadiya never decides; group 0 = "General"; group 6 named "Care and remedies" (content test bans "health"); palette in Settings; button style decided later for all pages. All in PLAN-periods Q3 "Decisions so far".
- **Code:** `src/core/periods.ts`, `src/ui/{DayClock.svelte,verdict.ts,Day.svelte,LocationPicker.svelte,state.svelte.ts}`, `src/styles/tokens.css`, `src/content/{en,lt}.json`, `tests/periods.test.ts`, `mockups/research/{d6-variants,d7-clock}.html`; planning: SPEC 13.2, rules R21/C4/C5, examples.md.
- **Entry point:** `npm run dev` → http://localhost:5173/VedaCal/ (Day screen); mockup `/VedaCal/mockups/research/d7-clock.html`; `npx vitest run tests/periods.test.ts`.
- **Not measured:** the clock on a real phone; user has not reviewed the app clock yet.

### Session 2026-10-10 (S11) — Q3.1 design survey; D5 graded day graph

- **Done:** Drik extra fixtures completed: New Delhi's 10 missing dates; all 16 Vilnius dates refetched to add Do Ghati (only `fetchedAt` changed otherwise); Vilnius 2026-08-12 day + extra pages for example 4.
- **Done:** Q3.1 survey page: 18 phone-width screenshots (Drik, Prokerala, Shubh, DekhoPanchang, timeanddate, yr, meteoblue, GitHub, Gantt, hypnogram, VedaCal) with works/fails lines; directions D1–D4 (day), M1–M2 (month).
- **Done:** D5 (user's idea): graded 24 h chart — hour axis, verdict levels; verdict line + one chart per system; tap shows what is active and what decides. Computes SPEC 13.4 from Drik times; group 0 matches example 1 segment for segment; group 7 (rites) toggle.
- **Decided / overturned:** User: a thick coloured band is not informative — wants a graded 24 h chart (hours + levels). Verdicts are never summed (a sum would let pluses cancel a veto). Graph variants are next session's work; no directions picked yet.
- **Code:** `mockups/research/{index.html,d5-graph.html,shots/*.webp}`; `tests/fixtures/drik-extra/*`, `tests/fixtures/drik/vilnius-2026-08-12.json`.
- **Entry point:** `npm run dev` → http://localhost:5173/VedaCal/mockups/research/ (D5: `d5-graph.html`, `?theme=dark`).
- **Not measured:** D5 on a real phone; Prokerala's "overlapped by vaar vela" rule not checked against the registry; example 4 still not worked.

### Session 2026-10-10 (S10) — plan audit; Q0 catalogue, Q1 source registry, Q2 model

- **Done:** Audit of PLAN-periods (16 findings fixed, files `PLAN-periods_AUDIT_*`). Q0: `research/catalogue.md`; `scripts/fetch-drik-extra.ts` (Drik Hora, Gowri, Lagna, Panchaka Rahita, Chandrabalam, Tarabalam, Do Ghati per day).
- **Done:** Q1: `research/rules.md` — ~55 records from Muhurta Chintamani (clean Hindi ed. 1939), Kalaprakasika, Brihat Samhita, Ashtanga Hridaya, Raman, Drik; verdict index for every catalogue row.
- **Done:** Q2: SPEC 13 (periods model) + `research/examples.md` (Vilnius 10-10, 10-06, 10-25 worked by hand).
- **Decided / overturned:** User: good AND bad shown at every level (replaces SPEC 4.11's hidden avoid days); verdicts per 10 activity groups; base = Muhurta Chintamani + Drik, regional items later; ignore the current app when deciding. Rejected: "Abhijit cancels all doshas" (that is Ravi yoga), "Panchaka bad for everything" (5 acts only).
- **Code:** `scripts/fetch-drik-extra.ts`, `tests/fixtures/drik-extra/*`; planning repo: `PLAN-periods.md`, `SPEC.md` 13, `research/{catalogue,rules,examples}.md`.
- **Entry point:** `node scripts/fetch-drik-extra.ts <city> [dates]` (12 s spacing, cached).
- **Not measured:** example 4 (2026-08-12 eclipse) needs its Drik pages; combustion orbs, karana quality, Pitru Paksha unsourced.

### Session 2026-10-10 (S9) — brief day sheets; plan for one view of the day's periods

- **Done:** Every sheet with a lead is brief: general text folds out ("More about …"), closed on each opening; `data-sheet-brief` gone. Rhythm card has its own fold label. Nakshatra/Yoga/Ritu general texts lose "shown when you tap the row". Rahu Kaal/Yamaganda/Gulika lead writes the weekday lower-case mid-sentence (LT "; šeštadienis:").
- **Done:** Plan `.planning/PLAN-periods.md`: catalogue → source registry (tiers, fake checks, links) → combination model with worked examples → graphic research + mockups + phone task test → engine values one at a time with `scripts/day-trace.ts` → combination engine → texts → views → release. Personal values (default = Drik-style general lists; "My data" switch) run through all phases.
- **Decided / overturned:** One view replaces time list + folded Choghadiya (Gulika/Rahu/Yamaganda = Choghadiya parts 1/3/6). No "hour" level: a day is periods. Q1 evidence, not the user, decides what enters. No invented default birth date.
- **Code:** `src/ui/Sheet.svelte`, `src/ui/Day.svelte`, `src/ui/day.ts`, `src/content/en.json`, `lt.json`; `.planning/SPEC.md` 5.1, `.planning/PLAN-periods.md` (planning repo).
- **Entry point:** `npm run dev`; `npm test` (1197).
- **Not measured:** Q0 catalogue file not written; Drik Chandrabalam/Tarabalam and Panchaka Rahita sections are empty in fixtures (fetcher does not capture them).

### Session 2026-10-10 (S8) — favoured/avoid days, day tracks, every day sheet about that day

- **Done:** Amrit Siddhi = green favoured day (month grid, key dates); Sarvartha Siddhi day screen only. Key dates replace the legend (grid swatch + note on first row); rest days stronger violet; today glows. Day time list adds Bhadra, Vyatipata, Vaidhriti, eclipse window and the favoured window; one shared day track per row, red stripes where avoid overlaps good. Every day sheet leads with that day (times, why, tradition); Choghadiya sheets hold only the part tapped, general text folds out. Live at 950f429.
- **Decided / overturned:** Moon-light curve built then reverted (user: no use). Days to avoid NOT on the month (Drik Oct 2026: 19/31 days). Abhijit cancel-out rule (S7) overturned: nothing cut, as Drik. Chal stays neutral. New-moon rest stays one day; text says why.
- **Code:** `src/core/panchang.ts` (star days, eclipse `seen`, `limbUp`), `src/ui/day.ts` (rows, tracks, leads), `src/ui/month.ts`, `src/ui/marks.ts`, `src/ui/Sheet.svelte`, `src/content/*.json` (`leads`, `tradition`, rashi/masa meanings), `scripts/fetch-marks.ts` (Amrit, Sarvartha, Bhadra, Vyatipata, Vaidhriti), `tests/fixtures/marks/*`.
- **Entry point:** `npm run dev`; `npm test` (1197); `node scripts/fetch-marks.ts <city> 2026`. Rules: SPEC 4.11, 5.1, 5.2.
- **Not measured:** new moon 18:49 (tithi end) vs 18:50 (key dates) — two methods ~40 s apart. Library moonrise 4–10 min off Drik (not shown; Drik = centre, no refraction). Other day sheets still carry general text below the lead.

### Session 2026-10-07 (S7) — Yamaganda/Gulika/Choghadiya on the day screen; no-card redesign

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
