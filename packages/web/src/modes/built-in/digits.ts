/** Digits (core tier): the time on its own (the idle, running and paused frames), and the focus strip on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/digits.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const DIGITS: BuiltInMode = { id: 'digits', recipe: RECIPE };
