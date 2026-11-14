import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import type { Adjustable } from './config.ts';

const adjustables: Record<string, Adjustable> = {
  checkInInterval: CONFIG.session.checkInInterval,
  pauseLimit: CONFIG.session.pauseLimit,
};

describe('config', () => {
  it.each(Object.entries(adjustables))('%s has its default inside its range', (_name, value) => {
    expect(value.min).toBeLessThanOrEqual(value.default);
    expect(value.default).toBeLessThanOrEqual(value.max);
  });

  it('records the plan values for the session lifecycle', () => {
    expect(CONFIG.session.checkInInterval).toEqual({ default: 7_200_000, min: 1_800_000, max: 10_800_000 });
    expect(CONFIG.session.pauseLimit).toEqual({ default: 1_800_000, min: 300_000, max: 3_600_000 });
    expect(CONFIG.session.maxFocus).toBe(57_600_000);
    expect(CONFIG.session.endingCountdown).toBe(5000);
    expect(CONFIG.session.endNowGuard).toBe(300);
  });

  it('keeps the seconds blur-away windows contiguous', () => {
    expect(CONFIG.motion.onesBlurWindow.end).toBe(CONFIG.motion.tensBlurWindow.start);
    expect(CONFIG.motion.tensBlurWindow.end).toBe(60_000);
  });

  it('derives colours with fractions between 0 and 1', () => {
    for (const fraction of Object.values(CONFIG.theme.mix)) {
      expect(fraction).toBeGreaterThan(0);
      expect(fraction).toBeLessThan(1);
    }
  });

  it('fails builds only above twice a budget', () => {
    expect(CONFIG.budgets.failFactor).toBe(2);
    expect(CONFIG.budgets.core.javascriptBytes).toBe(50 * 1024);
    expect(CONFIG.budgets.core.totalBytes).toBe(150 * 1024);
  });
});
