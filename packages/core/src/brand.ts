/**
 * The brand module (plan, Architecture invariant 12): the product name, its
 * domain and every piece of user-facing copy live here, so a rename touches
 * this file only.
 *
 * The product is "elapsed", always lowercase, at elapsed.io (owner decision,
 * 2026-11-16). Nothing else in the codebase spells the name out; it is read
 * from here (tooling/repository-text.test.ts checks the old placeholder is gone).
 *
 * Interface text is lowercase throughout (plan, Product summary); the tests
 * check every copy string.
 */

export const BRAND = {
  /** The product name, always lowercase. */
  name: 'elapsed',
  /** The product's domain. Not attached to the Worker until launch. */
  domain: 'elapsed.io',
  owner: {
    name: 'humanbn',
    url: 'https://humanbn.com',
  },
  copy: {
    meta: {
      description: 'a stopwatch for focused work',
    },
    timer: {
      start: 'start',
      pause: 'pause',
      resume: 'resume',
      end: 'end',
      pausedFor: 'paused for',
      /** The check-in frame. */
      checkIn: 'press any key if you’re still here',
      /** The "paused after a missed check-in" frame; {time} is the clock time the check-in appeared ("2:00 pm"). */
      missedCheckIn: 'a check-in went unanswered at {time}',
    },
    /** The session maximum frame; {hours} is the maximum in hours. */
    maximum: {
      heading: '{hours}-hour session max reached',
      /** For guests (owner decision, 2026-11-15); accounts (Release 3) get "has ended and been saved". */
      body: 'a single session can hold up to {hours} hours of focus. this one has ended; start a new one whenever you’re ready.',
      action: 'view results',
    },
    /** The ending countdown and results frames. */
    ending: {
      tabulating: 'tabulating results',
      cancel: 'cancel',
      endNow: 'end now',
    },
    results: {
      focused: 'focused',
      elapsed: 'elapsed',
      paused: 'paused',
      pauses: 'pauses',
      longestStretch: 'longest stretch',
      started: 'started',
      ended: 'ended',
      retry: 'retry',
      share: 'share',
      copied: 'copied',
      legendFocus: 'focus',
      legendPause: 'pause',
      ringLabel: 'clock replay: each ring is one hour, outside in, filled where you focused',
      stripLabel: 'focus strip: filled where you focused, blank where you paused',
      /** Hidden until accounts exist in Release 3 (owner decision, 2026-11-15). */
      invite: 'this session isn’t saved.',
      inviteLink: 'create an account',
      inviteAfter: 'to keep it.',
      /** The shared line (plan, Decisions > Results); {duration} reads like "2h 47m". */
      shareText: 'i studied for {duration} on {name}',
    },
    /** Tab titles. {time} is hh:mm; {name} is the product name (owner decision, 2026-11-15). */
    title: {
      idle: '{name}',
      running: '{time} · {name}',
      paused: 'paused for {time} · {name}',
      checkIn: 'check in · {time} · {name}',
    },
    modes: {
      digits: 'digits',
      ring: 'ring',
      timeline: 'timeline',
    },
    themes: {
      graphite: 'graphite',
      paper: 'paper',
      'deep-sea': 'deep sea',
      forest: 'forest',
      oxblood: 'oxblood',
      plum: 'plum',
      lilac: 'lilac',
      sky: 'sky',
      sand: 'sand',
      mint: 'mint',
    },
    icons: {
      settings: 'settings',
      account: 'account',
    },
    /** The built-in fonts' names in the settings font grid, each written in its own font. */
    fonts: {
      archivo: 'archivo',
      'barlow-semi-condensed': 'barlow semi condensed',
      saira: 'saira',
      inter: 'inter',
      'space-grotesk': 'space grotesk',
      sora: 'sora',
      manrope: 'manrope',
      outfit: 'outfit',
      'ibm-plex-sans': 'ibm plex sans',
      'jetbrains-mono': 'jetbrains mono',
      'ibm-plex-mono': 'ibm plex mono',
      'roboto-mono': 'roboto mono',
      'dm-mono': 'dm mono',
    },
    /** The settings panel (the five Release 1 settings frames). */
    settings: {
      title: 'settings',
      search: 'search settings',
      saved: 'saved',
      close: 'close',
      /** Phones: each category is its own page; this returns to the list. */
      back: 'back to settings',
      autosaved: 'changes are autosaved',
      /** Release 3, accounts only. */
      synced: 'synced to your account',
      noMatches: 'no settings match',
      categories: {
        timer: { name: 'timer', reset: 'reset timer settings' },
        display: { name: 'display', reset: 'reset display settings' },
        appearance: { name: 'appearance', reset: 'reset appearance settings' },
        notifications: { name: 'notifications', reset: 'reset notification settings' },
        privacy: { name: 'privacy and data', reset: 'reset privacy settings' },
      },
      seconds: { label: 'seconds', options: { 'blur-away': 'blur away', always: 'always', never: 'never' } },
      checkIn: { label: 'check-in every', help: 'a quiet prompt to confirm you’re still here' },
      pauseLimit: { label: 'pause limit', help: 'a longer pause ends the session' },
      shortcuts: { label: 'shortcuts', items: ['space · start or pause', 'e · end', ', · settings'] },
      mode: { label: 'display mode' },
      theme: { label: 'theme' },
      colors: { label: 'theme colors', background: 'background', foreground: 'foreground', accent: 'accent' },
      font: {
        label: 'font',
        loadOwn: 'load your own',
        own: 'your font',
        note: 'your own file: woff2, woff, ttf or otf, up to {size}. it stays on this device.',
        tooLarge: 'that file is over {size}. it was not loaded.',
        notFont: 'that file isn’t a woff2, woff, ttf or otf font. it was not loaded.',
        unusable: 'this browser couldn’t read that font. it was not loaded.',
      },
      timeSize: { label: 'time size' },
      clockFormat: { label: 'clock format', options: { '12h': '12-hour', '24h': '24-hour', region: 'follow region' } },
      notifyCheckIns: { label: 'check-ins', name: 'check-in notifications', help: 'a system notification when a check-in appears' },
      notifyPauseLimit: {
        label: 'pause limit',
        name: 'pause limit notifications',
        help: '{minutes} minutes before a pause would end the session',
      },
      notificationsNote: 'your device plays its own sound. on iPhone, notifications work only after adding {name} to the home screen.',
      notificationsBlocked: 'notifications are blocked for this site in the browser’s settings',
      usageCounts: { label: 'anonymous usage counts', help: 'tells us daily visits and sessions started. nothing that identifies you or this device' },
      crashReports: { label: 'crash reports', help: 'tells us error and browser version only. deleted after 14 days' },
      storage: { label: 'storage on this device', font: 'your font · {size}', none: 'nothing stored' },
      clear: { label: 'clear device data', action: 'clear', help: 'removes every setting, theme and file stored in this browser' },
      /** Footer links appear only once their page exists (href set); none exists yet. */
      links: [
        { label: 'about', href: null },
        { label: 'privacy', href: null },
        { label: 'terms', href: null },
        { label: 'feedback', href: null },
        { label: 'source code', href: null },
        { label: 'donate', href: null },
      ],
    },
    /** System notifications, when switched on. */
    notify: {
      checkIn: { title: 'check in', body: 'a check-in is waiting. answer it within the hour to keep this time.' },
      /** {time} is the clock time the pause would end the session. */
      pauseLimit: { title: 'pause limit', body: 'this session ends at {time} unless you resume.' },
    },
  },

} as const;

export type Brand = typeof BRAND;
