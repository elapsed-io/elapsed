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

/** Each downloaded mode's cache: its name, the paths it holds, and its recorded last use. */
function modeCaches(page: Page): Promise<{ name: string; paths: string[]; lastUse: number | null }[]> {
  return page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('timer-offline-mode-')).sort();
    return Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        const record = await cache.match('/mode-last-use');
        return { name, paths: requests.map((request) => new URL(request.url).pathname).sort(), lastUse: record === undefined ? null : Number(await record.text()) };
      }),
    );
  });
}

/**
 * Only the names of the downloaded modes' caches. A poll that runs while the page is removing a mode must not
 * open its cache: opening a cache by name creates it, so the poll would put back, empty, the cache the page had
 * just removed (decision 280).
 */
function modeCacheNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await caches.keys()).filter((name) => name.startsWith('timer-offline-mode-')).sort());
}

/** Shows `mode` (a stored setting, as the panel would store it) and waits until it is kept for offline use. */
async function useMode(page: Page, mode: string): Promise<void> {
  await page.evaluate((id) => {
    localStorage.setItem('settings', JSON.stringify({ schema: 2, mode: id }));
  }, mode);
  await page.goto('/');
  await page.locator(`.screen[data-mode="${mode}"]`).waitFor();
  await expect.poll(async () => (await modeCaches(page)).find((cache) => cache.name.endsWith(`-${mode}`))?.lastUse ?? null).not.toBeNull();
}

test('a display mode downloads only when picked, into a cache of its own, and works offline afterwards', async ({ page, context }) => {
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));
  await page.goto('/');
  await untilOffline(page);
  expect(await modeCaches(page)).toEqual([]);
  expect(fetched.filter((path) => /\/assets\/(ring|timeline)-/.test(path))).toEqual([]);
  await useMode(page, 'ring');
  const [ring] = await modeCaches(page);
  expect(ring?.name).toBe('timer-offline-mode-ring');
  // Its code and styles, and its last use; nothing of the other mode, and nothing the version's cache holds.
  expect(ring?.paths.filter((path) => path !== '/mode-last-use').every((path) => /^\/assets\/ring-[\w-]+\.(js|css)$/.test(path))).toBe(true);
  expect(ring?.paths).toContain('/mode-last-use');
  expect(ring?.paths.some((path) => path.endsWith('.js'))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.ring')).toBeVisible();
  await context.setOffline(false);
});

test('settings list downloaded modes with their size, and remove one by hand without touching anything else', async ({ page }) => {
  await page.goto('/');
  await untilOffline(page);
  await useMode(page, 'ring');
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  await page.locator('.settings__row', { hasText: /^display$/ }).click();
  const rows = page.locator('.downloads__row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('ring');
  await expect(rows.first().locator('.setting__value')).toHaveText(/^\d+ KB$/);
  await expect(page.getByText('modes download when you pick them and work offline. ones unused for 30 days are removed.')).toBeVisible();
  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.getByRole('button', { name: 'remove ring' }).click();
  await expect(rows).toHaveCount(0);
  await expect(page.getByText('downloaded modes', { exact: true })).toBeHidden();
  expect(await modeCaches(page)).toEqual([]);
  // Only the mode's files go: its setting, and everything else stored, stay as they were.
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(before);
  await expect(page.locator('.ring')).toBeVisible();
});

test('a mode unused for 30 days is removed when the page loads, but never the one it shows', async ({ page }) => {
  const day = 24 * 60 * 60 * 1000;
  const start = Date.UTC(2026, 10, 2, 9);
  await page.clock.install({ time: start });
  await page.goto('/');
  await untilOffline(page);
  await useMode(page, 'ring');
  await page.clock.setSystemTime(start + 10 * day);
  await useMode(page, 'timeline');
  const used = await modeCaches(page);
  expect(used.map(({ name }) => name)).toEqual(['timer-offline-mode-ring', 'timer-offline-mode-timeline']);
  expect(used[0]?.lastUse).toBeGreaterThanOrEqual(start);
  expect(used[0]?.lastUse).toBeLessThan(start + day);

  // 31 days after ring's last use, 21 after timeline's, showing digits: only ring goes.
  await page.evaluate(() => {
    localStorage.setItem('settings', JSON.stringify({ schema: 2, mode: 'digits' }));
  });
  await page.clock.setSystemTime(start + 31 * day);
  await page.goto('/');
  await expect.poll(() => modeCacheNames(page)).toEqual(['timer-offline-mode-timeline']);

  // Long unused, but the mode about to be shown is kept (and used again).
  await page.evaluate(() => {
    localStorage.setItem('settings', JSON.stringify({ schema: 2, mode: 'timeline' }));
  });
  await page.clock.setSystemTime(start + 60 * day);
  await page.goto('/');
  await page.locator('.timeline').waitFor();
  await expect.poll(() => modeCacheNames(page)).toEqual(['timer-offline-mode-timeline']);
  await expect.poll(async () => (await modeCaches(page)).map(({ name, lastUse }) => [name, (lastUse ?? 0) >= start + 60 * day])).toEqual([['timer-offline-mode-timeline', true]]);
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
