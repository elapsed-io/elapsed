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
    },
    icons: {
      settings: 'settings',
      account: 'account',
    },
  },
} as const;

export type Brand = typeof BRAND;
