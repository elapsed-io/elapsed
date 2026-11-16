/**
 * The built-in modes: each is its recipe (docs/recipes/recipes) drawn with the pieces it names, and nothing else.
 * A built-in recipe is checked on load like any other (core, recipes/load.ts); if one were ever refused, the mode
 * would show digits instead.
 */

import { DIGITS_RECIPE, recipeOrDigits } from '@stopwatch/core';
import type { DisplayModeFactory } from '../contract.ts';
import { createRecipeMode } from '../recipe/recipe-mode.ts';
import type { PieceLibrary } from '../recipe/piece.ts';
import type { SlotSources } from '../recipe/slots.ts';

/** What digits draws with: the time alone, and the focus strip on the results. */
export const DIGITS_LIBRARY: PieceLibrary = { pieces: {}, view: async () => (await import('../shared/strip-replay.ts')).stripView };

export function builtInMode(id: string, recipe: unknown, library: PieceLibrary & { readonly slots?: SlotSources }): DisplayModeFactory {
  return () => {
    const checked = recipeOrDigits(recipe, { builtIn: true });
    return createRecipeMode(id, checked, checked === DIGITS_RECIPE && id !== 'digits' ? DIGITS_LIBRARY : library);
  };
}
