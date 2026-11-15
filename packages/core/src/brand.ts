/**
 * The brand module (plan, Architecture invariant 12): the product name, its
 * domain and every piece of user-facing copy live here, so a rename touches
 * this file only.
 *
 * The product name is an open decision. Until it is settled the name is the
 * placeholder "[site]", which must not appear anywhere else in the codebase
 * (tooling/brand-placeholder.test.ts enforces this).
 *
 * Interface text is lowercase throughout (plan, Product summary); the tests
 * check every copy string.
 */

export const BRAND = {
  /** Open decision: product name. */
  name: '[site]',
  /** Open decision: the product's domain follows from its name. */
  domain: '[domain]',
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
  },

} as const;

export type Brand = typeof BRAND;
