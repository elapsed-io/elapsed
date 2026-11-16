/**
 * At most 5 crash reports a minute from one address (plan, Privacy; owner
 * changes, item 8), with the address held only briefly in memory.
 *
 * The address is never kept as given: it is hashed with a random salt made
 * when the Worker starts, and the hash is forgotten once its minute has
 * passed. Nothing is written anywhere. Each Worker instance counts on its own,
 * so the limit is a best effort, which is enough to stop one page flooding
 * the table.
 */

import { CONFIG } from '@stopwatch/core';

interface Window {
  start: number;
  count: number;
}

export class RateLimiter {
  readonly #limit: number;
  readonly #window: number;
  readonly #seen = new Map<string, Window>();
  readonly #salt = crypto.getRandomValues(new Uint8Array(16));

  constructor(limit: number = CONFIG.crashReports.perAddress, window: number = CONFIG.crashReports.rateWindow) {
    this.#limit = limit;
    this.#window = window;
  }

  /** Whether one more request from `address` is allowed at `now`. */
  async allow(address: string, now: number): Promise<boolean> {
    this.#forget(now);
    const key = await this.#key(address);
    const seen = this.#seen.get(key);
    if (seen === undefined) {
      this.#seen.set(key, { start: now, count: 1 });
      return true;
    }
    if (seen.count >= this.#limit) return false;
    seen.count += 1;
    return true;
  }

  /** How many addresses are remembered (for tests). */
  get size(): number {
    return this.#seen.size;
  }

  #forget(now: number): void {
    for (const [key, seen] of this.#seen) if (now - seen.start >= this.#window) this.#seen.delete(key);
  }

  async #key(address: string): Promise<string> {
    const bytes = new TextEncoder().encode(address);
    const salted = new Uint8Array(this.#salt.length + bytes.length);
    salted.set(this.#salt);
    salted.set(bytes, this.#salt.length);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', salted));
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
