// P3 mockup — Day screen (SPEC 5.1), filled live from the calculation core.
// v4 "dashboard" direction (user's reference image): framed hero with a realistic moon,
// 24-hour sun dial with its calm/good/avoid rows, plain-English day-fact rows. Anything
// marked data-sheet opens its explanation (mockups/common.ts). Every value comes from
// src/ui/day.ts, the same view the app's Day.svelte renders.
import { computeDay } from '../src/core/panchang'
import { zonedTimeToUtc } from '../src/core/time'
import { dayView, nowHtml, type Fact, type SignLine } from '../src/ui/day'
import { t } from '../src/ui/format'
import { realisticMoon } from '../src/ui/moon'
import { date, icon, link, mount, params, tabs, terms, today, vilnius as loc } from './common'

const day = computeDay(date, loc)

// ?at=HH:MM shows the screen as it looks at that local time (mockup only).
const at = params.get('at')?.split(':').map(Number)
const [yy, mm, dd] = date.split('-').map(Number)
const now = at
  ? zonedTimeToUtc(loc.tz, yy, mm, dd, at[0], at[1] ?? 0)
  : date === today
    ? new Date()
    : (day.sunrise ?? new Date(`${date}T12:00:00Z`))

const v = dayView(day, loc, now)

const fact = (f: Fact) =>
  `<li class="fact" data-sheet="${f.term}">${f.icon}<div><span class="label">${f.label}</span><strong>${f.value}</strong><span class="sk">${f.sanskrit}</span>${f.next ? `<span class="next">${f.next}</span>` : ''}</div>${f.right ? `<span class="right num">${f.right}</span>` : ''}</li>`

// "12:44–13:29"; breaks only at the dash, never inside a time (matters with 12-hour clocks).
const windowRows = v.windows
  .map(
    (w) =>
      `<li class="win ${w.kind}${w.start ? '' : ' none'}" data-sheet="${w.term}"><i aria-hidden="true"${w.split ? ` class="split" style="--from:${w.split[0] * 100}%;--to:${w.split[1] * 100}%"` : ''}></i><div><b>${w.name}</b><span class="sk">${w.sanskrit}</span>${w.overlap ? `<small class="overlap num">${w.overlap}</small>` : ''}</div><span class="when num">${w.start ? `<span class="nw">${w.start}–</span><span class="nw">${w.end}</span>` : w.none}</span></li>`,
  )
  .join('')
// Choghadiya, folded under the window rows (user chose layout A, 2026-10-06).
const cn = v.choghadiyaNow
const chogList = (part: 'before' | 'day' | 'night', head: string) =>
  !v.choghadiya.some((c) => c.part === part) ? '' :
  `<p class="chog-head">${head}</p><ul class="chog-list">${v.choghadiya
    .filter((c) => c.part === part)
    .map((c) => `<li class="chog-row ${c.rating}${c.current ? ' current' : ''}" data-sheet="choghadiya"><i aria-hidden="true"></i><div><b>${c.name}</b><span class="sk">${c.sanskrit}</span></div><span class="when num"><span class="nw">${c.start}–</span><span class="nw">${c.end}</span></span></li>`)
    .join('')}</ul>`
const chog = v.choghadiya.length
  ? `<details class="more chog"><summary><span><span class="chog-title">${terms.choghadiya[0]} · <span class="sk">Choghadiya</span></span>${cn ? `<span class="chog-now ${cn.rating}">${t('now')}: <b>${cn.name}</b> · <span class="sk">${cn.sanskrit}</span></span>` : ''}</span>${icon.down}</summary>${chogList('before', t('untilSunrise'))}${chogList('day', `${t('sunrise')} → ${t('sunset')}`)}${chogList('night', `${t('sunset')} → ${t('sunrise')}`)}</details>`
  : ''
const sign = (s: SignLine) =>
  `<p class="sign" data-sheet="rashi"><span>${s.text} · <span class="sk">${s.sanskrit}</span></span><small class="num">${s.until}${s.next ? `, ${s.next}` : ''}</small></p>`
const nowWindow = nowHtml(v.nowWindows)
const tradition = v.tradition ? `<div class="head">${icon.leaf}<h3>${v.tradition.title}</h3></div><p>${v.tradition.meaning}</p>` : ''

mount(`
<main class="screen">
  <header class="appbar">
    <a class="chip" href="${link('location.html')}">${icon.navigate}<span>${loc.name}, LT</span></a>
    <div class="datechip">
      <button aria-label="${t('previousDay')}">${icon.left}</button>
      <span class="num">${v.shortDate}</span>
      <button aria-label="${t('nextDay')}">${icon.right}</button>
    </div>
  </header>
  ${date !== today ? `<a class="today-link" href="${link('day.html').replace(/date=[^&]*&?/, '')}">${t('today')} →</a>` : ''}

  <section class="hero" aria-label="${v.tithi.name}" data-sheet="tithi">
    ${realisticMoon(v.moon.illumination, v.moon.waxing, 150, v.moon.label)}
    <h2>${v.tithi.title}</h2>
    <p class="sub num"><b>${v.tithi.name}</b> · ${t('percentLit', { percent: v.tithi.percent })}</p>
    ${sign(v.moonSign)}
    <div class="track" aria-hidden="true"><span style="width:${(v.tithi.progress * 100).toFixed(1)}%"></span></div>
    <p class="track-label num">${v.tithi.ends}</p>
    <p class="meaning">${v.tithi.meaning}</p>
  </section>

  <section class="card arcbox" aria-labelledby="s-sun">
    <h2 id="s-sun">${t('sectionRhythm')}</h2>
    <div class="arcwrap">
      <div class="dial-wrap">
        ${v.dial}
        <div class="dial-center">${nowWindow}${v.next ? `<small>${v.next.label}</small><b class="num">${v.next.in}</b>` : ''}</div>
      </div>
    </div>
    ${sign(v.sunSign)}
    <ul class="wins">${windowRows}</ul>
    ${chog}
  </section>

  <div class="card facts">
    <ul>${v.facts.map(fact).join('')}</ul>
    <details class="more"><summary>${t('moreDetails')}${icon.down}</summary><ul>${v.moreFacts.map(fact).join('')}</ul></details>
  </div>

  ${tradition ? `<section class="card tradition" aria-label="${t('sectionTradition')}" data-sheet="rhythm">${tradition}</section>` : ''}

</main>
${tabs('day')}
`)
