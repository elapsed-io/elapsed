/**
 * Built-in recipes (docs/recipes/recipes), shipped inside the site. They are checked when the site is built: the
 * build refuses one the loader would refuse (web/build/plugins.ts, `checkRecipes`), and the unit tests check each
 * (recipes.test.ts). So they load already checked, and the checker and its schema stay off the startup path (core
 * JavaScript at most 50 KB, plan, Loading and performance); a recipe from anywhere else is checked when it loads
 * (load.ts). A built-in recipe is frozen, so nothing can change it afterwards.
 */

import DIGITS from '../../../../docs/recipes/recipes/digits.json' with { type: 'json' };
import type { Recipe } from './types.ts';

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

/** A built-in recipe as the build checked it, frozen. */
export function builtInRecipe(value: unknown): Recipe {
  return deepFreeze(value as Recipe);
}

/** Digits, the recipe every refused recipe falls back to. */
export const DIGITS_RECIPE: Recipe = builtInRecipe(DIGITS);
