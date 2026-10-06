// Mockup version — bump on every visible change so the viewer can tell which one they see.
export const MOCKUP_VERSION = 'v30'
export const MOCKUP_NOTE = 'v30: good time and a time to avoid cancel out where they overlap; v29: last night's Choghadiya before sunrise; v28: Yamaganda and Gulika rows, Choghadiya folded under them (layout A); v4 dashboard + real NASA moon photo; plain-English tithi line and Sanskrit name at one size; Moon sign on the moon card, Sun sign on the sun card; violet rest days in the month grid; eclipses, Sankranti and Guru/Ravi Pushya marks; month marks in one corner, two-column legend; labelled lunar-day bar; 24-hour sun dial; plain-English fact rows; About tab; no duplicates, tap-to-explain sheets; photo moons in month grid; Sanskrit same size as English; moon shadow survives browser auto-dark'

/** Small fixed badge: version + the time this page was loaded. */
export function versionBadge(): string {
  const loaded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `<div class="version" title="${MOCKUP_NOTE}">${MOCKUP_VERSION} · ${loaded}</div>`
}
