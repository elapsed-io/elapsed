/** Timeline (core tier), from its recipe: the time above the track piece, and the focus strip on the results. */

import RECIPE from '../../../../../packages/core/src/recipes/shipped/timeline.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const TIMELINE: BuiltInMode = { id: 'timeline', recipe: RECIPE };
