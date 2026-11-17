/**
 * The built-in modes: each is its recipe (docs/recipes/recipes) drawn with the pieces it names, and nothing else.
 * A built-in recipe is checked when the site is built, where a refused one stops the build (build/plugins.ts,
 * `checkRecipes`), so it loads already checked and frozen (core, recipes/built-in.ts).
 */

import { builtInRecipe } from '@stopwatch/core';
import type { DisplayModeFactory } from '../contract.ts';
import { createRecipeMode } from '../recipe/recipe-mode.ts';
import type { PieceLibrary } from '../recipe/piece.ts';
import type { SlotSources } from '../recipe/slots.ts';

/** What digits draws with: the time alone, and the focus strip on the results. */
export const DIGITS_LIBRARY: PieceLibrary = { pieces: {}, view: async () => (await import('../shared/strip-replay.ts')).stripView };

export function builtInMode(id: string, recipe: unknown, library: PieceLibrary & { readonly slots?: SlotSources }): DisplayModeFactory {
  return () => createRecipeMode(id, builtInRecipe(recipe), library);
}
