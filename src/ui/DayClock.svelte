<script lang="ts">
  // Day clock (PLAN-periods Q7; approved mockup mockups/research/d7-clock.html, decisions in
  // PLAN-periods Q3): a 24-hour dial, 12 at the top, one turn = one day from the start of
  // Brahma Muhurta. The wide ring is the verdict (SPEC 13.4) for the chosen activity, its
  // edges blended; tap or drag anywhere to move the hand; the centre text steps away from it.
  import type { DayPanchang, Location } from '../core/types'
  import { tzOffsetMinutes } from '../core/time'
  import { t, time } from './format'
  import { app, setSetting } from './state.svelte'
  import type { Period } from '../core/periods'
  import { clockModel, colourVar, GROUP_LABELS, legendShades, levelWord, periodName, periodNote, periodWhy, ringOf, shadeOf, shadeWord, type Shade } from './verdict'

  // `picked`: the moment the hand was moved to, null = now; bound, so the top bar's Now resets it.
  let { day, prev, loc, now, picked = $bindable(null) }: { day: DayPanchang; prev: DayPanchang; loc: Location; now: Date; picked?: Date | null } = $props()

  const S = 400
  const c = S / 2
  const DAY = 86_400_000
  const MIN = 60_000

  const palette = $derived(app.settings.palette)
  const group = $derived(app.settings.activity)
  const model = $derived(clockModel(day, prev, group))
  let showInputs = $state(false)

  // ── Time ↔ angle: 12:00 at the top, clockwise, one turn per 24 hours (local clock time). ──
  const minuteOfDay = (d: Date) => (((d.getTime() / MIN + tzOffsetMinutes(loc.tz, d)) % 1440) + 1440) % 1440
  const ang = (d: Date) => ((minuteOfDay(d) - 720) / 1440) * 2 * Math.PI
  const pt = (d: Date, r: number) => [c + r * Math.sin(ang(d)), c - r * Math.cos(ang(d))] as const
  const ptAtMinute = (m: number, r: number) => {
    const a = ((m - 720) / 1440) * 2 * Math.PI
    return [c + r * Math.sin(a), c - r * Math.cos(a)] as const
  }
  function arc(a: Date, b: Date, r: number) {
    const [x1, y1] = pt(a, r)
    const [x2, y2] = pt(b, r)
    return `M${x1},${y1} A${r},${r} 0 ${b.getTime() - a.getTime() > DAY / 2 ? 1 : 0} 1 ${x2},${y2}`
  }

  // The dial shows 24 hours from the window's start; the rest of the night is in the readout only.
  const T0 = $derived(model?.window.start ?? day.sunrise ?? new Date())
  const T1 = $derived(new Date(T0.getTime() + DAY))
  const clip = (a: Date, b: Date) => ({ a: a < T0 ? T0 : a, b: b > T1 ? T1 : b })
  /** The moment on this dial that shows the same clock time as `d`. */
  const onDial = (d: Date) => new Date(T0.getTime() + ((((minuteOfDay(d) - minuteOfDay(T0)) % 1440) + 1440) % 1440) * MIN)

  // ── Geometry (viewBox units) ──
  const rNum = c - 15
  const rBand = c - 34
  const bandW = 12
  const outer = rBand + bandW / 2
  const rVer = rBand - bandW / 2 - 15
  const verW = 26
  const rIn = [rVer - verW / 2 - 6, rVer - verW / 2 - 13, rVer - verW / 2 - 20]
  const inW = 5.5
  const rFree = $derived(showInputs ? rIn[2] - inW / 2 - 7 : rVer - verW / 2 - 8)

  const ticks = Array.from({ length: 144 }, (_, k) => {
    const len = k % 6 === 0 ? bandW : k % 3 === 0 ? bandW * 0.6 : bandW * 0.3
    const [x1, y1] = ptAtMinute(k * 10, outer)
    const [x2, y2] = ptAtMinute(k * 10, outer - len)
    return { x1, y1, x2, y2, w: k % 6 === 0 ? (k % 36 === 0 ? 2.4 : 1.5) : 0.8, o: k % 6 === 0 ? 0.9 : 0.5 }
  })
  const numerals = Array.from({ length: 24 }, (_, h) => {
    const [x, y] = ptAtMinute(h * 60, rNum)
    return { x, y, h: String(h).padStart(2, '0'), big: h % 6 === 0 }
  })

  // ── Cursor: the hand. Today it starts at now; other days at the same clock time. ──
  $effect(() => {
    void day.date
    picked = null
  })
  const cursor = $derived(picked ?? onDial(now))
  const nowOnDial = $derived(now >= T0 && now < T1 ? now : null)
  const seg = $derived(model?.segments.find((s) => s.start <= cursor && cursor < s.end) ?? model?.segments[0])
  const shade = $derived<Shade>(seg ? shadeOf(seg) : 'neutral')
  const active = $derived(model?.periods.filter((p) => p.start <= cursor && cursor < p.end) ?? [])

  let svg = $state<SVGSVGElement>()
  function pick(ev: PointerEvent) {
    if (!svg) return
    const b = svg.getBoundingClientRect()
    const x = ((ev.clientX - b.left) / b.width) * S - c
    const y = ((ev.clientY - b.top) / b.height) * S - c
    const m = (720 + (Math.atan2(x, -y) / (2 * Math.PI)) * 1440 + 1440) % 1440
    picked = new Date(T0.getTime() + ((((m - minuteOfDay(T0)) % 1440) + 1440) % 1440) * MIN)
  }

  // ── Verdict ring: one conic gradient on a canvas, edges blended over up to 20 minutes. ──
  const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  function rgbOf(colour: string, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = colour
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  const FADE = 20 * MIN
  const ring = $derived.by(() => {
    void app.settings.theme
    if (!model || typeof document === 'undefined') return null
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const k = 3
    const cv = Object.assign(document.createElement('canvas'), { width: S * k, height: S * k })
    const g = cv.getContext('2d')
    if (!probe || !g || !('createConicGradient' in g)) return null
    const rgb = new Map<Shade, number[]>()
    for (const s of ['best', 'good', 'neutral', 'fb', 'avoid'] as Shade[]) rgb.set(s, rgbOf(css(colourVar(s, palette)), probe))
    const segs = model.segments
    const mix = (a: number[], b: number[], f: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`
    const soft = (t: Date) => {
      const i = Math.max(0, segs.findIndex((s) => s.start <= t && t < s.end))
      const s = segs[i]
      const fade = Math.min(FADE, (s.end.getTime() - s.start.getTime()) / 2)
      const dl = t.getTime() - s.start.getTime()
      const dr = s.end.getTime() - t.getTime()
      const own = rgb.get(shadeOf(s))!
      if (segs[i - 1] && dl < fade) return mix(own, rgb.get(shadeOf(segs[i - 1]))!, 0.5 * (1 - dl / fade))
      if (segs[i + 1] && dr < fade) return mix(own, rgb.get(shadeOf(segs[i + 1]))!, 0.5 * (1 - dr / fade))
      return mix(own, own, 0)
    }
    const grad = g.createConicGradient(ang(T0) - Math.PI / 2, c * k, c * k)
    for (let m = 0; m <= 1440; m += 2) grad.addColorStop(m / 1440, soft(new Date(T0.getTime() + Math.min(m, 1439.5) * MIN)))
    g.strokeStyle = grad
    g.lineWidth = verW * k
    g.beginPath()
    g.arc(c * k, c * k, rVer * k, 0, 2 * Math.PI)
    g.stroke()
    return cv.toDataURL()
  })

  // Thin rings: fixed windows (decide), the day base (decides), Choghadiya (shown only).
  const inner = $derived(
    showInputs && model
      ? model.periods
          .map((p) => ({ p, ring: ringOf(p), ...clip(p.start, p.end) }))
          .filter((x) => x.ring !== null && x.a < x.b)
          .map((x) => ({ d: arc(x.a, x.b, rIn[x.ring!]), colour: `var(${colourVar(x.p.level, palette)})`, opacity: !x.p.decides ? (x.p.kind === 'gulika' ? 0.3 : 0.5) : 0.95 }))
      : [],
  )

  // ── Centre text: the time; under it the verdict icon and the part's span. It sits below the
  // hub while the hand points up and above it while the hand points down, never on the hand. ──
  const span = $derived(seg ? `${time(seg.start, loc)}–${time(seg.end, loc)}` : '')
  const label = $derived.by(() => {
    const a = ang(cursor)
    const FT = 36, FL = 20, GAP = 13
    const timeText = time(cursor, loc)
    let k = 1
    let box = { w: 0, h: 0, top: 0, lineY: 0, iz: 0, gap: 0 }
    for (let i = 0; i < 3; i++) {
      const ft = FT * k, fl = FL * k
      const iz = fl * 1.3, gap = fl * 0.4
      const lineW = iz + gap + span.length * fl * 0.56
      const timeW = timeText.length * ft * 0.56
      const lineY = ft * 0.86
      box = { w: Math.max(lineW, timeW), h: ft * 0.74 + lineY + fl * 0.3, top: -ft * 0.74, lineY, iz, gap }
      const far = Math.hypot(box.w / 2, GAP + box.h)
      if (far <= rFree) break
      k *= rFree / far
    }
    const up = Math.cos(a) > 0
    const y0 = up ? c + GAP - box.top : c - GAP - (box.top + box.h) // baseline of the time line
    const lineW = box.iz + box.gap + span.length * FL * k * 0.56
    const left = c - lineW / 2
    return { k, y0, timeText, lineY: y0 + box.lineY, iconX: left, iconY: y0 + box.lineY - FL * k * 0.36 - box.iz / 2, iz: box.iz, textX: left + box.iz + box.gap, ft: FT * k, fl: FL * k }
  })

  // ── The whole day as a list (user, 2026-10-14): neighbouring parts of one colour as one row,
  // with everything that decided them; a tap moves the hand there and brings the dial into view. ──
  // A tap also opens the row: each period that decided it, with what tradition does then (user,
  // 2026-10-14, variant A). The row under the hand is framed in its colour and tagged with the
  // hand's time, or "Now" while the hand is on the real time (user, 2026-10-14).
  type Row = { start: Date; end: Date; shade: Shade; why: Period[] }
  const rows = $derived.by(() => {
    const out: Row[] = []
    for (const s of model?.segments ?? []) {
      const named = s.by.filter((p) => p.kind !== 'base')
      const why = named.length ? named : s.by
      const last = out[out.length - 1]
      const add = (r: Row) => {
        for (const p of why) if (!r.why.some((q) => periodName(q) === periodName(p))) r.why.push(p)
      }
      if (last && last.shade === shadeOf(s)) {
        last.end = s.end
        add(last)
      } else {
        const r: Row = { start: s.start, end: s.end, shade: shadeOf(s), why: [] }
        add(r)
        out.push(r)
      }
    }
    return out
  })
  /** The short label in the row: the base goes by "day base" there, its full name in the opened row. */
  const rowNames = (r: Row) => [...new Set(r.why.map((p) => (p.kind === 'base' ? t('segmentBase') : periodName(p))))]
  const handTag = $derived(picked === null && nowOnDial ? t('now') : time(cursor, loc))
  let open = $state<number | null>(null)
  $effect(() => {
    void day.date
    open = null
  })
  function jump(r: Row) {
    picked = r.start
    open = open === r.start.getTime() ? null : r.start.getTime()
  }

  const handLen = outer - 2
  const handDeg = $derived((ang(cursor) * 180) / Math.PI)
  const outlineD = $derived(seg ? (({ a, b }) => (a < b ? arc(a, b, rVer + verW / 2 + 1.5) : ''))(clip(seg.start, seg.end)) : '')
</script>

{#snippet verdictIcon(s: Shade)}
  {@const f = `var(${colourVar(s, palette)})`}
  {#if s === 'best' && palette === 'rainbow'}
    <path d="M12 1.2l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.3l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9Z" style:fill={f} style:stroke={f} stroke-width="1.2" stroke-linejoin="round" />
  {:else if s === 'good' || s === 'best'}
    <circle cx="12" cy="12" r="11" style:fill={f} />
    <path d="M6.6 12.4l3.6 3.6 7.2-7.8" class="glyph" />
  {:else if s === 'neutral'}
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" style:fill={f} />
    <path d="M7 12h10" class="glyph" />
  {:else if s === 'fb'}
    <path d="M12 2.2L22.6 21H1.4Z" style:fill={f} style:stroke={f} stroke-width="1.6" stroke-linejoin="round" />
    <path d="M12 9v5.4" class="glyph" />
    <circle cx="12" cy="17.6" r="1.5" class="dot" />
  {:else}
    <path d="M16.4 1.4L22.6 7.6V16.4L16.4 22.6H7.6L1.4 16.4V7.6L7.6 1.4Z" style:fill={f} />
    <path d="M8.3 8.3l7.4 7.4M15.7 8.3l-7.4 7.4" class="glyph" />
  {/if}
{/snippet}

{#if model}
  <section class="card dayclock" aria-labelledby="s-clock">
    <h2 id="s-clock">{t('clockTitle')}</h2>
    <label class="activity">
      <span>{t('activity')}</span>
      <select value={group} onchange={(e) => setSetting('activity', Number(e.currentTarget.value))}>
        {#each GROUP_LABELS as name, g (g)}<option value={g}>{name}</option>{/each}
      </select>
    </label>

    <svg
      bind:this={svg}
      viewBox="0 0 {S} {S}"
      class="dial"
      role="img"
      aria-label={t('clockAria')}
      onpointerdown={(e) => {
        pick(e)
        svg?.setPointerCapture(e.pointerId)
      }}
      onpointermove={(e) => e.buttons && pick(e)}
    >
      <circle cx={c} cy={c} r={c - 1} class="face" />
      <!-- Chapter ring: night dark, day gold; 10-minute ticks on it. -->
      <circle cx={c} cy={c} r={rBand} class="night" stroke-width={bandW} />
      <path d={arc(model.sunrise, model.sunset, rBand)} class="daylight" stroke-width={bandW} />
      {#each ticks as k, i (i)}<line x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke-width={k.w} opacity={k.o} class="tick" />{/each}
      {#each numerals as n (n.h)}<text x={n.x} y={n.y} class="numeral" class:big={n.big}>{n.h}</text>{/each}

      {#if ring}<image href={ring} x="0" y="0" width={S} height={S} />{/if}
      {#each inner as r, i (i)}<path d={r.d} fill="none" style:stroke={r.colour} stroke-width={inW} opacity={r.opacity} />{/each}

      <!-- Sun marks: sunrise (arrow up), solar noon (rays), sunset (arrow down). -->
      {#each [[model.sunrise, '↑'], [model.noon, ''], [model.sunset, '↓']] as const as [d, arrow] (arrow)}
        {@const [x, y] = pt(d, rBand)}
        {#if !arrow}
          {#each Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4) as a (a)}
            <line x1={x + 7.5 * Math.cos(a)} y1={y + 7.5 * Math.sin(a)} x2={x + 10.5 * Math.cos(a)} y2={y + 10.5 * Math.sin(a)} class="ray" />
          {/each}
        {/if}
        <circle cx={x} cy={y} r="6.5" class="sun" />
        {#if arrow}<text {x} {y} class="sun-arrow">{arrow}</text>{/if}
      {/each}

      {#if outlineD}<path d={outlineD} class="outline" />{/if}
      {#if nowOnDial}
        {@const [nx, ny] = pt(nowOnDial, outer + 3)}
        <circle cx={nx} cy={ny} r="3" class="now" />
      {/if}

      <g transform="rotate({handDeg} {c} {c})">
        <path d="M{c - 3.4},{c} L{c - 1.1},{c - handLen} L{c + 1.1},{c - handLen} L{c + 3.4},{c} Z" class="hand" />
      </g>
      <circle cx={c} cy={c} r="6.5" class="hub" />
      <circle cx={c} cy={c} r="2.4" class="face" />

      <text x={c} y={label.y0} class="c-time" font-size={label.ft}>{label.timeText}</text>
      <svg x={label.iconX} y={label.iconY} width={label.iz} height={label.iz} viewBox="0 0 24 24" overflow="visible">{@render verdictIcon(shade)}</svg>
      <text x={label.textX} y={label.lineY} class="c-span" font-size={label.fl} style:fill="var({colourVar(shade, palette)})">{span}</text>
    </svg>

    <ul class="legend">
      {#each legendShades(palette) as s (s)}
        <li><svg viewBox="0 0 24 24" aria-hidden="true">{@render verdictIcon(s)}</svg>{shadeWord(s, palette)}</li>
      {/each}
    </ul>
    <p class="sunkey num">↑ {t('sunrise')} {time(model.sunrise, loc)} · ☀ {t('solarNoon')} {time(model.noon, loc)} · ↓ {t('sunset')} {time(model.sunset, loc)}</p>

    <button class="disclose" aria-expanded={showInputs} onclick={() => (showInputs = !showInputs)}>
      <span class="mk">{showInputs ? '−' : '+'}</span>{showInputs ? t('clockHideRings') : t('clockShowRings')}
    </button>
    {#if showInputs}
      <ul class="ringkey">
        <li>{t('ringFixed')}</li>
        <li>{t('ringBase')}</li>
        <li>{t('ringChoghadiya')}</li>
      </ul>
    {/if}

    <div class="readout" aria-live="polite">
      <p class="head">
        <svg viewBox="0 0 24 24" aria-hidden="true">{@render verdictIcon(shade)}</svg>
        <b class="num" style:color="var({colourVar(shade, palette)})">{time(cursor, loc)} · {shadeWord(shade, palette)}</b>
        <span class="quiet">({GROUP_LABELS[group]})</span>
      </p>
      <ul>
        {#each active as p (p)}
          <li>
            {periodName(p)} — {levelWord(p)}{#if periodNote(p)}<span class="quiet"> · {periodNote(p)}</span>{/if}{#if seg?.by.includes(p)}
              <b> ← {t('decides')}</b>{/if}
          </li>
        {/each}
      </ul>
    </div>

    <h3 class="daylist-head">{t('clockDayList')}</h3>
    <ol class="daylist">
      {#each rows as r (r.start.getTime())}
        {@const isHand = r.start <= cursor && cursor < r.end}
        {@const isOpen = open === r.start.getTime()}
        <li class:current={isHand} style:--row="var({colourVar(r.shade, palette)})">
          <button onclick={() => jump(r)} aria-expanded={isOpen}>
            <span class="num when">{time(r.start, loc)}–{time(r.end, loc)}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">{@render verdictIcon(r.shade)}</svg>
            <span
              >{#if isHand}<span class="nowtag num">{handTag}</span>{/if}<b style:color="var(--row)">{shadeWord(r.shade, palette)}</b>{#if r.why.length}<span class="why"
                  >{' · '}{rowNames(r).join(', ')}</span
                >{/if}</span
            >
          </button>
          {#if isOpen && r.why.length}
            <ul class="detail">
              {#each r.why as p (p)}
                {@const w = periodWhy(p)}
                <li>
                  <b>{periodName(p)}</b><span class="quiet"> · {levelWord(p)}</span>
                  {#if w.text}<p>{w.text}</p>{/if}
                  {#if w.source}<p class="src">{t('source')}: {w.source}</p>{/if}
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="quiet missing">{t('clockMissing')}</p>
  </section>
{/if}

<style>
  /* Same section frame and heading as the sun arc (.arcbox). */
  .dayclock {
    margin-top: var(--space-sm);
    padding: var(--space-sm) 0 var(--space-xs);
  }
  .dayclock h2 {
    font-size: var(--text-base);
    font-weight: 650;
    margin: 0 0 var(--space-xs);
  }
  .activity {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--color-muted);
  }
  .activity select {
    min-width: 0;
    font: inherit;
    color: var(--color-ink);
    padding: 0.35rem 0.5rem;
    border: var(--rule-hair) solid var(--color-rule);
    border-radius: 3px;
    background: var(--color-card);
  }
  .dial {
    display: block;
    width: 100%;
    max-width: 440px;
    margin: var(--space-xs) auto 0;
    touch-action: none;
    user-select: none;
  }
  .face {
    fill: var(--color-card);
  }
  .night {
    fill: none;
    stroke: var(--color-ink);
    opacity: 0.16;
  }
  .daylight {
    fill: none;
    stroke: var(--color-sun);
    opacity: 0.55;
  }
  .tick {
    stroke: var(--color-ink);
  }
  .numeral {
    fill: var(--color-muted);
    font-size: 14.5px;
    font-weight: 500;
    text-anchor: middle;
    dominant-baseline: central;
    font-variant-numeric: tabular-nums;
  }
  .numeral.big {
    fill: var(--color-ink);
    font-size: 18px;
    font-weight: 650;
  }
  .ray {
    stroke: var(--color-sun);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .sun {
    fill: var(--color-sun);
    stroke: var(--color-card);
    stroke-width: 1.5;
  }
  .sun-arrow {
    fill: var(--color-card);
    font-size: 9.5px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
  }
  .outline {
    fill: none;
    stroke: var(--color-ink);
    stroke-width: 2;
  }
  .now,
  .hub,
  .hand {
    fill: var(--color-ink);
  }
  .hand {
    opacity: 0.85;
  }
  .c-time,
  .c-span {
    paint-order: stroke;
    stroke: var(--color-card);
    stroke-width: 5px;
    stroke-linejoin: round;
    font-variant-numeric: tabular-nums;
  }
  .c-time {
    fill: var(--color-ink);
    font-weight: 500;
    text-anchor: middle;
  }
  .c-span {
    font-weight: 600;
  }
  .glyph {
    fill: none;
    stroke: var(--color-card);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .dot {
    fill: var(--color-card);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-3xs) var(--space-sm);
    margin: var(--space-2xs) 0 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .legend svg,
  .readout .head svg {
    width: 1rem;
    height: 1rem;
    vertical-align: -0.2rem;
    margin-right: 4px;
  }
  .sunkey {
    text-align: center;
    font-size: var(--text-xs);
    color: var(--color-muted);
    margin: var(--space-3xs) 0 0;
  }
  .disclose {
    display: block;
    margin: var(--space-xs) auto 0;
    font: inherit;
    font-size: var(--text-sm);
    color: var(--color-ink);
    background: none;
    border: 0;
    padding: 0.25rem 0;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--color-rule);
    text-underline-offset: 4px;
  }
  .disclose .mk {
    display: inline-block;
    width: 1em;
    font-weight: 600;
  }
  .ringkey {
    font-size: var(--text-sm);
    margin: var(--space-xs) 0 0;
    padding-left: 1.1rem;
  }
  .readout {
    margin-top: var(--space-sm);
    font-size: var(--text-sm);
  }
  .readout .head {
    margin: 0;
  }
  .readout ul {
    margin: var(--space-3xs) 0 0;
    padding-left: 1rem;
  }
  .daylist-head {
    margin: var(--space-sm) 0 var(--space-3xs);
    font-size: var(--text-sm);
    font-weight: 650;
  }
  /* One grid for all rows (subgrid), so the times line up down the list. */
  .daylist {
    display: grid;
    grid-template-columns: auto 1rem 1fr;
    column-gap: var(--space-2xs);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }
  .daylist > li {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }
  .daylist button {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    align-items: start;
    width: 100%;
    padding: var(--space-3xs) var(--space-2xs);
    border: 0;
    border-radius: var(--radius-sm, 6px);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .daylist button:hover {
    background: var(--color-paper-3);
  }
  .daylist svg {
    width: 1rem;
    height: 1rem;
    margin-top: 0.1rem;
  }
  .daylist .why {
    color: var(--color-muted);
  }
  /* The hand's row: framed in its own colour. */
  .daylist .current button {
    box-shadow: inset 0 0 0 2px var(--row);
  }
  .nowtag {
    display: inline-block;
    margin-right: var(--space-2xs);
    padding: 0 0.4em;
    border-radius: 999px;
    background: var(--row);
    color: var(--color-paper);
    font-size: var(--text-xs);
    font-weight: 700;
    line-height: 1.5;
    vertical-align: 0.1em;
  }
  .detail {
    grid-column: 3 / -1;
    margin: var(--space-3xs) 0 var(--space-xs);
    padding: 0;
    list-style: none;
  }
  .detail li + li {
    margin-top: var(--space-2xs);
  }
  .detail p {
    margin: 0.1rem 0 0;
    color: var(--color-muted);
  }
  .detail .src {
    font-size: var(--text-xs);
    font-style: italic;
  }
  .quiet {
    color: var(--color-muted);
  }
  .missing {
    font-size: var(--text-xs);
    margin-top: var(--space-sm);
  }
</style>
