/**
 * The "soon" page elapsed.io shows before launch, and its privacy and terms
 * pages (packages/soon): the page matches both frames pixel for pixel (drawn
 * in the page's own cut of the default font), every page is served with its
 * own headers, runs no script, sets no cookie and requests only its own
 * files, and the legal pages reflow on phones and at 200 % zoom.
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
const SOON_FONT = readFileSync(join(PUBLIC, 'soon.woff2'));

/** The file Cloudflare's static assets serve for a path: `/terms` is terms.html; any other unknown path is the page. */
function fileFor(path: string): string {
  if (path === '/') return 'index.html';
  if (extname(path) !== '') return path.slice(1);
  const page = `${path.slice(1)}.html`;
  try {
    readFileSync(join(PUBLIC, page));
    return page;
  } catch {
    return 'index.html';
  }
}

/** The headers `_headers` gives every path. */
function headers(): Record<string, string> {
  const lines = readFileSync(join(PUBLIC, '_headers'), 'utf8').split('\n').filter((line) => /^\s+\S/.test(line));
  return Object.fromEntries(lines.map((line) => line.trim().split(/:\s(.*)/s).slice(0, 2) as [string, string]));
}

/** Serves packages/soon/public as Cloudflare would: its files with its headers, and the page for any other path. */
async function openSoon(page: Page, colorScheme: 'dark' | 'light', viewport = { width: 720, height: 450 }, path = '/'): Promise<{ requests: string[]; violations: () => Promise<string[]> }> {
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
    const file = fileFor(new URL(route.request().url()).pathname);
    let body: Buffer;
    try {
      body = readFileSync(join(PUBLIC, file));
    } catch {
      body = readFileSync(join(PUBLIC, 'index.html'));
    }
    return route.fulfill({ body, headers: { ...headers(), 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' } });
  });
  await page.goto(`${SOON}${path}`);
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
    const diff = await diffPngs(scratch, site, await screenshotReference(browser, inPalette(palette, soonFrame), undefined, SOON_FONT));
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

test('the privacy and terms links open their pages, and lead back', async ({ page }) => {
  await openSoon(page, 'dark');
  await page.getByRole('link', { name: 'privacy', exact: true }).click();
  await expect(page).toHaveURL(`${SOON}/privacy`);
  await expect(page.locator('h1')).toHaveText('privacy');
  await expect(page.getByRole('link', { name: 'privacy', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'terms', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('terms');
  await page.getByRole('link', { name: 'elapsed', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('soon');
});

for (const path of ['/privacy', '/terms']) {
  test(`${path} runs no script, sets no cookie, loads only its own files, and reflows`, async ({ page, context }) => {
    const { requests, violations } = await openSoon(page, 'light', { width: 1280, height: 800 }, path);
    expect(await page.locator('script').count()).toBe(0);
    expect(await context.cookies()).toEqual([]);
    expect(await violations()).toEqual([]);
    const allowed = new Set([`${SOON}${path}`, `${SOON}/legal.css`, `${SOON}/legal.woff2`, `${SOON}/icon.svg`]);
    expect(requests.filter((url) => !allowed.has(url))).toEqual([]);
    await expect(page.locator('.legal__date')).toHaveText('Effective November 15, 2026.');
    // Every character drawn in the page's own font.
    expect(await page.evaluate(() => document.fonts.check('15px "Timer Sans"', document.body.innerText))).toBe(true);
    // 320 px wide, and 200 % zoom of a 1280 px window: no sideways scrolling.
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), String(width)).toBe(width);
    }
  });
}

test('the links have 44 px tap areas and a visible focus ring', async ({ page }) => {
  await openSoon(page, 'dark');
  for (const name of ['privacy', 'terms']) {
    const area = await page.getByRole('link', { name, exact: true }).evaluate((element) => {
      const before = getComputedStyle(element, '::before');
      return [before.width, before.height];
    });
    expect(area).toEqual(['44px', '44px']);
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'privacy', exact: true })).toBeFocused();
  expect(await page.getByRole('link', { name: 'privacy', exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
});
