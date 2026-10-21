# VedaCal — CONTEXT

## Status
Live: everything through S17 (https://gerimantas.github.io/VedaCal/, cd4161b); nothing local.
S17 fixed what the user's review found (Archive S17); the user lists further fixes before
anyone else sees the app. View mode is an app-bar chip (`src/ui/ModeChip.svelte`); it only
changes the Day clock.
Periods work (`.planning/PLAN-periods.md`): the day clock (`src/ui/DayClock.svelte`) with
"Visa diena" under it; engine `src/core/periods.ts` has every SPEC 13.2 value and, since
S16, the personal layer (SPEC 13.6): Settings → "Mano duomenys" (kept only in
`localStorage`). Tara / Chandrabala follow MC 4.4, 4.11–13 (not
Drik's grading); personal faults are fallback, Chandrashtama and the birth tithi veto, the
birth month shown only. Ravi yoga cancels the elements' own faults (SPEC 13.4 step 0).
"Veto beats any +" is a model choice (SPEC 13.4), not a source rule — the user asked.
Rule: every product claim needs a source — all texts now carry one (`tradition` +
`traditionSource`, every meaning's `source`; `tests/content.test.ts`); records in
`.planning/research/rules.md` ("Meanings").
Open: E1's eclipse-time veto for group 7; SPEC day start BM (13.1) vs sunrise (13.5); D3
paksha-randhra remainder neutral or fallback.
Workflow: the user reviews on localhost (the dev server restarts itself on every commit;
the top bar shows the commit); show proposals before changing code; commit locally, push
only on the user's command.

## Next Tasks
- **Fix the app first** (user, 2026-10-21): it is not ready for other people to see and needs
  many fixes. Ask the user what to fix; collect the list before changing code.
- Personal view on Month (and Sky?): today only the Day clock uses birth data, though the
  chip shows on every screen. Ask the user whether the month should mark personal days.
- Personal layer, general form (SPEC 13.6, no birth data): which birth stars / signs the
  moment favours, Chandrashtama star — not built. Ask the user first whether it is wanted.
- Further 13.4 review (user asked, option 2 done only for Ravi yoga): other source-backed
  cancellations, e.g. KP C3 benefics in the rising sign — show a measured table before code.
- Open SPEC questions for the user: day start BM vs sunrise (13.1 vs 13.5); D3 remainder;
  E1 eclipse-time veto for group 7.
- New moon shows 18:49 (tithi end, moon card) and 18:50 (key dates, tradition card): two
  methods ~40 s apart (SPEC 11). Use one instant for both. Code: `src/core/panchang.ts`.
- Optional: find the uniform ~57 s Moon offset vs Drik (`npm run accuracy`; mypanchang agrees
  with us on tithi to 8 s). Inside the gate, so only if the user asks. rules: SPEC 4.11.
- P7 pilot (5–10 people try the app) — ON HOLD. Do not propose it until the user says the app
  is ready to show (user, 2026-10-21). plan: `.planning/PLAN.md` P7.

## Done Log

### 2026-10-21 (S17)
- View chip in the app bar; My data form logic; key dates layout + parvan names; glossary search
- Rainbow palette default; clock touch: swipe scrolls, tap / hold-drag moves the hand; deployed (cd4161b)

### 2026-10-14 (S16)
- Source audit: every meaning rewritten from a source and cited; days of restraint replace rest days
- Personal layer + "Mano duomenys" + "Man" switch; Ravi yoga cancels element faults; deployed (05db0b6)

### 2026-10-14 (S15)
- Engine: Hora, Anandadi, Tri/Dwi Pushkara, Sankranti, Panchaka, travel by direction — `MISSING` empty
- "Visa diena": hand's row framed; tap opens sourced reasons; all `tradition` texts sourced

## Key Facts
- Live: https://gerimantas.github.io/VedaCal/ · Repo: https://github.com/gerimantas/VedaCal (public)
- Deploy = push to `main` (only on the user's command); `.github/workflows/ci.yml` tests and
  publishes. Check: `gh run list --limit 1`. The dev server restarts itself on every commit
  (`vite.config.ts` liveVersion); the top bar shows the commit (dev only, `VersionTag.svelte`);
  the browser still needs F5 (the CSP blocks Vite's reload worker). An old service worker
  can serve a stale build (S17): Ctrl+F5, or in Playwright unregister it first. Check the
  user's real state in their Chrome (Claude in Chrome): settings live per device in
  `localStorage` (`vedacal.settings`, `.birth`, `.location`).
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
- **Every claim in product text needs a source** (user, 2026-10-14: "no LLM
  hallucinations"). Translate and simplify what `.planning/research/rules.md` records
  ([MC], Drik, [KP], [BS], [Raman]) and cite it; add nothing the source does not say. No
  source → no text (the name and level only), or say plainly "Drik practice, no classical
  source" / "model choice". Applies to `tradition`, `sheets` and every meaning in `content`.
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

### Session 2026-10-21 (S17) — fixes from the user's review; P7 pilot on hold; deployed (cd4161b)

- **Done:** app-bar view chip "Bendras" / "★ Asmeninis" on Day, Month, Sky (replaces the clock's "Man" switch; no birth data → Settings #/settings/mydata); My data form: date → place → time, place empty until chosen, Enter picks a city, "Nežinau" for the part of the day (star 0, sign/tithi/month only if constant all day), a line names what is missing; key dates: date first, title · Sanskrit on one line, one text size and colour, days of restraint show "Amavasya / Purnima parvan"; glossary search with suggestions like the city search; rainbow palette is the default; clock on touch: swipe scrolls, tap moves the hand, hold 450 ms then drag.
- **Decided / overturned:** P7 pilot on hold until the user says the app is ready; "Susilaikymo diena" kept (sources: Ap 2.1.1.4 fast, Manu 4.128 chastity, Manu 4.113 no study); Ap 2.1.1.7–9 refer to the wedding anniversary, not parvan days (rules.md H1); vite 8.3.5 (CI audit failed on 8.3.2).
- **Code:** `src/ui/ModeChip.svelte` (new), `glossary.ts` (new), `About.svelte`, `DayClock.svelte`, `LocationPicker.svelte`, `birth.ts`, `month.ts`, `Month.svelte`, `state.svelte.ts`, `screens.css`, `lt.json`/`en.json`, `tests/glossary.test.ts` (new), `tests/personal.test.ts`; `.planning/SPEC.md` 13.6, `research/rules.md` H1; `.ai-skills` session scripts check nested repos.
- **Entry point:** `npm run dev` → http://localhost:5173/VedaCal/; deploy = `git push` (CI).
- **Not measured:** real-phone scroll over the clock was tested by the user (works), not by a test; the personal view changes only the Day clock (Month and Sky do not use birth data).
- **Delegation:** 5 sonnet (mode chip, birth form, restraint-term research, glossary filter, glossary suggestions); inline: single-edit CSS/TS fixes and browser checks (exception: one tool call); DayClock touch handling written inline over several edits — violation.

### Session 2026-10-14 (S16) — every meaning sourced; personal layer built and live; Ravi yoga cancels element faults

- **Done:** all ~140 meanings rewritten from sources (MC 1.3 tithi lords, BS 98/100, MC 2.2–8, Monier-Williams for names), each with `source`, shown in sheets and glossary; rest days → days of restraint (new moon + day before, full moon; dharmasutras).
- **Done:** personal layer: `birthOf`, Tarabala, Chandrabala, Chandrashtama, birth tithi; Settings "My data" (year/month/day + hour/minute lists, place, Save, before/after-a-time pick) and the clock's "For me" switch. Matches Drik's lists on 49 days.
- **Done:** deployed twice (S9–S16 live at 05db0b6).
- **Decided / overturned:** tara cycles and 2/5/9 sign by MC 4.4, 4.11–13, not Drik's equal grading; bad taras and Moon 4/12 → fallback (MC 4.13 remedies), Chandrashtama the one personal veto; birth month shown only; Ravi yoga cancels the elements' own faults (13.4 step 0, option A); "veto beats any +" recorded as a model choice, not a source rule.
- **Code:** `src/core/periods.ts`, `src/core/panchang.ts`, `src/ui/birth.ts`, `src/ui/LocationPicker.svelte`, `src/ui/DayClock.svelte`, `src/ui/verdict.ts`, `src/ui/day.ts`, `src/content/*.json`, `tests/personal.test.ts`; records in `.planning/research/rules.md` (Meanings T1–CH1, P2), SPEC 4.8, 13.4, 13.6.
- **Entry point:** `npx vitest run tests/personal.test.ts`; app: Settings → Mano duomenys.
- **Not measured:** General form of the personal layer (13.6, no birth data) not built; real-phone city search only tested in emulation (user confirmed it works).

### Session 2026-10-14 (S15) — every SPEC 13.2 value built; every tradition text cites a source

- **Done:** Hora (R6/R22), Anandadi (R15, Abhijit incl.), Tri/Dwi Pushkara (R24, note), Sankranti window (R26), Panchaka (G3), travel by direction (Disha Shool, dawn, Godhuli, Nishita, Abhijit/Panchaka south) — each test-first vs Drik, 3 cities. `MISSING` is empty.
- **Done:** "Visa diena": hand's row framed + tagged (time or "Dabar"); tap opens why each period counts, with text and "Šaltinis: …".
- **Done:** all `tradition` texts rewritten from rules.md only (9 old ones had unsourced claims; Gulika's contradicted KP); new `traditionSource`, shown in list, glossary, eclipse sheet.
- **Decided / overturned:** no product claim without a source (user; CONTEXT Key Facts); travel needs a chosen direction (user, option A); Anandadi good/bad = Drik's marks; examples 1 and 5 shift: Hora and good Anandadi lift neutral → good.
- **Code:** `src/core/periods.ts`, `src/ui/{DayClock,About}.svelte`, `src/ui/{verdict,format,day,state.svelte}.ts`, `src/content/{en,lt}.json`, `src/styles/screens.css`, `tests/{periods,content}.test.ts`; planning: examples.md ex. 1, 5.
- **Entry point:** `npx vitest run tests/periods.test.ts tests/content.test.ts`; app `npm run dev`.
- **Not measured:** Godhuli within 5 min only (Drik starts it up to 5 min before sunset outside Aug–Nov, cause unknown); Sankranti instant: day ayanamsha vs mark's month-start one differ ~1 min.

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
