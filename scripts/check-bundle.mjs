// After `npm run build`: the production bundle must not contain code we excluded on purpose
// (.planning/SPEC.md section 11) — Node's fs (panchangam-js kundli exporter) and the
// kundli, festival, planetary and dasha modules we never call. Exits 1 on a finding.
import { readFileSync, readdirSync } from 'node:fs'

const FORBIDDEN = {
  'Node fs / file writing': /writeFileSync|require\(["']fs["']\)/,
  'kundli exporter': /exportKundli/,
  'festival engine': /Kojagara Puja/,
  'planetary positions / dasha': /calculateVimshottariDasha|Vimshottari/,
}

const files = readdirSync('dist/assets').filter((f) => f.endsWith('.js'))
const findings = []
let bytes = 0
for (const f of files) {
  const js = readFileSync(`dist/assets/${f}`, 'utf8')
  bytes += js.length
  for (const [what, re] of Object.entries(FORBIDDEN)) if (re.test(js)) findings.push(`${f}: contains ${what}`)
}
console.log(`Checked ${files.length} bundle file(s), ${(bytes / 1024).toFixed(0)} KiB.`)
if (findings.length) {
  console.error(findings.join('\n'))
  process.exit(1)
}
console.log('No excluded code in the bundle.')
