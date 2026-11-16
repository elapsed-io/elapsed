import { describe, expect, it } from 'vitest';
import ANALOG from '../../../docs/recipes/recipes/analog.json' with { type: 'json' };
import DIGITS from '../../../docs/recipes/recipes/digits.json' with { type: 'json' };
import HEIGHT from '../../../docs/recipes/recipes/height.json' with { type: 'json' };
import INTERSTELLAR from '../../../docs/recipes/recipes/interstellar.json' with { type: 'json' };
import OCEAN from '../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import RING from '../../../docs/recipes/recipes/ring.json' with { type: 'json' };
import TIMELINE from '../../../docs/recipes/recipes/timeline.json' with { type: 'json' };
import TREE from '../../../docs/recipes/recipes/tree.json' with { type: 'json' };
import { checkRecipe } from './recipes/load.ts';
import { replayTimingFor } from './recipes/measure.ts';
import { longSessionReplayExtraMs, replayLengthMs } from './replay.ts';
import type { ReplayTiming } from './replay.ts';

const timing = (value: unknown): ReplayTiming => {
  const result = checkRecipe(value, { builtIn: true });
  if (!result.ok) throw new Error(result.problems.join('; '));
  return replayTimingFor(result.recipe);
};

const HOUR = 60 * 60 * 1000;

describe('results replay timing', () => {
  it('adds nothing up to 2 hours, then 0.5 s for each doubling, at most 1.5 s', () => {
    expect(longSessionReplayExtraMs(0)).toBe(0);
    expect(longSessionReplayExtraMs(1 * HOUR)).toBe(0);
    expect(longSessionReplayExtraMs(2 * HOUR)).toBe(0);
    expect(longSessionReplayExtraMs(4 * HOUR)).toBeCloseTo(500, 9);
    expect(longSessionReplayExtraMs(8 * HOUR)).toBeCloseTo(1000, 9);
    expect(longSessionReplayExtraMs(16 * HOUR)).toBeCloseTo(1500, 9);
    expect(longSessionReplayExtraMs(32 * HOUR)).toBe(1500);
    expect(longSessionReplayExtraMs(3 * HOUR)).toBeCloseTo(500 * Math.log2(1.5), 9);
    expect(longSessionReplayExtraMs(Number.NaN)).toBe(0);
  });

  it('gives each mode its own base length and curve, from its recipe (plan, Design system > Motion)', () => {
    expect(timing(DIGITS)).toEqual({ durationMs: 1400, easing: [0.16, 1, 0.3, 1], longSessionExtra: true });
    for (const recipe of [RING, TIMELINE, ANALOG, INTERSTELLAR]) expect(timing(recipe)).toEqual({ durationMs: 2000, easing: [0.16, 1, 0.3, 1], longSessionExtra: true });
    for (const recipe of [OCEAN, HEIGHT, TREE]) expect(timing(recipe)).toEqual({ durationMs: 3000, easing: [0.33, 1, 0.68, 1], longSessionExtra: true });
    expect(replayLengthMs(timing(RING), 8 * HOUR)).toBeCloseTo(3000, 9);
    expect(replayLengthMs(timing(DIGITS), HOUR)).toBe(1400);
    expect(replayLengthMs({ ...timing(RING), longSessionExtra: false }, 8 * HOUR)).toBe(2000);
  });
});
