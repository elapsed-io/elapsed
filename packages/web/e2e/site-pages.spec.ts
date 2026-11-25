/**
 * The privacy page and terms, served by the app since round 2.16 (Release 1's launch list: "serve the privacy and
 * terms pages from the app"), from the same sources as the soon page's (docs/legal), in the app's edition, laid out
 * and themed as the credits page is; and the settings footer that links them (the source code link hidden until the
 * owner confirms the repository is public).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { editionBlocks } from '../../soon/scripts/legal.ts';
import { openApp } from './helpers.ts';

const source = (page: 'privacy' | 'terms'): string => readFileSync(fileURLToPath(new URL(`../../../docs/legal/${page}.md`, import.meta.url)), 'utf8');

/** Opens a page, collecting anything the browser refuses or reports. */
async function open(page: Page, path: string): Promise<{ errors: string[]; headers: Record<string, string> }> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await page.locator('html[data-scheme]').waitFor({ state: 'attached' });
  return { errors, headers: response?.headers() ?? {} };
}

for (const name of ['privacy', 'terms'] as const) {
  test(`/${name} is served by the app, in its own edition of docs/legal/${name}.md, under the site's security policy`, async ({ page }) => {
    const { errors, headers } = await open(page, `/${name}`);
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).toContain("style-src 'self'");
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    await expect(page).toHaveTitle(`${name} · elapsed`);
    await expect(page.locator('h1')).toHaveText(name);
    // Every heading of the app's edition, in order; none of the soon page's alone.
    const headings = editionBlocks(source(name), 'app')
      .filter((block) => /^#{1,3} /.test(block))
      .map((block) => block.replace(/^#{1,3} /, ''));
    await expect(page.locator('main :is(h1, h2, h3)')).toHaveText(headings);
    await expect(page.locator('main')).not.toContainText('elapsed.io today');
    await expect(page.locator('main')).not.toContainText('has not opened yet');
    // The footer's links, this page marked as the one shown.
    await expect(page.locator('nav.links a')).toHaveText(['privacy', 'terms', 'credits']);
    await expect(page.locator('nav.links a[aria-current="page"]')).toHaveText(name);
    expect(errors).toEqual([]);
  });
}

test('the privacy page tells what Release 2 keeps on the device', async ({ page }) => {
  await open(page, '/privacy');
  const kept = page.locator('main ul').first().locator('li');
  await expect(kept.filter({ hasText: 'The tips you have seen' })).toHaveCount(1);
  await expect(kept.filter({ hasText: 'A mode you have not used for 30 days is removed' })).toHaveCount(1);
  await expect(page.locator('main')).toContainText('You use the timer at elapsed.io without an account.');
  await expect(page.locator('a[href="mailto:privacy@elapsed.io"]')).toHaveCount(1);
});

test('the pages follow the chosen theme, and read at 320 px and at 200 % zoom without sideways scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('settings', JSON.stringify({ schema: 4, theme: 'sand' }));
  });
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ['/privacy', '/terms']) {
    await open(page, path);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(243, 227, 195)');
    await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
  // 200 % zoom of a 1280 px window: the same as a 640 px one.
  await page.setViewportSize({ width: 640, height: 400 });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('zoom', '2');
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
});

test('the settings footer links the app’s own privacy page and terms, and hides the source code link', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const links = page.locator('.settings__links a');
  await expect(links).toHaveText(['privacy', 'terms', 'feedback', 'credits']);
  await expect(links.filter({ hasText: /^privacy$/ })).toHaveAttribute('href', '/privacy');
  await expect(links.filter({ hasText: /^terms$/ })).toHaveAttribute('href', '/terms');
  await expect(links.filter({ hasText: /^privacy$/ })).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: 'source code' })).toHaveCount(0);
  // It opens, from this copy of the site.
  const [privacy] = await Promise.all([page.context().waitForEvent('page'), links.filter({ hasText: /^privacy$/ }).click()]);
  await privacy.waitForLoadState();
  expect(new URL(privacy.url()).pathname).toBe('/privacy');
  await expect(privacy.locator('h1')).toHaveText('privacy');
});
