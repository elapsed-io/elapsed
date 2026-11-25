/**
 * Release review: "the data inventory matches a live session: no third-party
 * requests, no unexpected storage keys or cookies" (plan, Release review).
 * One visit uses everything Release 1 has (every settings category, a built-in
 * font, ring and timeline, custom CSS, crash reports, a paused session, the
 * results, a reload) and, since the Release 2 review (round 2.16), what Release
 * 2 adds (analog, a downloaded mode; check-ins off; keep screen awake; the
 * privacy page, terms and credits), and checks every request, every request
 * body and every stored key against docs/data-inventory.md.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, endThroughCountdown, finishResults, openApp } from './helpers.ts';

/** Every path a visit may request, by docs/data-inventory.md ("Requests on a visit" and "Requests later"). */
const ALLOWED_PATHS: readonly RegExp[] = [
  /^\/$/, // the page
  /^\/assets\/[\w.-]+\.(?:js|css|woff2)$/, // scripts, stylesheets and fonts, the site's own build
  /^\/icons\/[\w.-]+\.(?:svg|png)$/, // the tab icon and the app icons
  /^\/manifest\.webmanifest$/,
  /^\/sw-control\.json$/, // the offline kill switch
  /^\/sw\.js$/,
  /^\/api\/count$/,
  /^\/api\/crash$/,
  // The site's plain pages and their stylesheet (round 2.16).
  /^\/(?:privacy|terms)$/,
  /^\/credits\/$/,
  /^\/pages\.css$/,
];

/** The only keys the inventory lists. */
const LOCAL_KEYS = ['custom-css', 'notices', 'settings', 'timer.active', 'timer.heartbeat'];
const SESSION_KEYS = ['timer.finished'];

interface Sent {
  readonly method: string;
  readonly url: string;
  readonly body: string | null;
}

async function storedKeys(page: Page): Promise<{ local: string[]; session: string[]; databases: (string | undefined)[] }> {
  return page.evaluate(async () => ({
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
    databases: (await indexedDB.databases()).map((database) => database.name),
  }));
}

test('a live session sends and stores only what the data inventory lists', async ({ page, context, baseURL }) => {
  const sent: Sent[] = [];
  context.on('request', (request) => {
    sent.push({ method: request.method(), url: request.url(), body: request.postData() });
  });
  // The preview server has no endpoint; the Worker's answers are stood in for.
  await context.route('**/api/{count,crash}', (route) => route.fulfill({ status: 204 }));
  // Notifications allowed, as a browser would after its prompt.
  await page.addInitScript(() => {
    const fake = { permission: 'granted', requestPermission: () => Promise.resolve('granted') };
    Object.defineProperty(window, 'Notification', { value: fake, configurable: true });
  });

  await openApp(page, { width: 1280, height: 800 });
  const row = (name: string) => page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });
  const open = async (name: string): Promise<void> => {
    if ((await row(name).getAttribute('aria-expanded')) !== 'true') await row(name).click();
  };

  // Every category, with something chosen in each that can send or store anything.
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  await open('timer');
  // Release 2's timer switches: check-ins off, keep screen awake left on (it holds a wake lock, nothing stored).
  await page.getByRole('switch', { name: 'check-ins' }).click();
  await open('display');
  // Analog first, a downloaded mode, then ring.
  await page.getByRole('radio', { name: 'analog' }).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'analog');
  await page.getByRole('radio', { name: 'ring' }).click();
  await open('appearance');
  await expect(page.locator('.font-tile--loading')).toHaveCount(0);
  await page.getByRole('radio', { name: 'jetbrains mono' }).click();
  await open('notifications');
  await page.getByRole('switch', { name: 'check-in notifications' }).click();
  await open('privacy and data');
  await page.getByRole('switch', { name: 'crash reports' }).click();
  await open('advanced');
  await page.locator('.css-editor').waitFor();
  await page.getByLabel('custom css').fill('.time { letter-spacing: -0.01em; }');
  await page.getByRole('button', { name: 'save', exact: true }).click();
  await page.keyboard.press('Escape');

  // A session in ring, paused and resumed, switched to timeline, then ended.
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * MINUTE);
  await page.locator('.button--primary').click();
  await page.clock.runFor(20 * SECOND);
  await page.locator('.button--primary').click();
  await page.keyboard.press(',');
  await open('display');
  await page.getByRole('radio', { name: 'timeline' }).click();
  await page.keyboard.press('Escape');
  await page.clock.runFor(2 * MINUTE);
  expect(await storedKeys(page)).toEqual({ local: LOCAL_KEYS, session: [], databases: [] });
  await endThroughCountdown(page);
  await finishResults(page);

  // An error in the page, with crash reports on.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener('unhandledrejection', () => {
          resolve();
        }, { once: true });
        void Promise.reject(new Error('planted "private words"'));
      }),
  );
  await expect.poll(() => sent.filter((request) => request.url.endsWith('/api/crash')).length).toBe(1);
  await page.reload();
  await page.locator('.results').waitFor();

  // The plain pages, in this tab: they read the settings for the theme and store nothing.
  for (const path of ['/privacy', '/terms', '/credits/']) {
    await page.goto(path);
    await page.locator('html[data-scheme]').waitFor({ state: 'attached' });
  }
  await page.goBack();

  // Requests: the site's own origin, its own paths, and nothing in a body beyond the inventory.
  const origin = new URL(baseURL ?? '').origin;
  const remote = sent.filter((request) => !/^(?:data|blob):/.test(request.url));
  expect(remote.filter((request) => new URL(request.url).origin !== origin)).toEqual([]);
  expect(remote.map((request) => new URL(request.url).pathname).filter((path) => !ALLOWED_PATHS.some((allowed) => allowed.test(path)))).toEqual([]);
  expect(remote.filter((request) => request.method !== 'GET' && !/\/api\/(?:count|crash)$/.test(request.url))).toEqual([]);
  expect(remote.filter((request) => request.method === 'GET').every((request) => new URL(request.url).search === '')).toBe(true);
  const counts = remote.filter((request) => request.url.endsWith('/api/count')).map((request) => request.body);
  expect(new Set(counts)).toEqual(new Set(['{"event":"visit"}', '{"event":"session"}']));
  const crash = JSON.parse(remote.find((request) => request.url.endsWith('/api/crash'))?.body ?? '{}') as Record<string, unknown>;
  expect(Object.keys(crash).sort()).toEqual(['browser', 'browserVersion', 'message', 'stack', 'version']);
  expect(JSON.stringify(crash)).not.toContain('private');

  // Storage: only the inventory's keys; the finished session in this tab only; no database without a font file.
  // `notices` is the dismissed tip every test starts with (playwright.config.ts).
  expect(await storedKeys(page)).toEqual({ local: ['custom-css', 'notices', 'settings'], session: SESSION_KEYS, databases: [] });
  expect(await context.cookies()).toEqual([]);
});
