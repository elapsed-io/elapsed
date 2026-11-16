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
 * - A downloaded display mode (every mode but digits, plan: "On choice") has
 *   a cache of its own, filled when the page says the mode was used, and
 *   kept across versions: a new version refreshes its files when it
 *   installs. Its last use is kept in it, beside its files. A mode's own
 *   files are served from its cache, or from the network without being kept.
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

/** Each downloaded mode's cache is this, then the mode's id. One per mode, across versions. */
export const MODE_CACHE_PREFIX = `${CACHE_PREFIX}mode-`;

export function modeCacheName(id: string): string {
  return `${MODE_CACHE_PREFIX}${id}`;
}

/** The mode a cache holds, or null for any other cache. */
export function modeOfCache(name: string): string | null {
  return name.startsWith(MODE_CACHE_PREFIX) && name.length > MODE_CACHE_PREFIX.length ? name.slice(MODE_CACHE_PREFIX.length) : null;
}

/** Where a mode's cache keeps its last use (milliseconds since 1970, as text), beside its files. */
export const LAST_USE_PATH = '/mode-last-use';

/** Old versions' caches, to delete when this version takes over. Downloaded modes' caches outlive versions. */
export function staleCaches(names: readonly string[], version: string): string[] {
  return names.filter((name) => name.startsWith(CACHE_PREFIX) && modeOfCache(name) === null && name !== cacheName(version));
}

/** The page's message that a mode was just used: cache its files and record when. */
export const MODE_USED_MESSAGE = 'mode-used';

export interface ModeUsed {
  readonly type: typeof MODE_USED_MESSAGE;
  readonly id: string;
  readonly at: number;
}

/** A "mode used" message for one of `known` modes, or null for anything else. */
export function readModeUsed(data: unknown, known: readonly string[]): ModeUsed | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'at,id,type' || record['type'] !== MODE_USED_MESSAGE) return null;
  const { id, at } = record;
  if (typeof id !== 'string' || !known.includes(id) || typeof at !== 'number' || !Number.isFinite(at) || at < 0) return null;
  return { type: MODE_USED_MESSAGE, id, at };
}

/** Which modes each file of the build belongs to, as paths ("/assets/ring-….js"). */
export function modesByFile(modes: Readonly<Record<string, readonly string[]>>): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  for (const [id, files] of Object.entries(modes)) {
    for (const file of files) byFile.set(file, [...(byFile.get(file) ?? []), id]);
  }
  return byFile;
}

/** Only complete, same-origin, non-redirected answers are kept. */
export function cacheable(response: { readonly ok: boolean; readonly status: number; readonly type: string; readonly redirected: boolean }): boolean {
  return response.ok && response.status === 200 && response.type === 'basic' && !response.redirected;
}

/** The page's message telling the worker the kill switch is off: stop caching and empty every cache. */
export const SWITCH_OFF_MESSAGE = 'switch-off';
