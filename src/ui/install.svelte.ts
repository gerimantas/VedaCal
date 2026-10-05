// Install prompt (P6). Chrome and Edge fire `beforeinstallprompt` once, early, when the app
// is installable; we keep the event so Settings can offer an "Install" button. Safari has no
// such event — there the button never shows and people use Share → Add to Home Screen.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
export const install = $state({ available: false })

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    install.available = true
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    install.available = false
  })
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  // The event can be used only once; the browser fires a new one if it may ask again.
  deferred = null
  install.available = false
}
