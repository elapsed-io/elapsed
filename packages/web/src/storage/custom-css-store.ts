/**
 * Where the user's custom CSS is kept: this browser's local storage, under
 * `custom-css`, apart from the choices in `settings` (owner changes, item 10:
 * what the user creates stays on the device and never syncs).
 *
 * It is stored already cleaned (plan, Loading and performance > Custom CSS),
 * so the page applies it without loading the checker. Local storage, not
 * IndexedDB, because it is read synchronously before the timer first paints.
 * What is read back is still untrusted: the record's shape, schema and size
 * are checked, and anything else reads as no custom CSS.
 */

import { CONFIG, utf8Bytes } from '@stopwatch/core';
import { browserLocalStorage } from './session-store.ts';

export const CUSTOM_CSS_KEY = 'custom-css';
export const CUSTOM_CSS_SCHEMA = 1;

export interface CustomCssStore {
  /** The stored, cleaned CSS, or '' when there is none. */
  load(): string;
  /** Keeps cleaned CSS, or removes the record when it is empty. Returns whether storage took it. */
  save(css: string): boolean;
  clear(): void;
}

/** Reads a stored record; anything but `{ "schema": 1, "css": "…" }` within the size limit is ''. */
export function parseCustomCssRecord(text: string | null): string {
  if (text === null) return '';
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return '';
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return '';
  const record = data as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'css,schema' || record['schema'] !== CUSTOM_CSS_SCHEMA) return '';
  const css = record['css'];
  return typeof css === 'string' && utf8Bytes(css) <= CONFIG.device.customCssMaxBytes ? css : '';
}

export function customCssRecord(css: string): string {
  return JSON.stringify({ schema: CUSTOM_CSS_SCHEMA, css });
}

export class LocalCustomCssStore implements CustomCssStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  load(): string {
    try {
      return parseCustomCssRecord(this.#storage?.getItem(CUSTOM_CSS_KEY) ?? null);
    } catch (error) {
      this.#onError(error);
      return '';
    }
  }

  save(css: string): boolean {
    try {
      if (css.trim() === '') this.#storage?.removeItem(CUSTOM_CSS_KEY);
      else this.#storage?.setItem(CUSTOM_CSS_KEY, customCssRecord(css));
      return this.#storage !== null;
    } catch (error) {
      // Full or blocked storage: the CSS still applies to this page.
      this.#onError(error);
      return false;
    }
  }

  clear(): void {
    try {
      this.#storage?.removeItem(CUSTOM_CSS_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }
}

/** Calls `listener` with the stored CSS when another tab saves or clears it. */
export function watchCustomCss(win: Window, store: CustomCssStore, listener: (css: string) => void): void {
  const storage = browserLocalStorage(win);
  win.addEventListener('storage', (event) => {
    if (storage === null || event.storageArea !== storage) return;
    if (event.key === CUSTOM_CSS_KEY || event.key === null) listener(store.load());
  });
}
