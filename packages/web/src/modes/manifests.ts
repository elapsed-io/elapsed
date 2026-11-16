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
   * The art the mode draws, by asset-registry key (art/registry.ts): its recipe's slot defaults, and the tree
   * piece's own drawing. Each key draws a placeholder until the mode's catalog registers it; the catalog's bytes
   * count against `budget.artBytes`.
   */
  readonly art: readonly string[];
  /** Which setting holds each of the recipe's options, by option id (Settings > Display, the mode's options box). */
  readonly options: Readonly<Record<string, ModeOptionSetting>>;
}

/** The settings that hold modes' options. */
export type ModeOptionSetting = 'oceanLife' | 'resultsLandmarks' | 'heightLandmarks' | 'treeView';

const budget = { codeBytes: CONFIG.budgets.displayMode.codeBytes, artBytes: CONFIG.budgets.displayMode.artBytes };

/** The art a recipe's slots hold by default: every image and catalog it uses, by asset-registry key. */
export function recipeArt(recipe: object): string[] {
  const slots = 'slots' in recipe && Array.isArray(recipe.slots) ? (recipe.slots as readonly { readonly kind: string; readonly default: string }[]) : [];
  return slots.filter((slot) => slot.kind === 'image' || slot.kind === 'image-strip' || slot.kind === 'star-catalog').map((slot) => slot.default.replace(/^builtin:/, ''));
}

const ZONES = ['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'] as const;

/** The tree piece's own drawing, side on and isometric (art/tree), which the recipe tunes but does not replace. */
const TREE_DRAWING = [
  ...['ground', 'snow-ground', 'branches', 'snow-branches', 'leaves', 'fall', 'ground-leaves'].map((part) => `tree/side-${part}`),
  ...['field', 'snow-field', 'ground-leaves', 'branches', 'snow-branches', 'leaves', 'fall'].map((part) => `tree/iso-${part}`),
];

/**
 * Each built-in mode is its recipe (docs/recipes/recipes) and the pieces it uses; `source` is the module that
 * holds both (modes/built-in), which the size check measures with everything it loads. `art` is its recipe's slot
 * defaults (a test holds them equal, recipeArt()), declared here so the first visit loads no recipe but digits.
 * `options` names the setting that holds each of the recipe's options.
 */
export const MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'digits', name: BRAND.copy.modes.digits, tier: 'core', budget, source: 'src/modes/built-in/digits.ts', art: [], options: {} },
  { id: 'ring', name: BRAND.copy.modes.ring, tier: 'on-choice', budget, source: 'src/modes/built-in/ring.ts', art: [], options: {} },
  { id: 'timeline', name: BRAND.copy.modes.timeline, tier: 'on-choice', budget, source: 'src/modes/built-in/timeline.ts', art: [], options: {} },
  { id: 'analog', name: BRAND.copy.modes.analog, tier: 'on-choice', budget, source: 'src/modes/built-in/analog.ts', art: [], options: {} },
  {
    id: 'ocean',
    name: BRAND.copy.modes.ocean,
    tier: 'on-choice',
    budget,
    source: 'src/modes/built-in/ocean.ts',
    // Each zone's life (far, middle and near schools, a bubble), then the things that pass on its results.
    art: [...ZONES.flatMap((zone) => ['fish-far', 'fish-mid', 'fish-near', 'bubble'].map((name) => `${zone}/${name}`)), ...CONFIG.modes.ocean.results.passing.things.map((thing) => thing.key)],
    options: { 'ocean-life': 'oceanLife', landmarks: 'resultsLandmarks' },
  },
  { id: 'height', name: BRAND.copy.modes.height, tier: 'on-choice', budget, source: 'src/modes/built-in/height.ts', art: ['sky/stars', 'sky/stars-card', ...CONFIG.modes.height.results.passing.things.map((thing) => thing.key)], options: { landmarks: 'heightLandmarks' } },
  { id: 'tree', name: BRAND.copy.modes.tree, tier: 'on-choice', budget, source: 'src/modes/built-in/tree.ts', art: TREE_DRAWING, options: { 'tree-view': 'treeView' } },
];

export const DEFAULT_MODE_ID = 'digits';

export function isKnownMode(id: string): boolean {
  return MODE_MANIFESTS.some((manifest) => manifest.id === id);
}
