// Mockup version — bump on every visible change so the viewer can tell which one they see.
export const MOCKUP_VERSION = 'v4'
export const MOCKUP_NOTE = 'dashboard direction (A): realistic moon, icon tiles, sun arc, green/red cards'

/** Small fixed badge: version + the time this page was loaded. */
export function versionBadge(): string {
  const loaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `<div class="version" title="${MOCKUP_NOTE}">${MOCKUP_VERSION} · ${loaded}</div>`
}
