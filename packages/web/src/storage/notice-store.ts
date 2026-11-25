/**
 * The notices' own record (plan, Interface: "a dismissed notice stays dismissed"): which notices the user dismissed
 * or acted on, and whether a first session has been completed in this browser, which is when the seconds tip's
 * moment comes (plan version 13: the fullscreen tip before the first session, the seconds tip after the first
 * completed one). Kept in this browser's local storage under `notices`, apart from the choices in `settings`: it is
 * not a setting, never syncs and is not part of a settings file. "Clear device data" removes it with everything else.
 *
 * What is read back is untrusted: anything but `{ "schema": 2, "dismissed": [ids], "firstSession": boolean }` (or
 * round 2.8's `{ "schema": 1, "dismissed": [ids] }`) with known-shaped ids reads as nothing dismissed and no session
 * yet, so a damaged record can only bring a notice back, never hide anything else.
 */

export const NOTICES_KEY = 'notices';
export const NOTICES_SCHEMA = 2;
/** A notice id: lowercase words joined by hyphens, as the shell names them. */
const ID = /^[a-z][a-z0-9-]{0,31}$/;
/** More ids than the shell has notices means the record is not ours. */
const MAX_IDS = 64;

export interface NoticeStore {
  dismissed(id: string): boolean;
  dismiss(id: string): void;
  /** Whether a first session has been completed in this browser. */
  readonly firstSession: boolean;
  /** A session was completed (ended, with its results): from now on the first session is behind the person. */
  completeSession(): void;
  clear(): void;
}

export interface NoticesRecord {
  readonly dismissed: ReadonlySet<string>;
  readonly firstSession: boolean;
}

const NOTHING: NoticesRecord = { dismissed: new Set(), firstSession: false };

export function parseNoticesRecord(text: string | null): NoticesRecord {
  if (text === null) return NOTHING;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NOTHING;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return NOTHING;
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record).sort().join(',');
  const first = record['firstSession'];
  const shaped = (record['schema'] === 1 && keys === 'dismissed,schema') || (record['schema'] === NOTICES_SCHEMA && keys === 'dismissed,firstSession,schema' && typeof first === 'boolean');
  if (!shaped) return NOTHING;
  const ids = record['dismissed'];
  if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id): id is string => typeof id === 'string' && ID.test(id))) return NOTHING;
  return { dismissed: new Set(ids), firstSession: first === true };
}

export function noticesRecord(record: NoticesRecord): string {
  return JSON.stringify({ schema: NOTICES_SCHEMA, dismissed: [...record.dismissed].sort(), firstSession: record.firstSession });
}

export class LocalNoticeStore implements NoticeStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;
  /** What this page recorded, kept even where storage refuses it, so a notice never returns mid-visit. */
  readonly #local = new Set<string>();
  #localSession = false;

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  #read(): NoticesRecord {
    try {
      return parseNoticesRecord(this.#storage?.getItem(NOTICES_KEY) ?? null);
    } catch (error) {
      this.#onError(error);
      return NOTHING;
    }
  }

  #write(record: NoticesRecord): void {
    try {
      this.#storage?.setItem(NOTICES_KEY, noticesRecord(record));
    } catch (error) {
      this.#onError(error);
    }
  }

  dismissed(id: string): boolean {
    return this.#local.has(id) || this.#read().dismissed.has(id);
  }

  dismiss(id: string): void {
    if (!ID.test(id)) throw new RangeError('not a notice id');
    this.#local.add(id);
    const stored = this.#read();
    this.#write({ dismissed: new Set([...stored.dismissed, id]), firstSession: stored.firstSession || this.#localSession });
  }

  get firstSession(): boolean {
    return this.#localSession || this.#read().firstSession;
  }

  completeSession(): void {
    this.#localSession = true;
    const stored = this.#read();
    if (stored.firstSession) return;
    this.#write({ dismissed: new Set([...stored.dismissed, ...this.#local]), firstSession: true });
  }

  clear(): void {
    this.#local.clear();
    this.#localSession = false;
    try {
      this.#storage?.removeItem(NOTICES_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }
}
