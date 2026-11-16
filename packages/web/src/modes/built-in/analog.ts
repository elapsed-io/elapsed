/** Analog stopwatch, from its recipe: the dial piece, and one ring per hour behind the hands on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/analog.json' with { type: 'json' };
import { dialPiece } from '../pieces/dial/dial.ts';
import { builtInMode } from './built-in.ts';

export const createAnalogMode = builtInMode('analog', RECIPE, {
  pieces: { dial: dialPiece },
  view: async () => (await import('../pieces/ring/ring-replay.ts')).ringsView,
});
