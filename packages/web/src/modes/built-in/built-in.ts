/**
 * The built-in modes: each is its recipe (packages/core/src/recipes/shipped), the sources of its slots' art and data, and its
 * colours over its own environment; the piece library's registry fetches the pieces its recipe names
 * (recipe/library.ts). A built-in recipe is checked when the site is built, where a refused one stops the build
 * (build/plugins.ts, `checkRecipes`), so it loads already checked and frozen (core, recipes/built-in.ts).
 */

export type { BuiltInMode } from '../recipe/library.ts';
