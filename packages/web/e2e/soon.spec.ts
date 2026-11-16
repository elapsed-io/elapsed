/**
 * The "soon" page elapsed.io shows before launch (packages/soon): both frames
 * pixel for pixel, served with the page's own headers, with no script, no
 * cookie and no request beyond its own files.
 */

import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GRAPHITE, PAPER, inPalette, soonFrame } from './fixtures/frames.ts';
import { screenshotReference } from './helpers.ts';
import { diffPngs } from './pixels.ts';

const PUBLIC = fileURLToPath(new URL('../../soon/public/', import.meta.url));
const SOON = 'https://soon.test';
const TYPES: Readonly<Record<string, string>> = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

/** The headers `_headers` gives every path. */
function headers(): Record<string, string> {
  const lines = readFileSync(join(PUBLIC, '_headers'), 'utf8').split('\n').filter((line) => /^\s+\S/.test(line));
  return Object.fromEntries(lines.map((line) => line.trim().split(/:\s(.*)/s).slice(0, 2) as [string, string]));
}

/** Serves packages/soon/public as Cloudflare would: its files with its headers, and the page for any other path. */
async function openSoon(page: Page, colorScheme: 'dark' | 'light', viewport = { width: 720, height: 450 }): Promise<{ requests: string[]; violations: () => Promise<string[]> }> {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme });
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__violations', { value: seen });
    document.addEventListener('securitypolicyviolation', (event) => seen.push(`${event.effectiveDirective}: ${event.blockedURI}`));
  });
  await page.route(`${SOON}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = path === '/' || extname(path) === '' ? 'index.html' : path.slice(1);
    let body: Buffer;
    try {
      body = readFileSync(join(PUBLIC, file));
    } catch {
      body = readFileSync(join(PUBLIC, 'index.html'));
    }
    return route.fulfill({ body, headers: { ...headers(), 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' } });
  });
  await page.goto(`${SOON}/`);
  await page.evaluate(() => document.fonts.ready);
  return { requests, violations: () => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations.slice()) };
}

for (const [scheme, palette, frame] of [
  ['dark', GRAPHITE, 'soon'],
  ['light', PAPER, 'soon, light'],
] as const) {
  test(`with a ${scheme} system setting it matches the "${frame}" frame exactly`, async ({ page, browser }) => {
    await openSoon(page, scheme);
    const site = await page.screenshot();
    const scratch = await browser.newPage();
    const diff = await diffPngs(scratch, site, await screenshotReference(browser, inPalette(palette, soonFrame)));
    await scratch.close();
    expect(diff.differing, JSON.stringify(diff)).toBe(0);
  });
}

test('runs no script, sets no cookie, and loads only its own files under its policy', async ({ page, context }) => {
  const { requests, violations } = await openSoon(page, 'dark');
  expect(await page.locator('script').count()).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  expect(await context.cookies()).toEqual([]);
  expect(await violations()).toEqual([]);
  // The page, its stylesheet and font, and (when the browser asks for it) the tab icon.
  const allowed = new Set([`${SOON}/`, `${SOON}/soon.css`, `${SOON}/soon.woff2`, `${SOON}/icon.svg`]);
  expect(requests.filter((url) => !allowed.has(url))).toEqual([]);
  expect(requests).toEqual(expect.arrayContaining([`${SOON}/`, `${SOON}/soon.css`, `${SOON}/soon.woff2`]));
  expect(headers()['Content-Security-Policy']).not.toMatch(/script-src|unsafe/);
});

test('only the word scales with the window, and nothing scrolls on a phone', async ({ page }) => {
  await openSoon(page, 'light', { width: 1440, height: 900 });
  expect(await page.locator('.soon__word').evaluate((element) => getComputedStyle(element).fontSize)).toBe('240px');
  expect(await page.locator('.soon__name').evaluate((element) => getComputedStyle(element).fontSize)).toBe('13px');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('any path shows the page', async ({ page }) => {
  await openSoon(page, 'dark');
  await page.goto(`${SOON}/some/old/link`);
  await expect(page.locator('h1')).toHaveText('soon');
});
