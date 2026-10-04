import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// astronomy-engine ships separate CJS and ESM builds. panchangam-js require()s the CJS one;
// importing the ESM one ourselves would create a second Observer class and the library
// rejects it ("Not an instance of the Observer class"). Force a single copy everywhere.
const astronomyEngine = fileURLToPath(
  new URL('./node_modules/astronomy-engine/astronomy.js', import.meta.url),
)

// Version shown in the app: package version + git commit + build time.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

// Served from https://gerimantas.github.io/VedaCal/
export default defineConfig({
  base: '/VedaCal/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  // Dev server: tell the browser never to reuse an old copy of any file.
  server: { headers: { 'Cache-Control': 'no-store' } },
  // The city list (src/data/cities.json, ~1.6 MB, 0.8 MB gzipped) is its own chunk on
  // purpose, loaded only when the location screen opens; everything else stays far below.
  build: { chunkSizeWarningLimit: 1800 },
  resolve: {
    alias: { 'astronomy-engine': astronomyEngine },
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // external registerSW.js — no inline script, so the CSP stays strict
      manifest: {
        name: 'VedaCal',
        short_name: 'VedaCal',
        description: 'The traditional lunar calendar, in plain words.',
        theme_color: '#0B0E14',
        background_color: '#0B0E14',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    // Let Vite process panchangam-js so its require('astronomy-engine') goes through the alias.
    server: { deps: { inline: ['@ishubhamx/panchangam-js'] } },
  },
})
