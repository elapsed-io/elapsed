import { CONFIG } from '@stopwatch/core';
import { describe, expect, it } from 'vitest';
import { parseLastUse, unusedTooLong } from './mode-cache.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 16, 12);

describe('downloaded modes', () => {
  it('removes a mode unused for 30 days, and keeps one used within them', () => {
    expect(CONFIG.device.unusedModeEvictionDays).toBe(30);
    expect(unusedTooLong(NOW - 30 * DAY, NOW)).toBe(true);
    expect(unusedTooLong(NOW - 30 * DAY + 1, NOW)).toBe(false);
    expect(unusedTooLong(NOW - DAY, NOW)).toBe(false);
    expect(unusedTooLong(NOW, NOW)).toBe(false);
  });

  it('removes a mode with no record of its use', () => {
    expect(unusedTooLong(null, NOW)).toBe(true);
  });

  it('reads only a whole number of milliseconds as a last use', () => {
    expect(parseLastUse(String(NOW))).toBe(NOW);
    for (const bad of ['', '-1', '1.5', '1e12', 'soon', ' 12', '99999999999999999']) expect(parseLastUse(bad), bad).toBeNull();
  });
});
