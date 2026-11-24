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

/** The public source repository (owner changes, 2026-11-16). */
export const REPOSITORY = 'https://github.com/elapsed-io/elapsed';
/** The site's public address, and its public support address (owner, 2026-11-16). */
export const SITE = 'https://elapsed.io';
export const SUPPORT = 'support@elapsed.io';

export const BRAND = {
  /** The product name, always lowercase. */
  name: 'elapsed',
  /** The product's domain. Not attached to the Worker until launch. */
  domain: 'elapsed.io',
  owner: {
    name: 'humanbn',
    url: 'https://humanbn.com',
  },
  repository: REPOSITORY,
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
      /**
       * The time as a screen reader reads it on request (Tab to it, or read
       * the page): words, not digits. Never announced on its own.
       */
      spoken: {
        focused: '{time} focused',
        pausedFor: 'paused for {time}',
        hour: '1 hour',
        hours: '{n} hours',
        minute: '1 minute',
        minutes: '{n} minutes',
        second: '1 second',
        seconds: '{n} seconds',
      },
    },
    /** The session maximum frame; {hours} is the maximum in hours. */
    maximum: {
      heading: '{hours}-hour session max reached',
      /** For guests (owner decision, 2026-11-15); accounts (Release 3) get "has ended and been saved". */
      body: 'a single session can hold up to {hours} hours of focus. this one has ended; start a new one whenever you’re ready.',
      action: 'view results',
    },
    /**
     * Notices: one small reusable pill above the time (plan, Interface; the "notice: fullscreen tip" frame).
     * Each notice that points to a setting uses the one universal link, "change".
     */
    notices: {
      change: 'change',
      dismiss: 'dismiss',
      fullscreen: 'fullscreen hides your other tabs',
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
      retry: 'back to the timer',
      share: 'share',
      copied: 'copied',
      /** When the browser refuses to copy: the icon shows a small cross for 2 seconds. */
      copyFailed: 'couldn’t copy',
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
    /** The standard modes' names; the test modes' are in copy/test-modes.ts, loaded only on a flagged visit. */
    modes: {
      digits: 'digits',
      ring: 'ring',
      timeline: 'timeline',
      analog: 'analog',
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
    /** System notifications, when switched on. */
    notify: {
      checkIn: { title: 'check in', body: 'a check-in is waiting. answer it within the hour to keep this time.' },
      /** {time} is the clock time the pause would end the session. */
      pauseLimit: { title: 'pause limit', body: 'this session ends at {time} unless you resume.' },
    },
  },

} as const;

export type Brand = typeof BRAND;
