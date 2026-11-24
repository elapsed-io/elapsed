/** Tree (a test mode), from its recipe: the tree piece side on or isometric (an option), and the growing tree on the results. */

import RECIPE from '../../../../../packages/core/src/recipes/shipped/tree.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const TREE: BuiltInMode = { id: 'tree', recipe: RECIPE };
