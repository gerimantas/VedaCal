// Security scan for runtime dependencies (see .planning/SPEC.md section 11).
// Rerun after every dependency change: `npm run scan`. Exits 1 on any finding.
//
// 1. No runtime package may declare an install-time script.
// 2. The unverified engine (panchangam-js: private source, no provenance) must contain no
//    network, code-execution, storage or obfuscated code. Known, reviewed exceptions are listed.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ENGINE = 'node_modules/@ishubhamx/panchangam-js/dist'
const RUNTIME = ['@ishubhamx/panchangam-js', 'astronomy-engine', 'luxon', '@fontsource-variable/fraunces', '@fontsource-variable/instrument-sans']
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall']

const PATTERNS = {
  network: /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|require\(['"](https?|net|tls|dgram|dns)['"]\)/,
  'code execution': /\beval\(|new Function\(|child_process|execSync|\bspawn\(/,
  'system or storage': /require\(['"](fs|os|crypto)['"]\)|process\.env|document\.cookie|localStorage|sessionStorage|indexedDB/,
  obfuscation: /[A-Za-z0-9+/=]{200,}|(\\x[0-9a-f]{2}){20,}/,
}
// Reviewed 2026-10-04: writes a kundli JSON file on explicit call; VedaCal never imports it.
const ALLOWED = [{ file: 'kundli/exporter.js', kind: 'system or storage' }]

const findings = []

for (const name of RUNTIME) {
  const pkg = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'))
  for (const hook of INSTALL_HOOKS) {
    if (pkg.scripts?.[hook]) findings.push(`${name}@${pkg.version}: install script "${hook}"`)
  }
}

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []
  })

const files = walk(ENGINE)
let lines = 0
for (const file of files) {
  const rel = file.slice(ENGINE.length + 1).replaceAll('\\', '/')
  const text = readFileSync(file, 'utf8').split('\n')
  lines += text.length
  text.forEach((line, i) => {
    if (line.length > 1000) findings.push(`${rel}:${i + 1}: line longer than 1000 chars (minified?)`)
    for (const [kind, re] of Object.entries(PATTERNS)) {
      if (re.test(line) && !ALLOWED.some((a) => a.file === rel && a.kind === kind)) {
        findings.push(`${rel}:${i + 1}: ${kind}: ${line.trim().slice(0, 100)}`)
      }
    }
  })
}

console.log(`Scanned ${files.length} files / ${lines} lines of panchangam-js; install hooks in ${RUNTIME.join(', ')}.`)
if (findings.length) {
  console.error(`${findings.length} finding(s):\n` + findings.join('\n'))
  process.exit(1)
}
console.log('No findings.')
