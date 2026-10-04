// One polite way to read drikpanchang.com for the fixture scripts (fetch-drik, fetch-ekadashi,
// fetch-parana). Drik answers ~150 quick requests with a reCAPTCHA page (2026-10-05), so:
// - every page is kept in .cache/drik/ — re-parsing or re-running never asks Drik again;
// - a run that stops half-way resumes: pages already kept are not fetched;
// - requests are spaced out (DRIK_DELAY_MS, default 12 s);
// - the first reCAPTCHA stops the run with a clear message instead of retrying.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const CACHE = '.cache/drik'
const DELAY = Number(process.env.DRIK_DELAY_MS ?? 12_000)
let last = 0

export class DrikBlocked extends Error {}

export async function drikPage(url: string): Promise<string> {
  const file = `${CACHE}/${createHash('sha1').update(url).digest('hex')}.html`
  if (existsSync(file)) return readFileSync(file, 'utf8')

  const wait = last + DELAY - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  last = Date.now()
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (VedaCal test fixtures)' }, redirect: 'manual' })
  const to = res.headers.get('location') ?? ''
  if (/recaptcha|\/qos\//i.test(to)) {
    throw new DrikBlocked(`Drik asked for a reCAPTCHA at ${url}. Stopped; pages fetched so far are kept in ${CACHE}/ — run again later.`)
  }
  if (res.status >= 300) throw new Error(`${url}: HTTP ${res.status}${to ? ` → ${to}` : ''}`)
  const html = await res.text()
  if (/recaptcha-challenge/i.test(html)) throw new DrikBlocked(`Drik answered ${url} with a reCAPTCHA page. Stopped; run again later.`)
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(file, html)
  return html
}
