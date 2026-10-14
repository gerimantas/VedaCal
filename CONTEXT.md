# VedaCal — CONTEXT

## Status
Live: P0–P6 (https://gerimantas.github.io/VedaCal/, 950f429). Local, not pushed: S9's brief
sheets and all of S12–S14.
Periods work (`.planning/PLAN-periods.md`): the day clock (`src/ui/DayClock.svelte`, approved
design `mockups/research/d7-clock.html`) is the Day screen's time view; the user approved it
in S14, and the old sun dial, time list and Choghadiya list are gone. Under the clock, a
"Visa diena" list (same-colour parts merged, tap → hand). Engine (`src/core/periods.ts`)
now has every SPEC 13.2 veto value and the month rules: E1, Dur Muhurtam, Varjyam, Amrit
Kalam, lagna junctions, Baana, M1 (Adhika, Jupiter/Venus combust by Drik's visibility
model), M2, M5, M6 (marriage only). `MISSING` (shown under the clock): Hora, Anandadi,
Tri/Dwi Pushkara, travel rules (Godhuli, Nishita, Panchaka, Disha Shool, Abhijit south),
Sankranti window. Choghadiya is shown only, never decides (R21).
Open: E1's eclipse-time veto for group 7; SPEC day start BM (13.1) vs sunrise (13.5); D3
paksha-randhra remainder neutral or fallback.
Workflow: the user reviews on localhost (the dev server restarts itself on every commit;
the top bar shows the commit); show proposals before changing code; commit locally, push
only on the user's command.

## Next Tasks
- Engine, the values left in `MISSING` (PLAN-periods Q4 b, d, e; SPEC 13.2): Hora (R6, R22),
  Anandadi (R15), Tri/Dwi Pushkara note (R24), travel rules (R9, G3, R25), Sankranti (R26);
  then the personal layer (Q4.f, Q7.1 birth data). Test-first vs Drik, 3 cities. Ask the user
  which first. Read: PLAN-periods Q4, SPEC 13.2, `.planning/research/rules.md`.
- Ask the user whether to push S9–S14 live (P7 pilot needs it). Button style: one decision for all pages.
- Open SPEC questions for the user: day start BM vs sunrise (13.1 vs 13.5); D3 remainder;
  E1 eclipse-time veto for group 7.
- New moon shows 18:49 (tithi end, moon card) and 18:50 (key dates, tradition card): two
  methods ~40 s apart (SPEC 11). Use one instant for both. Code: `src/core/panchang.ts`.
- P7 pilot: the user shares the link with 5–10 people and collects what confuses them;
  then the user picks the next backlog items (SPEC 10). Fix what the pilot reports first.
  plan: `.planning/PLAN.md` P7.
- Optional: find the uniform ~57 s Moon offset vs Drik (`npm run accuracy`; mypanchang agrees
  with us on tithi to 8 s). Inside the gate, so only if the user asks. rules: SPEC 4.11.

## Done Log

### 2026-10-14 (S14)
- Engine step 3: Dur Muhurtam, Varjyam, Amrit Kalam, lagna junctions, Baana, M1 (Adhika, combust), M2, M5, M6
- Clock approved: "Visa diena" list, "↺ Dabar" on the top bar, date picker, `2026-10-14, tr`, dev version tag
- Old sun dial, time list, Choghadiya list, P3 mockups, 3D prototype, `three` removed

### 2026-10-11 (S13)
- E1 eclipse rule: days around an eclipse seen here + its star (engine, tests 3 cities, clock labels)

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main` (only on the user's command); `.github/workflows/ci.yml` tests and
  publishes. Check: `gh run list --limit 1`. The dev server restarts itself on every commit
  (`vite.config.ts` liveVersion); the top bar shows the commit (dev only, `VersionTag.svelte`);
  the browser still needs F5 (the CSP blocks Vite's reload worker).
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
- Design research and the approved clock design: `mockups/research/` (the P3 mockups were
  retired in S14). Dev server sends `Cache-Control: no-store`.
- Combust (M1) reference: `node scripts/fetch-asta.ts <city> <shukra|guru> <year>` → Drik Graha
  Asta pages in `tests/fixtures/asta/` (12-hour times; the start is the last day still seen).
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

### Session 2026-10-14 (S14) — engine step 3 done (all SPEC 13 veto values), whole-day list, old UI retired

- **Done:** Dur Muhurtam (R10), Varjyam (R7), Amrit Kalam (R23), lagna junctions (D5, own ascendant), Baana (R19), month rules M1 Adhika + combust, M2, M5, M6 — each test-first vs Drik, 3 cities. Combust = Drik's visibility model (Sun depth at planet rise/set; thresholds in rules.md M1), 54/60 Drik edges.
- **Done:** Day screen: "Visa diena" list under the clock (tap → hand); one "↺ Dabar" on the top bar; tap the date → calendar; date `2026-10-14, tr`; dev-only version tag; dev server restarts on every commit.
- **Done:** old sun dial, time list, Choghadiya list, P3 mockups, 3D prototype and `three` removed.
- **Decided / overturned:** Drik's Dur Muhurtam / Varjyam tables over Raman / KP where they differ; Chaturmas = marriage only (user); Baana by time only; lagna junction ½ ghatika each side — examples 1, 2, 3, 5 fixed; Venus combust in Vilnius 09-04 → 10-31 overturns example 1's "not combust".
- **Code:** `src/core/{panchang,periods,types}.ts`, `src/ui/{DayClock,Day,VersionTag}.svelte`, `src/ui/{day,verdict,format}.ts`, `scripts/fetch-asta.ts`, `tests/{periods,asta}.test.ts`, fixtures `tests/fixtures/{drik,asta}`, `vite.config.ts`; planning: rules.md R7 R10 R19 R23 D5 M1 M2 M5 M6, SPEC 13.3, examples.md.
- **Entry point:** `npx vitest run tests/periods.test.ts tests/asta.test.ts`; app `npm run dev` (port 5174 this session).
- **Not measured:** Baana 17–126 s after Drik (3 min tolerance); Venus March 2025 inferior conjunction not reproduced; throttled-phone speed.

### Session 2026-10-11 (S13) — E1 eclipse rule built (engine step 3, first value)

- **Done:** Read [MC] 1.32–33 with the Piyushadhara commentary (DLI scan): set eclipsed → 3 days before; rises eclipsed → 3 after; seen whole → 3 before, day, 3 after; total → also 7 after; eclipse star 6/3/1 lunar months by grasa. Recorded in rules.md E1.
- **Done:** Engine: `DayPanchang.eclipses` (eclipses seen here, magnitude seen, rose/set, stars); periods `eclipse`, `eclipseDays`, `eclipseStar` (veto); removed from `MISSING`. 8 tests vs Drik eclipse pages, 3 cities; magnitude 0.836 vs Drik 0.84 (Vilnius), 0.186 vs 0.18 (NY). Clock labels EN+LT.
- **Decided / overturned:** model choices — the eclipse itself is a veto for all groups (group 7 open: eclipse time is traditionally for prayer); penumbral-only lunar eclipses not counted; magnitude ≥ 1 / ≥ 0.5 / less = whole / half / quarter. SPEC 13.3 and example 4 updated.
- **Code:** `src/core/{panchang,periods,types}.ts`, `src/ui/verdict.ts`, `src/content/{en,lt}.json`, `tests/periods.test.ts`; planning: rules.md E1, SPEC 13.3, examples.md example 4.
- **Entry point:** `npx vitest run tests/periods.test.ts`; app `npm run dev`, Vilnius 2026-10-06 (avoid until 19:47) and 2026-08-10.
- **Not measured:** user has not seen the clock with E1; cold computeDay 10 → 31 ms on desktop (throttled phone not measured).

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
