/** The built-in recipes as the site ships them (docs/recipes/recipes), checked as the site checks them. */

import { readFileSync } from 'node:fs';
import { checkRecipe } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';

export function builtInRecipe(id: string): Recipe {
  const result = checkRecipe(JSON.parse(readFileSync(new URL(`../../../../docs/recipes/recipes/${id}.json`, import.meta.url), 'utf8')), { builtIn: true });
  if (!result.ok) throw new Error(`${id}: ${result.problems.join('; ')}`);
  return result.recipe;
}
