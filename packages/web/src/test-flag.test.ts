import { describe, expect, it } from 'vitest';
import { STANDARD_MODES, TEST_MODES, shownMode } from '@stopwatch/core';
import { STANDARD_MODE_MANIFESTS } from './modes/standard-manifests.ts';
import { TEST_MODE_MANIFESTS } from './modes/test-manifests.ts';
import { MODE_MANIFESTS } from './modes/manifests.ts';
import { RETIRED_TEST_MODES_KEY, forgetTestModesSwitch, isFlaggedVisit } from './test-flag.ts';

/** A minimal Storage that records every write. */
function memory(initial: Record<string, string> = {}): Storage & { writes: string[] } {
  const items = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    writes,
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      writes.push(`remove ${key}`);
      items.delete(key);
    },
    setItem: (key, value) => {
      writes.push(`set ${key}`);
      items.set(key, value);
    },
  };
}

describe('the test flag', () => {
  it('flags a visit opened with ?test=modes or ?test=interstellar, and nothing else', () => {
    expect(isFlaggedVisit('?test=modes')).toBe(true);
    expect(isFlaggedVisit('?test=interstellar')).toBe(true);
    expect(isFlaggedVisit('?safe&test=modes')).toBe(true);
    expect(isFlaggedVisit('?test=calendar&test=modes')).toBe(true);
    for (const search of ['', '?', '?test', '?test=', '?test=Modes', '?test=calendar', '?tests=modes', '?modes', '#test=modes', '?test=modes%20']) expect(isFlaggedVisit(search), search).toBe(false);
  });

  it('removes the retired switch, writing nothing when there is none', () => {
    const old = memory({ [RETIRED_TEST_MODES_KEY]: '{"schema":1,"offered":true,"on":true}', settings: '{}' });
    forgetTestModesSwitch(old, () => undefined);
    expect(old.getItem(RETIRED_TEST_MODES_KEY)).toBeNull();
    expect(old.getItem('settings')).toBe('{}');
    const clean = memory({ settings: '{}' });
    forgetTestModesSwitch(clean, () => undefined);
    expect(clean.writes).toEqual([]);
    forgetTestModesSwitch(null, () => undefined);
  });

  it('reports storage that refuses, without throwing', () => {
    const refusing = { getItem: () => 'x', removeItem: () => { throw new Error('SecurityError'); } } as unknown as Storage;
    const errors: unknown[] = [];
    forgetTestModesSwitch(refusing, (error) => errors.push(error));
    expect(errors).toHaveLength(1);
  });

  it('shows digits for a test mode on a visit without the flag, and the choice itself on a flagged one', () => {
    for (const mode of TEST_MODES) {
      expect(shownMode(mode, false)).toBe('digits');
      expect(shownMode(mode, true)).toBe(mode);
    }
    for (const mode of STANDARD_MODES) {
      expect(shownMode(mode, false)).toBe(mode);
      expect(shownMode(mode, true)).toBe(mode);
    }
  });

  it('keeps the standard and the test modes in separate manifests', () => {
    expect(STANDARD_MODE_MANIFESTS.map((manifest) => manifest.id)).toEqual([...STANDARD_MODES]);
    expect(TEST_MODE_MANIFESTS.map((manifest) => manifest.id)).toEqual([...TEST_MODES]);
    expect(MODE_MANIFESTS.map((manifest) => manifest.id)).toEqual([...STANDARD_MODES, ...TEST_MODES]);
  });
});
