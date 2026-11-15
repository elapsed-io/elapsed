import { describe, expect, it } from 'vitest';
import { OFFLINE_CACHE_PREFIX } from '../storage/offline-cache.ts';
import { CACHE_PREFIX, cacheName, cacheable, routeFor, staleCaches } from './logic.ts';

const ORIGIN = 'https://site.example';
const route = (path: string, method = 'GET', origin = ORIGIN): string => routeFor(new URL(path, origin), method, ORIGIN);

describe('service worker routes', () => {
  it('never touches the API, the worker itself or the kill switch', () => {
    expect(route('/api/count', 'POST')).toBe('network');
    expect(route('/api/count')).toBe('network');
    expect(route('/api/anything/else')).toBe('network');
    expect(route('/sw.js')).toBe('network');
    expect(route('/sw-control.json')).toBe('network');
  });

  it('leaves other origins and other methods alone', () => {
    expect(route('/assets/index-abc.js', 'GET', 'https://other.example')).toBe('network');
    expect(route('/', 'POST')).toBe('network');
    expect(route('/assets/index-abc.js', 'HEAD')).toBe('network');
  });

  it('serves the page network-first, hashed files cache-first, and the rest network-first', () => {
    expect(route('/')).toBe('page');
    expect(route('/?mode=ring')).toBe('page');
    expect(route('/index.html')).toBe('page');
    expect(route('/assets/ring-abc.js')).toBe('asset');
    expect(route('/manifest.webmanifest')).toBe('other');
    expect(route('/icons/icon.svg')).toBe('other');
  });
});

describe('service worker caches', () => {
  it('share one prefix with the page’s kill switch', () => {
    expect(CACHE_PREFIX).toBe(OFFLINE_CACHE_PREFIX);
  });

  it('drop only older versions of its own caches', () => {
    expect(staleCaches([cacheName('a'), cacheName('b'), 'someone-else'], 'b')).toEqual([cacheName('a')]);
  });

  it('keep only complete, same-origin answers', () => {
    const ok = { ok: true, status: 200, type: 'basic', redirected: false };
    expect(cacheable(ok)).toBe(true);
    expect(cacheable({ ...ok, status: 206 })).toBe(false);
    expect(cacheable({ ...ok, ok: false, status: 404 })).toBe(false);
    expect(cacheable({ ...ok, type: 'opaque' })).toBe(false);
    expect(cacheable({ ...ok, redirected: true })).toBe(false);
  });
});
