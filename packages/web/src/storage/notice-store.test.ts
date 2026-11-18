import { describe, expect, it } from 'vitest';
import { LocalNoticeStore, NOTICES_KEY, noticesRecord, parseNoticesRecord } from './notice-store.ts';

/** A minimal Storage, optionally refusing writes. */
function memory(refuse = false): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      if (refuse) throw new Error('QuotaExceededError');
      items.set(key, value);
    },
  };
}

describe('dismissed notices (round 2.8)', () => {
  it('reads only its own record: anything else is nothing dismissed', () => {
    expect([...parseNoticesRecord('{"schema":1,"dismissed":["fullscreen"]}')]).toEqual(['fullscreen']);
    for (const text of [
      null,
      'not json',
      '[]',
      '{"schema":2,"dismissed":["fullscreen"]}',
      '{"schema":1}',
      '{"schema":1,"dismissed":"fullscreen"}',
      '{"schema":1,"dismissed":["Fullscreen"]}',
      '{"schema":1,"dismissed":["<b>"]}',
      '{"schema":1,"dismissed":[1]}',
      '{"schema":1,"dismissed":[],"extra":true}',
      JSON.stringify({ schema: 1, dismissed: Array.from({ length: 65 }, (_, i) => `n${String(i)}`) }),
    ]) {
      expect(parseNoticesRecord(text).size, String(text)).toBe(0);
    }
  });

  it('keeps a dismissal, adds to the record, and clears with device data', () => {
    const storage = memory();
    const store = new LocalNoticeStore(storage, () => undefined);
    expect(store.dismissed('fullscreen')).toBe(false);
    store.dismiss('fullscreen');
    expect(store.dismissed('fullscreen')).toBe(true);
    expect(storage.getItem(NOTICES_KEY)).toBe(noticesRecord(new Set(['fullscreen'])));
    expect(new LocalNoticeStore(storage, () => undefined).dismissed('fullscreen')).toBe(true);
    store.clear();
    expect(storage.getItem(NOTICES_KEY)).toBeNull();
    expect(store.dismissed('fullscreen')).toBe(false);
  });

  it('where storage refuses, a dismissal still holds for the rest of the visit, and the failure is reported', () => {
    const errors: unknown[] = [];
    const store = new LocalNoticeStore(memory(true), (error) => errors.push(error));
    store.dismiss('fullscreen');
    expect(store.dismissed('fullscreen')).toBe(true);
    expect(errors).toHaveLength(1);
  });

  it('refuses an id of any other shape', () => {
    expect(() => {
      new LocalNoticeStore(memory(), () => undefined).dismiss('../x');
    }).toThrow(RangeError);
  });
});
