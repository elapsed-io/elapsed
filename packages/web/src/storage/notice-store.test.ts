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

describe('the notices record (rounds 2.8 and 2.14)', () => {
  it('reads only its own record: anything else is nothing dismissed and no session yet', () => {
    expect([...parseNoticesRecord('{"schema":1,"dismissed":["fullscreen"]}').dismissed]).toEqual(['fullscreen']);
    expect(parseNoticesRecord('{"schema":1,"dismissed":["fullscreen"]}').firstSession).toBe(false);
    expect(parseNoticesRecord('{"schema":2,"dismissed":["seconds"],"firstSession":true}')).toEqual({ dismissed: new Set(['seconds']), firstSession: true });
    for (const text of [
      null,
      'not json',
      '[]',
      '{"schema":2,"dismissed":["fullscreen"]}',
      '{"schema":2,"dismissed":[],"firstSession":"yes"}',
      '{"schema":3,"dismissed":[],"firstSession":true}',
      '{"schema":1}',
      '{"schema":1,"dismissed":"fullscreen"}',
      '{"schema":1,"dismissed":["Fullscreen"]}',
      '{"schema":1,"dismissed":["<b>"]}',
      '{"schema":1,"dismissed":[1]}',
      '{"schema":1,"dismissed":[],"extra":true}',
      '{"schema":1,"dismissed":[],"firstSession":true}',
      JSON.stringify({ schema: 1, dismissed: Array.from({ length: 65 }, (_, i) => `n${String(i)}`) }),
    ]) {
      const record = parseNoticesRecord(text);
      expect(record.dismissed.size, String(text)).toBe(0);
      expect(record.firstSession, String(text)).toBe(false);
    }
  });

  it('keeps a dismissal and the first session, adds to the record, and clears with device data', () => {
    const storage = memory();
    const store = new LocalNoticeStore(storage, () => undefined);
    expect(store.dismissed('fullscreen')).toBe(false);
    expect(store.firstSession).toBe(false);
    store.dismiss('fullscreen');
    expect(store.dismissed('fullscreen')).toBe(true);
    expect(storage.getItem(NOTICES_KEY)).toBe(noticesRecord({ dismissed: new Set(['fullscreen']), firstSession: false }));
    store.completeSession();
    expect(store.firstSession).toBe(true);
    expect(storage.getItem(NOTICES_KEY)).toBe('{"schema":2,"dismissed":["fullscreen"],"firstSession":true}');
    store.dismiss('seconds');
    const again = new LocalNoticeStore(storage, () => undefined);
    expect([again.dismissed('fullscreen'), again.dismissed('seconds'), again.firstSession]).toEqual([true, true, true]);
    store.clear();
    expect(storage.getItem(NOTICES_KEY)).toBeNull();
    expect([store.dismissed('fullscreen'), store.firstSession]).toEqual([false, false]);
  });

  it('reads round 2.8\'s record and keeps its dismissals when it writes', () => {
    const storage = memory();
    storage.setItem(NOTICES_KEY, '{"schema":1,"dismissed":["fullscreen"]}');
    const store = new LocalNoticeStore(storage, () => undefined);
    store.completeSession();
    expect(storage.getItem(NOTICES_KEY)).toBe('{"schema":2,"dismissed":["fullscreen"],"firstSession":true}');
  });

  it('where storage refuses, a dismissal and the first session still hold for the rest of the visit, and the failure is reported', () => {
    const errors: unknown[] = [];
    const store = new LocalNoticeStore(memory(true), (error) => errors.push(error));
    store.dismiss('fullscreen');
    store.completeSession();
    expect([store.dismissed('fullscreen'), store.firstSession]).toEqual([true, true]);
    expect(errors).toHaveLength(2);
  });

  it('refuses an id of any other shape', () => {
    expect(() => {
      new LocalNoticeStore(memory(), () => undefined).dismiss('../x');
    }).toThrow(RangeError);
  });
});
