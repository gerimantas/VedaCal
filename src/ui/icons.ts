// Line icons shared by the app screens and the P3 mockups (SVG strings, rendered as HTML).

const stroke = (d: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

export const icon = {
  left: stroke('<path d="M15 5l-7 7 7 7"/>'),
  right: stroke('<path d="M9 5l7 7-7 7"/>'),
  pin: stroke('<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>', 18),
  down: stroke('<path d="M7 10l5 5 5-5"/>', 16),
  day: stroke('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  month: stroke('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  settings: stroke('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  about: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  search: stroke('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', 18),
  locate: stroke('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', 18),
  navigate: stroke('<path d="M3 11l18-8-8 18-2-8-8-2z"/>', 16),
  // Element tiles
  tithi: stroke('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', 22),
  vara: stroke('<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>', 22),
  nakshatra: stroke('<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>', 22),
  yoga: stroke('<path d="M12 20c-4-1.5-7-4.5-7.5-8 2.5 0 5 1.2 7.5 3.5C14.5 13.2 17 12 19.5 12c-.5 3.5-3.5 6.5-7.5 8z"/><path d="M12 15.5c-1.3-2.5-1.3-6 0-10.5 1.3 4.5 1.3 8 0 10.5z"/>', 22),
  karana: stroke('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>', 22),
  leaf: stroke('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l8-8"/>', 22),
  clock: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', 26),
  warn: stroke('<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.1"/>', 26),
  // A filled half sun on the horizon with rays; the arrow says which way it is going.
  sunrise: stroke('<path d="M6.5 19a5.5 5.5 0 0 1 11 0z" fill="currentColor"/><path d="M2 19h20M4.6 11.6l1.5 1.5M19.4 11.6l-1.5 1.5M2.5 15.5h1.6M19.9 15.5h1.6M12 10V3M9.5 5.5 12 3l2.5 2.5"/>', 28),
  sunset: stroke('<path d="M6.5 19a5.5 5.5 0 0 1 11 0z" fill="currentColor"/><path d="M2 19h20M4.6 11.6l1.5 1.5M19.4 11.6l-1.5 1.5M2.5 15.5h1.6M19.9 15.5h1.6M12 3v7M9.5 7.5 12 10l2.5-2.5"/>', 28),
  dawn: stroke('<path d="M3 18h18M6.5 14.5a5.5 5.5 0 0 1 11 0"/><path d="M12 6v2M5 9l1.4 1.4M19 9l-1.4 1.4"/>', 18),
  // Eclipse: the Sun's ring with the Moon's dark disc sliding over it.
  eclipse: stroke('<circle cx="12" cy="12" r="8"/><circle cx="13.5" cy="11" r="6.5" fill="currentColor" stroke="none"/>', 20),
  newMoon: stroke('<circle cx="12" cy="12" r="7.5"/>', 20),
  fullMoon: stroke('<circle cx="12" cy="12" r="7.5" fill="currentColor"/>', 20),
  season: stroke('<path d="M12 3v18M5 7l14 10M19 7L5 17"/>', 20),
}
