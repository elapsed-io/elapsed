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
  /**
   * The art the mode draws, by asset-registry key (art/registry.ts). Each key draws a placeholder until
   * the mode's catalog registers it; the catalog's bytes count against `budget.artBytes`.
   */
  readonly art: readonly string[];
}

const budget = { codeBytes: CONFIG.budgets.displayMode.codeBytes, artBytes: CONFIG.budgets.displayMode.artBytes };

export const MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'digits', name: BRAND.copy.modes.digits, tier: 'core', budget, source: 'src/modes/digits/digits.ts', art: [] },
  { id: 'ring', name: BRAND.copy.modes.ring, tier: 'on-choice', budget, source: 'src/modes/ring/ring.ts', art: [] },
  { id: 'timeline', name: BRAND.copy.modes.timeline, tier: 'on-choice', budget, source: 'src/modes/timeline/timeline.ts', art: [] },
  { id: 'analog', name: BRAND.copy.modes.analog, tier: 'on-choice', budget, source: 'src/modes/analog/analog.ts', art: [] },
  {
    id: 'ocean',
    name: BRAND.copy.modes.ocean,
    tier: 'on-choice',
    budget,
    source: 'src/modes/ocean/ocean.ts',
    // The things that pass on its results (art/ocean/passing.ts), and each zone's life while paused (life-<zone>.ts).
    art: [
      ...CONFIG.modes.ocean.results.passing.things.map((thing) => thing.key),
      ...(['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'] as const).flatMap((zone) => ['fish-far', 'fish-mid', 'fish-near', 'bubble'].map((name) => `${zone}/${name}`)),
    ],
  },
  {
    id: 'height',
    name: BRAND.copy.modes.height,
    tier: 'on-choice',
    budget,
    source: 'src/modes/height/height.ts',
    // The stars over the sky (art/height/sky.ts); on the results, the card's stars and the things that pass (results.ts).
    art: ['sky/stars', 'sky/stars-card', ...CONFIG.modes.height.results.passing.things.map((thing) => thing.key)],
  },
];

export const DEFAULT_MODE_ID = 'digits';

export function isKnownMode(id: string): boolean {
  return MODE_MANIFESTS.some((manifest) => manifest.id === id);
}
