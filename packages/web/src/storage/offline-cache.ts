/**
 * The offline cache the service worker keeps (plan, Infrastructure > Offline).
 * Only the service worker fills it; the page empties it when the remote kill
 * switch turns offline support off.
 */

/** Must match CACHE_PREFIX in src/sw/logic.ts (checked by a test). */
export const OFFLINE_CACHE_PREFIX = 'timer-offline-';

/** Each downloaded mode's own cache (storage/mode-cache.ts); here so the page can tell, cheaply, whether it has any. */
export const MODE_CACHE_PREFIX = `${OFFLINE_CACHE_PREFIX}mode-`;

/** Whether any mode was ever downloaded for offline use on this device. */
export async function hasModeCaches(win: Window): Promise<boolean> {
  if (!('caches' in win)) return false;
  return (await win.caches.keys()).some((name) => name.startsWith(MODE_CACHE_PREFIX));
}

export async function clearOfflineCaches(win: Window): Promise<void> {
  if (!('caches' in win)) return;
  for (const name of await win.caches.keys()) {
    if (name.startsWith(OFFLINE_CACHE_PREFIX)) await win.caches.delete(name);
  }
}
