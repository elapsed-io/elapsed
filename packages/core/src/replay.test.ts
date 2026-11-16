import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { longSessionReplayExtraMs, replayLengthMs } from './replay.ts';

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

  it('gives each mode its own base length and curve', () => {
    const { modes } = CONFIG;
    expect(modes.digits.replay).toEqual({ durationMs: 1400, easing: [0.16, 1, 0.3, 1] });
    for (const timing of [modes.ring.replay, modes.timeline.replay, modes.analog.replay, modes.interstellar.replay]) {
      expect(timing).toEqual({ durationMs: 2000, easing: [0.16, 1, 0.3, 1] });
    }
    for (const timing of [modes.ocean.replay, modes.height.replay, modes.tree.replay]) {
      expect(timing).toEqual({ durationMs: 3000, easing: [0.33, 1, 0.68, 1] });
    }
    expect(replayLengthMs(modes.ring.replay, 8 * HOUR)).toBeCloseTo(3000, 9);
    expect(replayLengthMs(modes.digits.replay, HOUR)).toBe(1400);
  });
});
