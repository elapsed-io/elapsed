/**
 * The finished guest session (plan, Decisions > Guest storage: "a finished
 * guest session moves to tab-scoped storage (sessionStorage) and is deleted
 * when the tab closes or a new session starts"). It lets a reload show the
 * results again (owner decision, 2026-11-15) and, from Release 3, lets
 * signing up in the same tab keep the session.
 *
 * One key, `timer.finished`, in this tab's session storage only. Read back as
 * untrusted input: size-capped, parsed, validated and required to be ended.
 */

import { CONFIG, migrateSession, serializeSession, sessionStatus } from '@stopwatch/core';
import type { Session } from '@stopwatch/core';

export const FINISHED_KEY = 'timer.finished';

export function browserSessionStorage(win: Window): Storage | null {
  try {
    return win.sessionStorage;
  } catch {
    return null;
  }
}

export class FinishedStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  /** The finished session kept in this tab, or null. Anything unreadable is removed. */
  load(): Session | null {
    let text: string | null;
    try {
      text = this.#storage?.getItem(FINISHED_KEY) ?? null;
    } catch (error) {
      this.#onError(error);
      return null;
    }
    if (text === null) return null;
    try {
      if (text.length > CONFIG.storage.maxActiveStateChars) throw new RangeError('oversize');
      const session = migrateSession(JSON.parse(text));
      if (sessionStatus(session) !== 'ended') throw new RangeError('open');
      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  save(session: Session): void {
    if (sessionStatus(session) !== 'ended') return;
    try {
      this.#storage?.setItem(FINISHED_KEY, serializeSession(session));
    } catch (error) {
      // Full or blocked: the results still show; a reload will not.
      this.#onError(error);
    }
  }

  clear(): void {
    try {
      this.#storage?.removeItem(FINISHED_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }
}
