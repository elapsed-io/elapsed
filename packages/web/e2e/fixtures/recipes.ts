/** The built-in recipes as the site ships them (packages/core/src/recipes/shipped), checked as the site checks them. */

import { readFileSync } from 'node:fs';
import { checkRecipe } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';

export function builtInRecipe(id: string): Recipe {
  const result = checkRecipe(JSON.parse(readFileSync(new URL(`../../../../packages/core/src/recipes/shipped/${id}.json`, import.meta.url), 'utf8')), { builtIn: true });
  if (!result.ok) throw new Error(`${id}: ${result.problems.join('; ')}`);
  return result.recipe;
}
