/** Ring, from its recipe: the ring piece around the time, and one ring per hour on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/ring.json' with { type: 'json' };
import { ringPiece } from '../pieces/ring/ring.ts';
import { builtInMode } from './built-in.ts';

export const createRingMode = builtInMode('ring', RECIPE, {
  pieces: { ring: ringPiece },
  view: async () => (await import('../pieces/ring/ring-replay.ts')).ringsView,
});
