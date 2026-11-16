/**
 * SettingsStore (plan, Architecture invariant 6): where the user's choices
 * are kept. Release 1 keeps them in this browser's local storage under
 * `settings`; Release 3 adds a remote adapter that syncs them.
 *
 * Only choices live here (owner changes, item 10). What the user creates, such
 * as a font file, is kept by MediaStore on this device only, and settings
 * record only that one is in use. Custom CSS (round 7) will have its own
 * on-device store for the same reason.
 *
 * Settings at their defaults are not stored at all, so a site nobody has
 * customised stores nothing. Everything read back is untrusted: it is
 * size-capped, parsed and validated by `core`, field by field.
 */

import { defaultSettings, parseSettings, serializeSettings } from '@stopwatch/core';
import type { Settings } from '@stopwatch/core';
import { browserLocalStorage } from './session-store.ts';

export const SETTINGS_KEY = 'settings';

export interface SettingsStore {
  load(): Settings;
  /** Saves the settings, or removes them when every one is at its default. Returns whether storage took it. */
  save(settings: Settings): boolean;
  /** Removes the stored settings (clear device data). */
  clear(): void;
}

export class LocalSettingsStore implements SettingsStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;
  readonly #defaults = serializeSettings(defaultSettings());

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
  }

  load(): Settings {
    try {
      return parseSettings(this.#storage?.getItem(SETTINGS_KEY) ?? null);
    } catch (error) {
      this.#onError(error);
      return defaultSettings();
    }
  }

  save(settings: Settings): boolean {
    const text = serializeSettings(settings);
    try {
      if (text === this.#defaults) this.#storage?.removeItem(SETTINGS_KEY);
      else this.#storage?.setItem(SETTINGS_KEY, text);
      return this.#storage !== null;
    } catch (error) {
      // Full or blocked storage: the change still applies to this page.
      this.#onError(error);
      return false;
    }
  }

  clear(): void {
    try {
      this.#storage?.removeItem(SETTINGS_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }
}

/** Calls `listener` with the new settings when another tab changes them. */
export function watchSettings(win: Window, store: SettingsStore, listener: (settings: Settings) => void): void {
  const storage = browserLocalStorage(win);
  win.addEventListener('storage', (event) => {
    if (storage === null || event.storageArea !== storage) return;
    // A null key means another tab cleared all of storage.
    if (event.key === SETTINGS_KEY || event.key === null) listener(store.load());
  });
}
