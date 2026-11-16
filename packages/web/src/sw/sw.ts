/// <reference lib="webworker" />
/**
 * The service worker (plan, Infrastructure > Offline; Security requirements:
 * "limited to the site's own scope, never caches personal API responses ...
 * and can be switched off remotely"). Built as /sw.js by build/service-worker.ts,
 * which fills in the build's version and the core files to cache on install.
 * It must stay one self-contained script: it imports only src/sw/logic.ts.
 *
 * Release 3 adds clearing the caches on sign-out.
 */

import {
  CACHE_PREFIX,
  LAST_USE_PATH,
  PAGE_KEY,
  SWITCH_OFF_MESSAGE,
  cacheName,
  cacheable,
  modeCacheName,
  modeOfCache,
  modesByFile,
  readModeUsed,
  routeFor,
  staleCaches,
} from './logic.ts';

declare const self: ServiceWorkerGlobalScope;
/** Filled in at build time. */
declare const __SW_VERSION__: string;
declare const __SW_PRECACHE__: readonly string[];
/** Each downloaded mode's own files in this build (its code, styles, art and replay), as paths. */
declare const __SW_MODES__: Readonly<Record<string, readonly string[]>>;

const VERSION = __SW_VERSION__;
const PRECACHE = __SW_PRECACHE__;
const MODES = __SW_MODES__;
const MODE_IDS = Object.keys(MODES);
const MODE_OF_FILE = modesByFile(MODES);
const CACHE = cacheName(VERSION);
/**
 * Only this version's cache. Vary is ignored: servers may vary on Origin or
 * Accept-Encoding, and the module scripts' CORS requests then never match what
 * was cached on install, though the files themselves cannot differ.
 */
const MATCH: MultiCacheQueryOptions = { cacheName: CACHE, ignoreVary: true };

/** Set by the remote kill switch: from then on every request goes to the network and nothing is kept. */
let switchedOff = false;
/** Read through a function: the flag can change while a request awaits the network. */
const isSwitchedOff = (): boolean => switchedOff;

async function deleteAllCaches(): Promise<void> {
  for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX)) await caches.delete(name);
}

/** Adds the files of `id` missing from its cache. A file that cannot be fetched now is left for the next use. */
async function fillMode(id: string): Promise<void> {
  const cache = await caches.open(modeCacheName(id));
  for (const path of MODES[id] ?? []) {
    if (isSwitchedOff()) return;
    if ((await cache.match(path, { ignoreVary: true })) !== undefined) continue;
    try {
      const response = await fetch(new Request(path, { credentials: 'same-origin' }));
      if (cacheable(response) && !isSwitchedOff()) await cache.put(path, response);
    } catch {
      // Offline, or storage full: the mode keeps working online.
    }
  }
}

/** A mode was used: keep it for offline use and record when (the page's time, so its 30-day rule uses one clock). */
async function useMode(id: string, at: number): Promise<void> {
  if (isSwitchedOff()) return;
  await fillMode(id);
  if (isSwitchedOff()) {
    await deleteAllCaches();
    return;
  }
  const cache = await caches.open(modeCacheName(id));
  await cache.put(LAST_USE_PATH, new Response(String(at), { headers: { 'content-type': 'text/plain' } }));
}

self.addEventListener('message', (event) => {
  // Only pages of this origin can message their worker.
  if (event.data === SWITCH_OFF_MESSAGE) {
    switchedOff = true;
    event.waitUntil(deleteAllCaches());
    return;
  }
  const used = readModeUsed(event.data, MODE_IDS);
  if (used === null) return;
  const reply = event.ports[0];
  event.waitUntil(
    useMode(used.id, used.at).then(
      () => reply?.postMessage('done'),
      () => reply?.postMessage('failed'),
    ),
  );
});

self.addEventListener('install', (event) => {
  // The core: the page and everything it loads before it is interactive.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload', credentials: 'same-origin' })));
      // Modes already downloaded get this version's files, so they keep working offline after the update.
      for (const name of await caches.keys()) {
        const id = modeOfCache(name);
        if (id !== null && MODES[id] !== undefined) await fillMode(id);
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of staleCaches(await caches.keys(), VERSION)) await caches.delete(name);
      // Downloaded modes keep only this version's files and their last use; a mode this version no longer has goes.
      for (const name of await caches.keys()) {
        const id = modeOfCache(name);
        if (id === null) continue;
        const files = MODES[id];
        if (files === undefined) {
          await caches.delete(name);
          continue;
        }
        const keep = new Set([...files, LAST_USE_PATH]);
        const cache = await caches.open(name);
        for (const request of await cache.keys()) if (!keep.has(new URL(request.url).pathname)) await cache.delete(request);
      }
      // On the first install, look after the page that installed us straight away.
      await self.clients.claim();
    })(),
  );
});

async function fromNetwork(request: Request, key: Request | string): Promise<Response> {
  const response = await fetch(request);
  if (cacheable(response) && !isSwitchedOff()) {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(key, response.clone());
      // Switched off while this copy was being written.
      if (isSwitchedOff()) await deleteAllCaches();
    } catch {
      // Storage full or blocked: answer without keeping a copy.
    }
  }
  return response;
}

async function networkFirst(request: Request, key: Request | string): Promise<Response> {
  try {
    return await fromNetwork(request, key);
  } catch (error) {
    const cached = await caches.match(key, MATCH);
    if (cached !== undefined) return cached;
    throw error;
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request, MATCH);
  return cached ?? fromNetwork(request, request);
}

/** A downloaded mode's own file: from the cache of a mode that holds it, or the network without keeping it. */
async function modeFile(request: Request, ids: readonly string[]): Promise<Response> {
  for (const id of ids) {
    const cached = await caches.match(request, { cacheName: modeCacheName(id), ignoreVary: true });
    if (cached !== undefined) return cached;
  }
  return fetch(request);
}

// A notification (check-in or pause limit) brings the site's tab forward, or opens one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open !== undefined) await open.focus();
      else await self.clients.openWindow('/');
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (switchedOff) return;
  const { request } = event;
  const route = routeFor(new URL(request.url), request.method, self.location.origin);
  if (route === 'network') return;
  const modes = route === 'asset' ? MODE_OF_FILE.get(new URL(request.url).pathname) : undefined;
  if (route === 'page') event.respondWith(networkFirst(request, PAGE_KEY));
  else if (modes !== undefined) event.respondWith(modeFile(request, modes));
  else if (route === 'asset') event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request, request));
});
