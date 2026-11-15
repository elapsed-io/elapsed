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
      body: 'a single session can hold up to {hours} hours of focus. this one has ended and been saved; start a new one whenever you’re ready.',
      action: 'view results',
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
