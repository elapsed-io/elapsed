/** Digits (core tier): the time on its own (the idle, running and paused frames), from its recipe. */

import RECIPE from '../../../../../docs/recipes/recipes/digits.json' with { type: 'json' };
import { DIGITS_LIBRARY, builtInMode } from './built-in.ts';

export const createDigitsMode = builtInMode('digits', RECIPE, DIGITS_LIBRARY);
