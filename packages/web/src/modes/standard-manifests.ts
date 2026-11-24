/**
 * The standard display modes' manifests (plan, Loading and performance > Packages and manifests): what the site
 * needs to offer and load a mode, and nothing more, since it is part of the core. Pure data, so build scripts can
 * read it without a browser. What each mode draws (its art) is listed apart, for the build and the tests
 * (mode-art.ts). The test modes' manifests are in test-manifests.ts, which only a flagged visit loads; every mode's
 * together, for the build and the tests, are in manifests.ts.
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

export const MODE_BUDGET = { codeBytes: CONFIG.budgets.displayMode.codeBytes, artBytes: CONFIG.budgets.displayMode.artBytes };

/**
 * Each built-in mode is its recipe (packages/core/src/recipes/shipped) drawn with the pieces it names; `source` is the
 * module that holds the recipe and its art's sources (modes/built-in), which the size check measures with everything
 * it loads. `options` names the setting that holds each of the recipe's options.
 */
export const STANDARD_MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'digits', name: BRAND.copy.modes.digits, tier: 'core', budget: MODE_BUDGET, source: 'src/modes/built-in/digits.ts', options: {} },
  { id: 'ring', name: BRAND.copy.modes.ring, tier: 'core', budget: MODE_BUDGET, source: 'src/modes/built-in/ring.ts', options: {} },
  { id: 'timeline', name: BRAND.copy.modes.timeline, tier: 'core', budget: MODE_BUDGET, source: 'src/modes/built-in/timeline.ts', options: {} },
  { id: 'analog', name: BRAND.copy.modes.analog, tier: 'on-choice', budget: MODE_BUDGET, source: 'src/modes/built-in/analog.ts', options: {} },
];

export const DEFAULT_MODE_ID = 'digits';
