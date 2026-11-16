import { describe, expect, it } from 'vitest';
import { SWITCH_OFF_MESSAGE as PAGE_SWITCH_OFF } from '../offline/register.ts';
import { OFFLINE_CACHE_PREFIX } from '../storage/offline-cache.ts';
import { LAST_USE_PATH as PAGE_LAST_USE, MODE_CACHE_PREFIX as PAGE_MODE_PREFIX, MODE_USED_MESSAGE as PAGE_MODE_USED } from '../offline/downloaded-modes.ts';
import { CACHE_PREFIX, LAST_USE_PATH, MODE_CACHE_PREFIX, MODE_USED_MESSAGE, SWITCH_OFF_MESSAGE, cacheName, cacheable, modeCacheName, modeOfCache, modesByFile, readModeUsed, routeFor, staleCaches } from './logic.ts';

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
  it('share one prefix and one switch-off message with the page’s kill switch', () => {
    expect(CACHE_PREFIX).toBe(OFFLINE_CACHE_PREFIX);
    expect(SWITCH_OFF_MESSAGE).toBe(PAGE_SWITCH_OFF);
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

describe('downloaded modes', () => {
  it('share their names and message with the page', () => {
    expect(PAGE_MODE_PREFIX).toBe(MODE_CACHE_PREFIX);
    expect(PAGE_LAST_USE).toBe(LAST_USE_PATH);
    expect(PAGE_MODE_USED).toBe(MODE_USED_MESSAGE);
  });

  it('keep one cache per mode, under the same prefix, which outlives versions', () => {
    expect(modeCacheName('ring')).toBe(`${CACHE_PREFIX}mode-ring`);
    expect(modeOfCache(modeCacheName('timeline'))).toBe('timeline');
    expect(modeOfCache(cacheName('abc'))).toBeNull();
    expect(modeOfCache(`${CACHE_PREFIX}mode-`)).toBeNull();
    expect(staleCaches([cacheName('a'), modeCacheName('ring'), cacheName('b')], 'b')).toEqual([cacheName('a')]);
  });

  it('accept only a well-formed "mode used" message for a mode the build has', () => {
    const known = ['ring', 'timeline'];
    expect(readModeUsed({ type: MODE_USED_MESSAGE, id: 'ring', at: 1_700_000_000_000 }, known)).toEqual({ type: MODE_USED_MESSAGE, id: 'ring', at: 1_700_000_000_000 });
    for (const bad of [
      null,
      'mode-used',
      [],
      { type: MODE_USED_MESSAGE, id: 'digits', at: 1 },
      { type: MODE_USED_MESSAGE, id: '../ring', at: 1 },
      { type: MODE_USED_MESSAGE, id: 'ring', at: Number.NaN },
      { type: MODE_USED_MESSAGE, id: 'ring', at: -1 },
      { type: MODE_USED_MESSAGE, id: 'ring', at: '1' },
      { type: MODE_USED_MESSAGE, id: 'ring', at: 1, files: ['/api/count'] },
      { type: 'other', id: 'ring', at: 1 },
    ]) {
      expect(readModeUsed(bad, known), JSON.stringify(bad)).toBeNull();
    }
  });

  it('find the modes a file belongs to', () => {
    const byFile = modesByFile({ ring: ['/assets/ring.js', '/assets/shared.js'], timeline: ['/assets/timeline.js', '/assets/shared.js'] });
    expect(byFile.get('/assets/ring.js')).toEqual(['ring']);
    expect(byFile.get('/assets/shared.js')).toEqual(['ring', 'timeline']);
    expect(byFile.get('/assets/index.js')).toBeUndefined();
  });
});
