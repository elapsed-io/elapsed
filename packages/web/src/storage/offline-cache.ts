/**
 * The offline cache the service worker keeps (plan, Infrastructure > Offline).
 * Only the service worker fills it; the page empties it when the remote kill
 * switch turns offline support off.
 */

/** Must match CACHE_PREFIX in src/sw/logic.ts (checked by a test). */
export const OFFLINE_CACHE_PREFIX = 'timer-offline-';

export async function clearOfflineCaches(win: Window): Promise<void> {
  if (!('caches' in win)) return;
  for (const name of await win.caches.keys()) {
    if (name.startsWith(OFFLINE_CACHE_PREFIX)) await win.caches.delete(name);
  }
}
