import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HEADER_RULES, renderHeadersFile } from '../packages/web/build/headers.ts';
import { ACCESS_COOKIE, expectedFor, judge, matches, parseHeadersFile } from './deployed-headers.ts';
import type { LiveResponse } from './deployed-headers.ts';

const app = parseHeadersFile(renderHeadersFile(HEADER_RULES));
const soon = parseHeadersFile(readFileSync(fileURLToPath(new URL('../packages/soon/public/_headers', import.meta.url)), 'utf8'));

const live = (path: string, headers: Record<string, string>, extra: Partial<LiveResponse> = {}): LiveResponse => ({
  path,
  status: 200,
  headers,
  cookies: [],
  location: null,
  ...extra,
});

describe('deployed headers', () => {
  it('reads back exactly the rules the build writes', () => {
    expect(app.map((rule) => rule.path)).toEqual(HEADER_RULES.map((rule) => rule.path));
    for (const [index, rule] of HEADER_RULES.entries()) {
      expect(app[index]?.headers).toEqual(Object.fromEntries(Object.entries(rule.headers).map(([name, value]) => [name.toLowerCase(), value])));
    }
  });

  it('matches paths as Cloudflare does', () => {
    expect(matches('/*', '/')).toBe(true);
    expect(matches('/assets/*', '/assets/index-abc.js')).toBe(true);
    expect(matches('/assets/*', '/sw.js')).toBe(false);
    expect(matches('/sw.js', '/swxjs')).toBe(false);
  });

  it('gives a hashed asset the security headers and a year of caching', () => {
    const expected = expectedFor(app, '/assets/index-abc.js');
    expect(expected['content-security-policy']).toContain("script-src 'self'");
    expect(expected['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(expectedFor(app, '/sw-control.json')['cache-control']).toBe('no-store');
  });

  it('passes a response that carries every header, and names each one that is missing or different', () => {
    const expected = expectedFor(app, '/');
    expect(judge(live('/', { ...expected, server: 'cloudflare' }), expected, { status: 200, behindAccess: false })).toEqual([]);
    const withoutCsp = Object.fromEntries(Object.entries(expected).filter(([name]) => name !== 'content-security-policy'));
    const problems = judge(live('/', { ...withoutCsp, 'referrer-policy': 'origin' }), expected, { status: 200, behindAccess: false });
    expect(problems).toEqual(['/: no content-security-policy header', '/: referrer-policy is "origin", expected "no-referrer"']);
  });

  it('refuses any cookie, except Access’s own while the test run is behind it', () => {
    const expected = expectedFor(soon, '/');
    const withCookie = (name: string) => live('/', expected, { cookies: [name] });
    expect(judge(withCookie('__cf_bm'), expected, { status: 200, behindAccess: true })).toEqual(['/: sets a cookie, __cf_bm (the privacy page says there are none)']);
    expect(judge(withCookie(ACCESS_COOKIE), expected, { status: 200, behindAccess: true })).toEqual([]);
    expect(judge(withCookie(ACCESS_COOKIE), expected, { status: 200, behindAccess: false })).toHaveLength(1);
  });

  it('says so when Cloudflare Access stops the check at its sign-in', () => {
    const response = live('/', {}, { status: 302, location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login' });
    expect(judge(response, expectedFor(app, '/'), { status: 200, behindAccess: false })[0]).toMatch(/service token/);
  });
});
