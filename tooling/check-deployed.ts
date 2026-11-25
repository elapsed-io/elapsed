/**
 * Checks a deployed build's status codes, security headers and cookies against
 * the `_headers` file it was built from (plan, Release review: "the CSP and
 * headers are verified on the deployed build, not only locally"). Run it after
 * every deploy, from the commit that was deployed:
 *
 *   node tooling/check-deployed.ts app https://<the test address>
 *   node tooling/check-deployed.ts soon https://elapsed.io
 *   node tooling/check-deployed.ts app https://elapsed.io      (after the launch: the app on elapsed.io)
 *
 * `app` needs `npm run build` first (it reads packages/web/dist/_headers).
 * Behind Cloudflare Access, set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET
 * to a service token (docs/deploy.md, part 3, step 6); nothing else is sent.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RESPONSE_HEADERS } from '../packages/endpoint/src/headers.ts';
import { expectedFor, judge, parseHeadersFile } from './deployed-headers.ts';
import type { Headers, LiveResponse } from './deployed-headers.ts';

const [target, address] = process.argv.slice(2);
if ((target !== 'app' && target !== 'soon') || address === undefined || !address.startsWith('https://')) {
  console.error('usage: node tooling/check-deployed.ts app|soon https://<address>');
  process.exit(2);
}
const origin = new URL(address).origin;
const id = process.env['CF_ACCESS_CLIENT_ID'];
const secret = process.env['CF_ACCESS_CLIENT_SECRET'];
const behindAccess = id !== undefined && secret !== undefined;
const sent: Record<string, string> = behindAccess ? { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret } : {};

/** `open`: a path that must answer without Access's sign-in (docs/deploy.md, part 3, step 4: the bypass rules). */
async function fetchLive(path: string, open = false): Promise<LiveResponse & { readonly text: string }> {
  const response = await fetch(new URL(path, origin), { headers: open ? {} : sent, redirect: 'manual' });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    headers[name.toLowerCase()] = value;
  });
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split('=')[0]?.trim() ?? '');
  return { path, status: response.status, headers, cookies, location: response.headers.get('location'), text: await response.text() };
}

const lower = (headers: Headers): Headers => Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
const file = (relative: string): string => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const problems: string[] = [];
let checked = 0;
async function check(path: string, expected: Headers, status: number, open = false): Promise<string> {
  const live = await fetchLive(path, open);
  const found = judge(live, expected, { status, behindAccess, open });
  problems.push(...found);
  checked += 1;
  console.log(`${found.length === 0 ? 'ok  ' : 'FAIL'} ${String(live.status)} ${path}`);
  return live.text;
}

if (target === 'app') {
  const rules = parseHeadersFile(file('../packages/web/dist/_headers'));
  const page = await check('/', expectedFor(rules, '/'), 200);
  // The deployed page names its own hashed files.
  const assets = [...page.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1] ?? '');
  const script = assets.find((path) => path.endsWith('.js'));
  const stylesheet = assets.find((path) => path.endsWith('.css'));
  if (script === undefined || stylesheet === undefined) problems.push('/: the page names no /assets/ script or stylesheet');
  for (const path of [script, stylesheet]) if (path !== undefined) await check(path, expectedFor(rules, path), 200);
  for (const path of ['/sw.js', '/sw-control.json']) await check(path, expectedFor(rules, path), 200);
  // Browsers fetch these without cookies (the manifest and its icons) or the site sends them without
  // (counts and crash reports), so behind Access they must answer without its sign-in.
  for (const path of ['/manifest.webmanifest', '/icons/icon.svg']) await check(path, expectedFor(rules, path), 200, true);
  // The site's plain pages, served by the app since round 2.16 (Release 1's launch list): privacy, terms, credits.
  for (const path of ['/privacy', '/terms', '/credits/', '/pages.css']) await check(path, expectedFor(rules, path), 200);
  // The Worker: an unknown /api/ path answers 404 with the endpoint's own headers, and counts nothing.
  await check('/api/not-a-route', lower(RESPONSE_HEADERS), 404, true);
} else {
  const rules = parseHeadersFile(file('../packages/soon/public/_headers'));
  // Any other path shows the page too.
  for (const path of ['/', '/privacy', '/terms', '/soon.css', '/legal.css', '/no-such-page']) await check(path, expectedFor(rules, path), 200);
}

console.log(`\n${String(checked)} responses checked${behindAccess ? ' (through Cloudflare Access)' : ''}.`);
if (problems.length > 0) {
  console.log(`\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('Every header matches the build.');
