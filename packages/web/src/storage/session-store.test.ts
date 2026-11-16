import { CONFIG, createSession, serializeActiveState, startState } from '@stopwatch/core';
import { describe, expect, it } from 'vitest';
import { ACTIVE_KEY, HEARTBEAT_KEY, LocalSessionStore } from './session-store.ts';

const T0 = Date.UTC(2026, 10, 16, 14, 0, 0);
const ID = '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f';
const state = startState(createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' }));

class MemoryStorage implements Storage {
  readonly #items = new Map<string, string>();
  failWrites = false;
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
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.#items.set(key, value);
  }
}

function setup() {
  const storage = new MemoryStorage();
  const errors: unknown[] = [];
  return { storage, errors, store: new LocalSessionStore(storage, (error) => errors.push(error)) };
}

describe('the local session store', () => {
  it('keeps the open session and its heartbeat, and nothing once it ends', () => {
    const { storage, store } = setup();
    expect(store.load()).toEqual({ kind: 'none' });
    expect(store.save(state)).toBe(true);
    store.saveHeartbeat(T0 + 30_000);
    expect(storage.getItem(ACTIVE_KEY)).toBe(serializeActiveState(state));
    expect(store.heartbeat()).toBe(T0 + 30_000);
    expect(store.save(state)).toBe(false);
    expect(store.save(null)).toBe(true);
    expect(storage.length).toBe(0);
  });

  it('reads a saved session back as a validated state', () => {
    const { storage, store } = setup();
    storage.setItem(ACTIVE_KEY, serializeActiveState(state));
    const loaded = store.load();
    expect(loaded.kind === 'state' && serializeActiveState(loaded.state)).toBe(serializeActiveState(state));
  });

  it.each([
    ['broken JSON', '{"schema":1,'],
    ['the wrong shape', '{"schema":1,"session":null}'],
    ['an ended session', serializeActiveState(state).replace('"endReason":null', '"endReason":"user"')],
    ['a script', '<script>alert(1)</script>'],
    ['something far too long', `{"schema":1,"x":"${'a'.repeat(CONFIG.storage.maxActiveStateChars)}"}`],
  ])('discards %s and starts idle', (_label, text) => {
    const { storage, store, errors } = setup();
    storage.setItem(ACTIVE_KEY, text);
    storage.setItem(HEARTBEAT_KEY, String(T0));
    expect(store.load().kind).toBe('unreadable');
    expect(storage.length).toBe(0);
    expect(errors).toEqual([]);
  });

  it('leaves alone a session saved by a newer version of the site', () => {
    const { storage, store } = setup();
    const newer = serializeActiveState(state).replace('{"schema":2,', '{"schema":3,');
    storage.setItem(ACTIVE_KEY, newer);
    expect(store.load()).toEqual({ kind: 'unreadable', newer: true });
    expect(storage.getItem(ACTIVE_KEY)).toBe(newer);
  });

  it('ignores a heartbeat that is not a whole number of milliseconds', () => {
    const { storage, store } = setup();
    for (const text of ['', '-5', '1e12', '12.5', '99999999999999999', ' 1']) {
      storage.setItem(HEARTBEAT_KEY, text);
      expect(store.heartbeat(), text).toBeNull();
    }
  });

  it('reports another tab’s change once, and never its own writes', () => {
    const { storage, store } = setup();
    store.load();
    expect(store.pull()).toBeNull();
    store.save(state);
    expect(store.pull()).toBeNull();
    // Another tab ends the session.
    storage.removeItem(ACTIVE_KEY);
    expect(store.pull()).toEqual({ kind: 'none' });
    expect(store.pull()).toBeNull();
    // Another tab starts one.
    storage.setItem(ACTIVE_KEY, serializeActiveState(state));
    expect(store.pull()?.kind).toBe('state');
    expect(store.pull()).toBeNull();
  });

  it('does not adopt something it cannot read', () => {
    const { storage, store } = setup();
    store.load();
    storage.setItem(ACTIVE_KEY, 'not json');
    expect(store.pull()).toBeNull();
  });

  it('carries on in memory when storage is full or missing', () => {
    const { storage, store, errors } = setup();
    storage.failWrites = true;
    expect(store.save(state)).toBe(false);
    expect(errors).toHaveLength(1);
    expect(store.pull()).toBeNull();
    const missing = new LocalSessionStore(null, () => undefined);
    expect(missing.load()).toEqual({ kind: 'none' });
    expect(missing.save(state)).toBe(false);
    expect(missing.heartbeat()).toBeNull();
  });
});
