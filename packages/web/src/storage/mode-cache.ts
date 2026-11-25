/**
 * Downloaded display modes (plan, Loading and performance: "never fetched in
 * advance. A mode is cached when picked and removed automatically after 30
 * days unused, or by hand in settings").
 *
 * The service worker keeps each mode in a cache of its own (src/sw/logic.ts),
 * filled when the page says the mode was used, with the mode's last use beside
 * its files. The page lists those caches with their sizes, removes one by
 * hand, and, each time it loads (never on a timer), removes any mode unused
 * for 30 days, except the one it is about to show. Removing a mode removes
 * only its files: settings, layouts and sessions are left as they are.
 *
 * Without a service worker (in development, or switched off) nothing is
 * cached, so nothing is listed.
 */

import { CONFIG } from '@stopwatch/core';
import { MODE_CACHE_PREFIX } from './offline-cache.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

// The worker's own names (src/sw/logic.ts), repeated here because the worker must stay one script that shares
// no chunk with the page; a test checks they match.
export { MODE_CACHE_PREFIX };
export const LAST_USE_PATH = '/mode-last-use';
export const MODE_USED_MESSAGE = 'mode-used';

function modeCacheName(id: string): string {
  return `${MODE_CACHE_PREFIX}${id}`;
}

function modeOfCache(name: string): string | null {
  return name.startsWith(MODE_CACHE_PREFIX) && name.length > MODE_CACHE_PREFIX.length ? name.slice(MODE_CACHE_PREFIX.length) : null;
}

export interface DownloadedMode {
  readonly id: string;
  /** What its files take on the device, in bytes. */
  readonly bytes: number;
  /** When it was last used (ms since 1970), or null when that was never recorded. */
  readonly lastUsed: number | null;
}

/** Whether a mode last used at `lastUsed` has gone unused too long by `now` (CONFIG.device.unusedModeEvictionDays). */
export function unusedTooLong(lastUsed: number | null, now: number): boolean {
  // A mode with no record was never finished caching; it is removed too, so nothing is kept without one.
  if (lastUsed === null) return true;
  return now - lastUsed >= CONFIG.device.unusedModeEvictionDays * DAY_MS;
}

/** Reads a last-use record: a whole number of milliseconds, or null. */
export function parseLastUse(text: string): number | null {
  if (!/^\d{1,16}$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
}

function cacheStorage(win: Window): CacheStorage | null {
  try {
    return 'caches' in win ? win.caches : null;
  } catch {
    // Storage blocked (some private modes).
    return null;
  }
}

async function readMode(storage: CacheStorage, name: string): Promise<DownloadedMode | null> {
  const id = modeOfCache(name);
  if (id === null) return null;
  const cache = await storage.open(name);
  let bytes = 0;
  let lastUsed: number | null = null;
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (response === undefined) continue;
    if (new URL(request.url).pathname === LAST_USE_PATH) lastUsed = parseLastUse((await response.text()).trim());
    else bytes += (await response.blob()).size;
  }
  return { id, bytes, lastUsed };
}

/** Every downloaded mode, in the order of `order` (the modes' order in settings); unknown ones last. */
export async function listDownloadedModes(win: Window, order: readonly string[]): Promise<DownloadedMode[]> {
  const storage = cacheStorage(win);
  if (storage === null) return [];
  const names = (await storage.keys()).filter((name) => name.startsWith(MODE_CACHE_PREFIX));
  const modes = (await Promise.all(names.map((name) => readMode(storage, name)))).filter((mode): mode is DownloadedMode => mode !== null && mode.bytes > 0);
  const rank = (id: string): number => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  return modes.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Removes a mode's files from the device. It downloads again the next time it is shown. */
export async function removeDownloadedMode(win: Window, id: string): Promise<void> {
  await cacheStorage(win)?.delete(modeCacheName(id));
}

/** Removes every mode unused for 30 days except `keep` (the mode about to be shown); returns the ids removed. */
export async function removeUnusedModes(win: Window, now: number, keep: string): Promise<string[]> {
  const storage = cacheStorage(win);
  if (storage === null) return [];
  const removed: string[] = [];
  for (const name of await storage.keys()) {
    const id = modeOfCache(name);
    if (id === null || id === keep) continue;
    const mode = await readMode(storage, name);
    if (mode !== null && unusedTooLong(mode.lastUsed, now)) {
      await storage.delete(name);
      removed.push(id);
    }
  }
  return removed;
}

/**
 * Tells the service worker a mode was just shown: it keeps the mode's files for offline use and records
 * `at` as its last use. Resolves once that is done.
 */
export async function recordModeUse(win: Window, id: string, at: number): Promise<void> {
  const container = 'serviceWorker' in win.navigator ? win.navigator.serviceWorker : null;
  if (container === null) return;
  // Without a worker (in development) this never settles, which is harmless: nothing waits on it.
  const registration = await container.ready;
  const worker = registration.active;
  if (worker === null) return;
  const message = { type: MODE_USED_MESSAGE, id, at };
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    // A worker from before Release 2 never answers; then this never settles, which only means the list in
    // settings shows the mode the next time it opens.
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    worker.postMessage(message, [channel.port2]);
  });
}
