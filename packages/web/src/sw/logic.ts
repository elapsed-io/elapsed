/**
 * What the service worker does with each request, as pure functions (tested
 * in node; the worker itself is src/sw/sw.ts).
 *
 * - API requests, the worker script and the kill switch file are never
 *   touched: they always go to the network, and nothing from /api/ is cached
 *   (plan: "never caches personal API responses").
 * - Hashed files under /assets/ never change, so they are served from the
 *   cache first and cached when first fetched; this is also how a display
 *   mode is kept for offline use once picked.
 * - The page is network-first, so a new version shows as soon as the network
 *   answers; offline, the cached page is used.
 * - Everything else of the site's own (the manifest, icons) is network-first
 *   with the cache as a fallback.
 */

/** Cache names start with this, then the build version. Must match OFFLINE_CACHE_PREFIX in src/storage/offline-cache.ts. */
export const CACHE_PREFIX = 'timer-offline-';

export type Route = 'network' | 'page' | 'asset' | 'other';

const NETWORK_ONLY = new Set(['/sw.js', '/sw-control.json']);
const PAGES = new Set(['/', '/index.html']);

export function routeFor(url: URL, method: string, scopeOrigin: string): Route {
  if (method !== 'GET' || url.origin !== scopeOrigin) return 'network';
  if (url.pathname.startsWith('/api/') || NETWORK_ONLY.has(url.pathname)) return 'network';
  if (PAGES.has(url.pathname)) return 'page';
  if (url.pathname.startsWith('/assets/')) return 'asset';
  return 'other';
}

/** Every address of the page shares one cache entry: the query only picks options. */
export const PAGE_KEY = '/';

export function cacheName(version: string): string {
  return `${CACHE_PREFIX}${version}`;
}

/** Old versions' caches, to delete when this version takes over. */
export function staleCaches(names: readonly string[], version: string): string[] {
  return names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== cacheName(version));
}

/** Only complete, same-origin, non-redirected answers are kept. */
export function cacheable(response: { readonly ok: boolean; readonly status: number; readonly type: string; readonly redirected: boolean }): boolean {
  return response.ok && response.status === 200 && response.type === 'basic' && !response.redirected;
}

/** The page's message telling the worker the kill switch is off: stop caching and empty every cache. */
export const SWITCH_OFF_MESSAGE = 'switch-off';
