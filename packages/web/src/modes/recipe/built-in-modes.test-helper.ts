/** Every built-in mode's descriptor, for tests. */

import { ANALOG } from '../built-in/analog.ts';
import { DIGITS } from '../built-in/digits.ts';
import { HEIGHT } from '../built-in/height.ts';
import { INTERSTELLAR } from '../built-in/interstellar.ts';
import { OCEAN } from '../built-in/ocean.ts';
import { RING } from '../built-in/ring.ts';
import { TIMELINE } from '../built-in/timeline.ts';
import { TREE } from '../built-in/tree.ts';
import type { BuiltInMode } from './library.ts';

export const BUILT_IN_MODES: readonly BuiltInMode[] = [DIGITS, RING, TIMELINE, ANALOG, OCEAN, HEIGHT, TREE, INTERSTELLAR];
