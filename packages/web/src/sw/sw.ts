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

import { PAGE_KEY, cacheName, cacheable, routeFor, staleCaches } from './logic.ts';

declare const self: ServiceWorkerGlobalScope;
/** Filled in at build time. */
declare const __SW_VERSION__: string;
declare const __SW_PRECACHE__: readonly string[];

const VERSION = __SW_VERSION__;
const PRECACHE = __SW_PRECACHE__;
const CACHE = cacheName(VERSION);

self.addEventListener('install', (event) => {
  // The core: the page and everything it loads before it is interactive.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE.map((path) => new Request(path, { cache: 'reload', credentials: 'same-origin' })));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of staleCaches(await caches.keys(), VERSION)) await caches.delete(name);
      // On the first install, look after the page that installed us straight away.
      await self.clients.claim();
    })(),
  );
});

async function fromNetwork(request: Request, key: Request | string): Promise<Response> {
  const response = await fetch(request);
  if (cacheable(response)) {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(key, response.clone());
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
    const cached = await caches.match(key, { cacheName: CACHE });
    if (cached !== undefined) return cached;
    throw error;
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request, { cacheName: CACHE });
  return cached ?? fromNetwork(request, request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const route = routeFor(new URL(request.url), request.method, self.location.origin);
  if (route === 'network') return;
  if (route === 'page') event.respondWith(networkFirst(request, PAGE_KEY));
  else if (route === 'asset') event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request, request));
});
