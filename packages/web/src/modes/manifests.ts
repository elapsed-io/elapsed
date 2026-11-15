/**
 * Every display mode's manifest (plan, Loading and performance > Packages and
 * manifests). Pure data, so build scripts can read it without a browser.
 */

import { BRAND, CONFIG } from '@stopwatch/core';

export interface ModeManifest {
  readonly id: string;
  /** Lowercase name for the settings panel. */
  readonly name: string;
  /** core: shipped with the first visit. on-choice: downloaded when picked. */
  readonly tier: 'core' | 'on-choice';
  /** Compressed size budgets the CI size check enforces. */
  readonly budget: { readonly codeBytes: number; readonly artBytes: number };
  /** The module that holds the mode, relative to packages/web; the size check finds its chunk by this. */
  readonly source: string;
}

const budget = { codeBytes: CONFIG.budgets.displayMode.codeBytes, artBytes: CONFIG.budgets.displayMode.artBytes };

export const MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'digits', name: BRAND.copy.modes.digits, tier: 'core', budget, source: 'src/modes/digits/digits.ts' },
  { id: 'ring', name: BRAND.copy.modes.ring, tier: 'on-choice', budget, source: 'src/modes/ring/ring.ts' },
  { id: 'timeline', name: BRAND.copy.modes.timeline, tier: 'on-choice', budget, source: 'src/modes/timeline/timeline.ts' },
];

export const DEFAULT_MODE_ID = 'digits';

export function isKnownMode(id: string): boolean {
  return MODE_MANIFESTS.some((manifest) => manifest.id === id);
}
