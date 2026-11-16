/** Display modes through the contract, chosen in settings, and lazy loading. */

import { expect, test } from '@playwright/test';
import { MINUTE, SECOND, openApp } from './helpers.ts';

test('loads ring and timeline only when asked for', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { mode: 'ring' });
  await expect(page.locator('.ring')).toBeVisible();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ring');
  expect(scripts.some((path) => path.includes('/assets/ring-'))).toBe(true);
  expect(scripts.some((path) => path.includes('/assets/timeline-'))).toBe(false);
});

for (const value of ['Ring', 'analog', 'ocean', '../ring', '', 42]) {
  test(`shows digits for a stored mode of ${JSON.stringify(value)}`, async ({ page }) => {
    await openApp(page, { settings: { mode: value } });
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    await expect(page.locator('.ring, .timeline')).toHaveCount(0);
  });
}

test('no longer reads a mode from the address', async ({ page }) => {
  await page.goto('/?mode=ring');
  await page.locator('.button--primary').waitFor();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});

test('the ring tail grows in behind the head and is whole after about nine minutes', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  const masked = () => page.locator('.ring__svg > g[mask]').count();
  expect(await masked()).toBe(1);
  await page.locator('.button--primary').click();
  await page.clock.runFor(5 * MINUTE);
  expect(await masked()).toBe(1);
  await page.clock.runFor(5 * MINUTE);
  expect(await masked()).toBe(0);
});

test('modes record the mode a session started in', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  await expect(page.locator('.timeline__svg')).toBeVisible();
  await expect(page.locator('.timeline .time--main')).toBeVisible();
});

test('modes hold their motion while paused', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(MINUTE);
  await page.locator('.button--primary').click();
  const states = await page.locator('.ring__svg').evaluate((svg) => svg.getAnimations({ subtree: true }).map((animation) => animation.playState));
  expect(states.length).toBeGreaterThan(0);
  expect(new Set(states)).toEqual(new Set(['paused']));
});
