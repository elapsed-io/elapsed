import { CONFIG, createSession, endSession, pauseSession, resumeSession, summarise } from '@stopwatch/core';
import { describe, expect, it } from 'vitest';
import { arc, ringGeometry, ringPaths } from '../modes/pieces/ring/ring-replay.ts';
import { placeLabels } from '../modes/shared/strip-replay.ts';
import { FINISHED_KEY, FinishedStore } from '../storage/finished-store.ts';
import { countAt, countExpression, countTerms } from './results.ts';
import { shareDuration, shareText } from './share.ts';

const T0 = Date.UTC(2026, 10, 16, 14, 2, 0);
const MINUTE = 60_000;
const ID = '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f';

function sample() {
  let session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
  session = pauseSession(session, T0 + 92 * MINUTE);
  session = resumeSession(session, T0 + 102 * MINUTE);
  session = pauseSession(session, T0 + 150 * MINUTE);
  session = resumeSession(session, T0 + 158 * MINUTE);
  return endSession(session, 'user', T0 + 185 * MINUTE + 40_000);
}

describe('share text', () => {
  it('reads like the plan’s example', () => {
    expect(shareDuration((2 * 60 + 47) * MINUTE + 40_000)).toBe('2h 47m');
    expect(shareDuration(47 * MINUTE)).toBe('47m');
    expect(shareDuration(45_000)).toBe('45s');
    expect(shareText((2 * 60 + 47) * MINUTE)).toMatch(/^i studied for 2h 47m on /);
  });
});

describe('the headline count', () => {
  it('rises only while the replay passes focus, flat across each pause, and lands on the total', () => {
    const session = sample();
    const summary = summarise(session);
    const terms = countTerms(session, summary);
    const seconds = summary.elapsedMs / 1000;
    expect(countAt(terms, seconds, 0)).toBe(0);
    expect(countAt(terms, seconds, 1)).toBe(10_060);
    let previous = 0;
    for (let step = 0; step <= 1000; step += 1) {
      const value = countAt(terms, seconds, step / 1000);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // Across the first pause (minutes 92 to 102 of 185.67), the count holds at 92 minutes.
    expect(countAt(terms, seconds, (93 * 60) / seconds)).toBe(92 * 60);
    expect(countAt(terms, seconds, (101 * 60) / seconds)).toBe(92 * 60);
  });

  it('is one CSS expression of the replay progress', () => {
    expect(countExpression([{ from: 0, length: 60 }, { from: 90, length: 30 }], 120)).toBe(
      'round(down, clamp(0, var(--replay-progress) * 120 - 0, 60) + clamp(0, var(--replay-progress) * 120 - 90, 30), 1)',
    );
    expect(countExpression([], 1)).toBe('round(down, 0, 1)');
  });
});

describe('ring results', () => {
  it('keep the frame’s rings up to six hours', () => {
    expect(ringGeometry(4)).toEqual({ radii: [92, 79, 66, 53], strokeWidth: 8 });
    expect(ringGeometry(6).radii.at(-1)).toBe(27);
  });

  it('fit every hour of a 16-hour session in the same circle, closer and thinner', () => {
    const { radii, strokeWidth } = ringGeometry(16);
    expect(radii).toHaveLength(16);
    expect(radii[0]).toBe(92);
    expect(radii.at(-1)).toBeCloseTo(27, 9);
    const spacing = (radii[0] ?? 0) - (radii[1] ?? 0);
    expect(strokeWidth).toBeLessThan(spacing);
    expect(strokeWidth).toBeLessThan(8);
  });

  it('draw arcs as the frame does, splitting a whole hour in two', () => {
    expect(arc(92, 0, 90)).toBe('M125 33 A92 92 0 0 1 217 125 ');
    expect(arc(92, 0, 360).match(/M/g)).toHaveLength(2);
    expect(arc(92, 10, 10.01)).toBe('');
  });

  it('put each stretch of focus on its hour’s ring', () => {
    const { paths, minutes } = ringPaths(sample());
    expect(minutes).toBeCloseTo(185 + 40 / 60, 9);
    expect(paths).toHaveLength(4);
    for (const path of paths) expect(path.length).toBeGreaterThan(0);
  });
});

describe('strip labels', () => {
  it('keep the start and end, and leave out hours that would crowd them or each other', () => {
    // start 0–28, hours at 171 and 365 and 559 (each 28 wide), end 572–600.
    expect(placeLabels([0, 171, 365, 559, 572], [28, 28, 28, 28, 28], 8)).toEqual([true, true, true, false, true]);
    // Dense hours keep every other one.
    expect(placeLabels([0, 20, 40, 60, 80, 200], [28, 28, 28, 28, 28, 28], 8)).toEqual([true, false, true, false, true, true]);
  });
});

class MemoryStorage implements Storage {
  readonly #items = new Map<string, string>();
  get length(): number {
    return this.#items.size;
  }
  clear(): void {
    this.#items.clear();
  }
  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.#items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }
}

describe('the finished session in tab storage', () => {
  it('keeps one finished session and reads it back validated', () => {
    const storage = new MemoryStorage();
    const store = new FinishedStore(storage, () => undefined);
    store.save(sample());
    expect(store.load()?.id).toBe(ID);
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('never keeps an open session, and discards anything unreadable', () => {
    const storage = new MemoryStorage();
    const store = new FinishedStore(storage, () => undefined);
    store.save(createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' }));
    expect(storage.length).toBe(0);
    for (const text of ['nope', '{"schema":1}', `"${'x'.repeat(CONFIG.storage.maxActiveStateChars)}"`]) {
      storage.setItem(FINISHED_KEY, text);
      expect(store.load()).toBeNull();
      expect(storage.length).toBe(0);
    }
  });
});
