/**
 * Round 4: offline use through the service worker, and its remote kill
 * switch. The worker is allowed only here (playwright.config.ts blocks it
 * elsewhere, where it would answer requests out of the tests' reach).
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { corePaths } from './helpers.ts';

test.use({ serviceWorkers: 'allow' });

async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const found: string[] = [];
    (window as unknown as { __violations: string[] }).__violations = found;
    document.addEventListener('securitypolicyviolation', (event) => found.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  return () => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
}

/** Waits until the service worker has installed the core and controls the page. */
async function untilOffline(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller === null) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        }, { once: true });
      });
    }
  });
}

test('registers the service worker under the CSP and Trusted Types, and works offline', async ({ page, context }) => {
  const violations = await watchViolations(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await untilOffline(page);
  expect(await violations()).toEqual([]);
  expect(errors).toEqual([]);
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names[0] ?? '');
    return { names, paths: (await cache.keys()).map((request) => new URL(request.url).pathname).sort() };
  });
  expect(cached.names).toHaveLength(1);
  expect(cached.names[0]).toMatch(/^timer-offline-[0-9a-f]{16}$/);
  // The core files (as the size check counts them), the manifest and the icon; no display mode or other font.
  expect(cached.paths).toEqual([...corePaths(), '/icons/icon.svg', '/manifest.webmanifest'].sort());
  expect(cached.paths.filter((path) => path.startsWith('/api/'))).toEqual([]);

  await context.setOffline(true);
  await page.reload();
  // The script has run once its live region exists (the button itself is in the static page).
  await page.locator('[role="status"]').waitFor({ state: 'attached' });
  await page.keyboard.press('Space');
  await expect(page.locator('.button--primary')).toHaveAccessibleName('pause');
  await context.setOffline(false);
});

test('keeps a display mode picked once for offline use, but never fetches one in advance', async ({ page, context }) => {
  await page.goto('/');
  await untilOffline(page);
  const cachedModes = () =>
    page.evaluate(async () =>
      (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url))))
        .flat()
        .filter((url) => /\/assets\/(ring|timeline)-/.test(url)).length,
    );
  expect(await cachedModes()).toBe(0);
  await page.evaluate(() => {
    localStorage.setItem('settings', JSON.stringify({ schema: 1, mode: 'ring' }));
  });
  await page.goto('/');
  await page.locator('.ring').waitFor();
  expect(await cachedModes()).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.ring')).toBeVisible();
  await context.setOffline(false);
});

/** What the tests cannot see: Playwright's routes do not reach a service worker's own requests in WebKit. */
const UNROUTABLE = 'Playwright cannot route a service worker’s requests in WebKit; checked by hand in Safari (docs/device-checks.md)';

test('the kill switch unregisters the worker and empties its caches', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', UNROUTABLE);
  await page.goto('/');
  await untilOffline(page);
  await context.route('**/sw-control.json', (route) => route.fulfill({ contentType: 'application/json', body: '{"serviceWorker":"off"}' }));
  await page.reload();
  await expect
    .poll(() => page.evaluate(async () => ({ workers: (await navigator.serviceWorker.getRegistrations()).length, caches: (await caches.keys()).length })))
    .toEqual({ workers: 0, caches: 0 });
});

test('never answers the counting endpoint from a cache', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', UNROUTABLE);
  await page.goto('/');
  await untilOffline(page);
  const counted: string[] = [];
  await context.route('**/api/count', async (route) => {
    counted.push(route.request().postData() ?? '');
    await route.fulfill({ status: 204 });
  });
  await page.keyboard.press('Space');
  await expect.poll(() => counted).toEqual(['{"event":"session"}']);
  expect(await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url)))).flat().filter((url) => url.includes('/api/')))).toEqual([]);
});
