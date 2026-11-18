/** Analog stopwatch, from its recipe: the dial piece, and one ring per hour behind the hands on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/analog.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const ANALOG: BuiltInMode = { id: 'analog', recipe: RECIPE };
