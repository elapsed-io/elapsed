/**
 * SessionStore (plan, Architecture invariant 6): where the session in
 * progress is kept. Release 1 keeps it in this browser's local storage; no
 * other module touches browser storage.
 *
 * Two keys, both removed when no session is open, so an idle site stores nothing:
 *
 * - `timer.active`: the active state (the open session plus what the
 *   abandonment rules remember), as JSON with a fixed field order.
 * - `timer.heartbeat`: the time of the last heartbeat, written every 30
 *   seconds, kept apart so the heartbeat never rewrites the session.
 *
 * Everything read back is untrusted (plan, Working rules): it is size-capped,
 * parsed and validated against the schema, and migrated from older schemas.
 * Storage is also how tabs share one session (invariant 15): the stored text
 * is the single source of truth, and `pull` reports another tab's change by
 * comparing it with the text this store last read or wrote.
 */

import { CONFIG, SessionValidationError, migrateActiveState, serializeActiveState } from '@stopwatch/core';
import type { ActiveState } from '@stopwatch/core';
import { ACTIVE_STATE_SCHEMA } from '@stopwatch/core';

export const ACTIVE_KEY = 'timer.active';
export const HEARTBEAT_KEY = 'timer.heartbeat';

export type StoredState =
  | { readonly kind: 'none' }
  | { readonly kind: 'state'; readonly state: ActiveState }
  /** Present but not readable by this version of the site; left alone if a newer version wrote it. */
  | { readonly kind: 'unreadable'; readonly newer: boolean };

export interface SessionStore {
  /** The saved state, read when the page opens. Unreadable data from this or an older version is removed. */
  load(): StoredState;
  /** Another tab's change since this store last read or wrote, or null if nothing changed. */
  pull(): StoredState | null;
  /** Saves the open state, or clears both keys when null. Returns whether anything was written. */
  save(state: ActiveState | null): boolean;
  /** The last heartbeat any tab wrote, or null. */
  heartbeat(): number | null;
  saveHeartbeat(at: number): void;
  /** Whether a storage event for `key` concerns this store. */
  owns(key: string | null): boolean;
}

/** The browser's local storage, or null where it is unavailable (blocked by the user or the browser). */
export function browserLocalStorage(win: Window): Storage | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

const DIGITS = /^\d{1,16}$/;

function newerSchema(text: string): boolean {
  // Only the schema number is looked at; the rest stays unparsed.
  const match = /^\{"schema":(\d{1,6})[,}]/.exec(text);
  return match !== null && Number(match[1]) > ACTIVE_STATE_SCHEMA;
}

export class LocalSessionStore implements SessionStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;
  /** The stored text as this store last read or wrote it. */
  #seen: string | null = null;

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  load(): StoredState {
    const text = this.#get(ACTIVE_KEY);
    this.#seen = text;
    const stored = this.#parse(text);
    if (stored.kind === 'unreadable' && !stored.newer) {
      this.#remove(ACTIVE_KEY);
      this.#remove(HEARTBEAT_KEY);
      this.#seen = null;
    }
    return stored;
  }

  pull(): StoredState | null {
    const text = this.#get(ACTIVE_KEY);
    if (text === this.#seen) return null;
    this.#seen = text;
    const stored = this.#parse(text);
    // Something this tab cannot read is not adopted; it keeps what it has.
    return stored.kind === 'unreadable' ? null : stored;
  }

  save(state: ActiveState | null): boolean {
    if (state === null) {
      if (this.#seen === null) return false;
      this.#remove(ACTIVE_KEY);
      this.#remove(HEARTBEAT_KEY);
      this.#seen = null;
      return true;
    }
    const text = serializeActiveState(state);
    if (text === this.#seen) return false;
    if (!this.#set(ACTIVE_KEY, text)) return false;
    this.#seen = text;
    return true;
  }

  heartbeat(): number | null {
    const text = this.#get(HEARTBEAT_KEY);
    if (text === null || !DIGITS.test(text)) return null;
    const at = Number(text);
    return Number.isSafeInteger(at) ? at : null;
  }

  saveHeartbeat(at: number): void {
    if (Number.isSafeInteger(at) && at >= 0) this.#set(HEARTBEAT_KEY, String(at));
  }

  owns(key: string | null): boolean {
    // A null key means the whole storage area was cleared.
    return key === null || key === ACTIVE_KEY || key === HEARTBEAT_KEY;
  }

  #parse(text: string | null): StoredState {
    if (text === null) return { kind: 'none' };
    if (text.length > CONFIG.storage.maxActiveStateChars) return { kind: 'unreadable', newer: false };
    try {
      return { kind: 'state', state: migrateActiveState(JSON.parse(text)) };
    } catch (error) {
      if (!(error instanceof SyntaxError || error instanceof SessionValidationError)) this.#onError(error);
      return { kind: 'unreadable', newer: newerSchema(text) };
    }
  }

  #get(key: string): string | null {
    try {
      return this.#storage?.getItem(key) ?? null;
    } catch (error) {
      this.#onError(error);
      return null;
    }
  }

  #set(key: string, value: string): boolean {
    if (this.#storage === null) return false;
    try {
      this.#storage.setItem(key, value);
      return true;
    } catch (error) {
      // Full or blocked storage: the session carries on in memory.
      this.#onError(error);
      return false;
    }
  }

  #remove(key: string): void {
    try {
      this.#storage?.removeItem(key);
    } catch (error) {
      this.#onError(error);
    }
  }
}

/**
 * Calls `listener` when another tab changes this store's keys. The storage
 * event fires only once this tab's view of storage includes the change.
 */
export function watchLocalStorage(win: Window, store: SessionStore, listener: () => void): void {
  const storage = browserLocalStorage(win);
  win.addEventListener('storage', (event) => {
    if (storage !== null && event.storageArea === storage && store.owns(event.key)) listener();
  });
}
