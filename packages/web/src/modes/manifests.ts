/**
 * Every display mode's manifest (plan, Loading and performance > Packages and manifests): what the site needs to
 * offer and load a mode, and nothing more, since it is part of the core. Pure data, so build scripts can read it
 * without a browser. What each mode draws (its art) is listed apart, for the build and the tests (mode-art.ts).
 */

import { BRAND, CONFIG } from '@stopwatch/core';

export interface ModeManifest {
  readonly id: string;
  /** Lowercase name for the settings panel. */
  readonly name: string;
  /**
   * core: in the first visit's download, ready without another (digits, ring and timeline; plan, Display modes).
   * on-choice: downloaded when picked.
   */
  readonly tier: 'core' | 'on-choice';
  /** Compressed size budgets the CI size check enforces. */
  readonly budget: { readonly codeBytes: number; readonly artBytes: number };
  /** The module that holds the mode, relative to packages/web; the size check finds its chunk by this. */
  readonly source: string;
  /** Which setting holds each of the recipe's options, by option id (Settings > Display, the mode's options box). */
  readonly options: Readonly<Record<string, ModeOptionSetting>>;
}

/** The settings that hold modes' options. */
export type ModeOptionSetting = 'oceanLife' | 'resultsLandmarks' | 'heightLandmarks' | 'treeView';

const budget = { codeBytes: CONFIG.budgets.displayMode.codeBytes, artBytes: CONFIG.budgets.displayMode.artBytes };

/**
 * Each built-in mode is its recipe (docs/recipes/recipes) drawn with the pieces it names; `source` is the module
 * that holds the recipe and its art's sources (modes/built-in), which the size check measures with everything it
 * loads. `options` names the setting that holds each of the recipe's options.
 */
export const MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'digits', name: BRAND.copy.modes.digits, tier: 'core', budget, source: 'src/modes/built-in/digits.ts', options: {} },
  { id: 'ring', name: BRAND.copy.modes.ring, tier: 'core', budget, source: 'src/modes/built-in/ring.ts', options: {} },
  { id: 'timeline', name: BRAND.copy.modes.timeline, tier: 'core', budget, source: 'src/modes/built-in/timeline.ts', options: {} },
  { id: 'analog', name: BRAND.copy.modes.analog, tier: 'on-choice', budget, source: 'src/modes/built-in/analog.ts', options: {} },
  // The test modes (TEST_MODES): their tiles show only while the test-modes switch is on (?test=modes).
  { id: 'ocean', name: BRAND.copy.modes.ocean, tier: 'on-choice', budget, source: 'src/modes/built-in/ocean.ts', options: { 'ocean-life': 'oceanLife', landmarks: 'resultsLandmarks' } },
  { id: 'height', name: BRAND.copy.modes.height, tier: 'on-choice', budget, source: 'src/modes/built-in/height.ts', options: { landmarks: 'heightLandmarks' } },
  { id: 'tree', name: BRAND.copy.modes.tree, tier: 'on-choice', budget, source: 'src/modes/built-in/tree.ts', options: { 'tree-view': 'treeView' } },
  { id: 'interstellar', name: BRAND.copy.modes.interstellar, tier: 'on-choice', budget, source: 'src/modes/built-in/interstellar.ts', options: {} },
];

export const DEFAULT_MODE_ID = 'digits';
