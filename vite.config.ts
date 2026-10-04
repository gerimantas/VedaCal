import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// astronomy-engine ships separate CJS and ESM builds. panchangam-js require()s the CJS one;
// importing the ESM one ourselves would create a second Observer class and the library
// rejects it ("Not an instance of the Observer class"). Force a single copy everywhere.
const astronomyEngine = fileURLToPath(
  new URL('./node_modules/astronomy-engine/astronomy.js', import.meta.url),
)

// Served from https://gerimantas.github.io/VedaCal/
export default defineConfig({
  base: '/VedaCal/',
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
