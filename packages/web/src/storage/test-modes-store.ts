/**
 * The test-modes switch (plan, Display modes > Interstellar; plan-release-2, round 2.9): opening the site once with
 * `?test=interstellar` offers a "test modes" switch in advanced settings, off by default; on, it adds the test
 * modes (interstellar, the perpetual calendar) to the mode tiles. Kept in this browser's local storage under
 * `test-modes`, apart from `settings`: the switch, once offered, stays offered on this device, and neither it nor
 * its state is a setting that syncs or goes into a settings file. "Clear device data" removes it.
 *
 * What is read back is untrusted: anything but `{ "schema": 1, "offered": true, "on": boolean }` reads as never
 * offered and off.
 */

import { browserLocalStorage } from './session-store.ts';

export const TEST_MODES_KEY = 'test-modes';
export const TEST_MODES_SCHEMA = 1;
/** The one address that offers the switch; any other `test` value is ignored. */
export const TEST_MODES_ASK = 'interstellar';

export interface TestModesState {
  readonly offered: boolean;
  readonly on: boolean;
}

const NONE: TestModesState = { offered: false, on: false };

export function parseTestModesRecord(text: string | null): TestModesState {
  if (text === null) return NONE;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return NONE;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return NONE;
  const record = data as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'offered,on,schema' || record['schema'] !== TEST_MODES_SCHEMA) return NONE;
  if (record['offered'] !== true || typeof record['on'] !== 'boolean') return NONE;
  return { offered: true, on: record['on'] };
}

export function testModesRecord(state: TestModesState): string {
  return JSON.stringify({ schema: TEST_MODES_SCHEMA, offered: state.offered, on: state.on });
}

/** Whether an address asks for the switch: `?test=interstellar`, and nothing else. */
export function asksForTestModes(search: string): boolean {
  return new URLSearchParams(search).getAll('test').includes(TEST_MODES_ASK);
}

export class TestModesStore {
  readonly #storage: Storage | null;
  readonly #onError: (error: unknown) => void;
  #state: TestModesState;

  constructor(storage: Storage | null, onError: (error: unknown) => void) {
    this.#storage = storage;
    this.#onError = onError;
    this.#state = this.#read();
  }

  get state(): TestModesState {
    return this.#state;
  }

  /** The address asked for the switch: from now on it is offered on this device. */
  offer(): void {
    if (this.#state.offered) return;
    this.#write({ offered: true, on: false });
  }

  setOn(on: boolean): void {
    if (!this.#state.offered || this.#state.on === on) return;
    this.#write({ offered: true, on });
  }

  clear(): void {
    this.#state = NONE;
    try {
      this.#storage?.removeItem(TEST_MODES_KEY);
    } catch (error) {
      this.#onError(error);
    }
  }

  #read(): TestModesState {
    try {
      return parseTestModesRecord(this.#storage?.getItem(TEST_MODES_KEY) ?? null);
    } catch (error) {
      this.#onError(error);
      return NONE;
    }
  }

  #write(state: TestModesState): void {
    this.#state = state;
    try {
      this.#storage?.setItem(TEST_MODES_KEY, testModesRecord(state));
    } catch (error) {
      this.#onError(error);
    }
  }
}

export function browserTestModesStore(win: Window, onError: (error: unknown) => void): TestModesStore {
  return new TestModesStore(browserLocalStorage(win), onError);
}
