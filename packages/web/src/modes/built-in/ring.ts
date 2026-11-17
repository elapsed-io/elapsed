/** Ring (core tier), from its recipe: the ring piece around the time, and one ring per hour on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/ring.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const RING: BuiltInMode = { id: 'ring', recipe: RECIPE };
