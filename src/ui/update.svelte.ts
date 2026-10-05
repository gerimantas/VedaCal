// New-version prompt (user, 2026-10-05). The service worker is registered here, from the
// bundle. The browser looks for a new version each time the app opens; when one has
// downloaded it waits, and the update bar offers to switch.
import { registerSW } from 'virtual:pwa-register'

export const update = $state({ ready: false })

const updateSW = registerSW({ onNeedRefresh: () => (update.ready = true) })

/** Switch to the waiting version and reload the page. */
export const applyUpdate = () => updateSW(true)
