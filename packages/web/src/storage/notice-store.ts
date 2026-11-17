/**
 * Which notices the user dismissed (plan, Interface: "a dismissed notice stays dismissed"). Kept in this
 * browser's local storage under `notices`, apart from the choices in `settings`: a dismissal is not a setting,
 * never syncs and is not part of a settings file. "Clear device data" removes it with everything else.
 *
 * What is read back is untrusted: anything but `{ "schema": 1, "dismissed": [ids] }` with known-shaped ids
 * reads as nothing dismissed, so a damaged record can only bring a notice back, never hide anything else.
 */

import { browserLocalStorage } from './session-store.ts';

export const NOTICES_KEY = 'notices';
export const NOTICES_SCHEMA = 1;
/** A notice id: lowercase words joined by hyphens, as the shell names them. */
const ID = /^[a-z][a-z0-9-]{0,31}$/;
/** More ids than the shell has notices means the record is not ours. */
const MAX_IDS = 64;

export interface NoticeStore {
  dismissed(id: string): boolean;
  dismiss(id: string): void;
  clear(): void;
}

export function parseNoticesRecord(text: string | null): ReadonlySet<string> {
  if (text === null) return new Set();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return new Set();
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return new Set();
  const record = data as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'dismissed,schema' || record['schema'] !== NOTICES_SCHEMA) return new Set();
  const ids = record['dismissed'];
  if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id): id is string => typeof id === 'string' && ID.test(id))) return new Set();
  return new Set(ids);
}

export function noticesRecord(ids: ReadonlySet<string>): string {
  return JSON.stringify({ schema: NOTICES_SCHEMA, dismissed: [...ids].sort() });
}

export class LocalNoticeStore implements NoticeStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;
  /** Dismissals this page made, kept even where storage refuses them, so a notice never returns mid-visit. */
  readonly #local = new Set<string>();

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  #read(): ReadonlySet<string> {
    try {
      return parseNoticesRecord(this.#storage?.getItem(NOTICES_KEY) ?? null);
    } catch (error) {
      this.#onError(error);
      return new Set();
    }
  }

  dismissed(id: string): boolean {
    return this.#local.has(id) || this.#read().has(id);
  }

  dismiss(id: string): void {
    if (!ID.test(id)) throw new RangeError('not a notice id');
    this.#local.add(id);
    try {
      this.#storage?.setItem(NOTICES_KEY, noticesRecord(new Set([...this.#read(), id])));
    } catch (error) {
      this.#onError(error);
    }
  }

  clear(): void {
    this.#local.clear();
    try {
      this.#storage?.removeItem(NOTICES_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }
}

export function browserNoticeStore(win: Window, onError: (error: unknown) => void): NoticeStore {
  return new LocalNoticeStore(browserLocalStorage(win), onError);
}
