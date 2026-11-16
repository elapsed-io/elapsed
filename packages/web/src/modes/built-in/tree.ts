/** Tree, from its recipe: the tree piece side on or isometric (an option), and the growing tree on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/tree.json' with { type: 'json' };
import { treePiece } from '../pieces/tree/tree.ts';
import { builtInMode } from './built-in.ts';

export const createTreeMode = builtInMode('tree', RECIPE, {
  pieces: { tree: treePiece },
  view: async () => (await import('../pieces/tree/tree-replay.ts')).sceneView,
});
