/**
 * The tree's copy (plan, Architecture invariant 12; round 2.10): in a module of its own, so only the
 * download that shows it carries it. The brand module's rules apply (brand.ts): every user-facing string lives in
 * the brand module and these copy modules, lowercase.
 */

export const TREE_COPY = {
  /** The drawings' names, read on request (the frames' own words; the isometric tree stands on a grassy field). */
  side: 'a tree cycling through the seasons',
  isometric: 'an isometric tree on a grassy field, cycling through the seasons',
  replay: 'tree replay: the tree grows and cycles through the seasons of the session',
} as const;
