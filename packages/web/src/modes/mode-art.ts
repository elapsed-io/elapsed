/**
 * What each display mode draws, by asset-registry key (art/registry.ts): its recipe's slot defaults, and the tree
 * piece's own drawing. Each key draws a placeholder until the mode's catalog registers it; the catalog's bytes count
 * against the mode's art budget. Read by the build and the tests, never loaded by the site (round 2.10: the core
 * carries no mode's art lists or numbers).
 */

import { HEIGHT_CONFIG, OCEAN_CONFIG, SPACE_CONFIG } from '@stopwatch/core';

/** The art a recipe's slots hold by default: every image and catalog it uses, by asset-registry key. */
export function recipeArt(recipe: object): string[] {
  const slots = 'slots' in recipe && Array.isArray(recipe.slots) ? (recipe.slots as readonly { readonly kind: string; readonly default: string }[]) : [];
  return slots.filter((slot) => slot.kind === 'image' || slot.kind === 'image-strip' || slot.kind === 'star-catalog').map((slot) => slot.default.replace(/^builtin:/, ''));
}

const ZONES = ['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'] as const;

/** The tree piece's own drawing, side on and isometric (art/tree), which the recipe tunes but does not replace. */
export const TREE_DRAWING: readonly string[] = [
  ...['ground', 'snow-ground', 'branches', 'snow-branches', 'leaves', 'fall', 'ground-leaves'].map((part) => `tree/side-${part}`),
  ...['field', 'snow-field', 'ground-leaves', 'branches', 'snow-branches', 'leaves', 'fall'].map((part) => `tree/iso-${part}`),
];

/** Each mode's art, by its id (its recipe's slot defaults; a test holds them equal, recipeArt()). */
export const MODE_ART: Readonly<Record<string, readonly string[]>> = {
  digits: [],
  ring: [],
  timeline: [],
  analog: [],
  // Each zone's life (far, middle and near schools, a bubble), then the things that pass on its results.
  ocean: [...ZONES.flatMap((zone) => ['fish-far', 'fish-mid', 'fish-near', 'bubble'].map((name) => `${zone}/${name}`)), ...OCEAN_CONFIG.results.passing.things.map((thing) => thing.key)],
  height: ['sky/stars', 'sky/stars-card', ...HEIGHT_CONFIG.results.passing.things.map((thing) => thing.key)],
  tree: TREE_DRAWING,
  // The whole sky and the still one, then each body.
  interstellar: ['stars/hyg-mag5', 'space/canvas-stars', ...[SPACE_CONFIG.start, ...SPACE_CONFIG.landmarks].map((body) => `space/${body.id}`)],
};
