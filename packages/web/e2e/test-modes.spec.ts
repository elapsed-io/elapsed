/**
 * The test-modes switch (plan, Display modes > Interstellar; the Release 2 advanced frame): `?test=modes` or
 * `?test=interstellar` offers a "test modes" switch in advanced settings, off by default and offered from then on
 * on this device; on, the test modes' tiles show (ocean depth, height, tree, interstellar), with a note; off while
 * one is chosen, the display shows digits and the choice is kept for when testing ends. Any other `test` value does
 * nothing.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { openApp } from './helpers.ts';

async function openCategory(page: Page, name: string): Promise<void> {
  if (!(await page.locator('.settings').isVisible())) await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const row = page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
}

const testSwitch = (page: Page) => page.getByRole('switch', { name: 'test modes' });
const TEST_TILES = ['ocean depth', 'height', 'tree', 'interstellar'] as const;
const tile = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });
const interstellarTile = (page: Page) => tile(page, 'interstellar');
const oceanTile = (page: Page) => tile(page, 'ocean depth');

async function expectNoTestTiles(page: Page): Promise<void> {
  for (const name of TEST_TILES) await expect(tile(page, name)).toHaveCount(0);
}

test('without the address asking, there is no switch and no test mode', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveCount(0);
  await openCategory(page, 'display');
  await expectNoTestTiles(page);
});

test('any other test value does nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?test=calendar');
  await page.locator('.button--primary').waitFor();
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveCount(0);
  await openCategory(page, 'display');
  await expectNoTestTiles(page);
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBeNull();
});

for (const ask of ['modes', 'interstellar']) {
  test(`?test=${ask} offers the switch, off`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/?test=${ask}`);
    await page.locator('.button--primary').waitFor();
    await openCategory(page, 'advanced');
    await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await openCategory(page, 'display');
    await expectNoTestTiles(page);
  });
}

test('on, the four test modes show with a note; off again, digits shows and the choice is kept', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?test=modes');
  await page.locator('.button--primary').waitFor();
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.settings')).toContainText('early modes that may change or disappear. shown after opening elapsed with ?test=interstellar.');
  await openCategory(page, 'display');
  await expectNoTestTiles(page);
  await openCategory(page, 'advanced');
  await testSwitch(page).click();
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'true');
  await openCategory(page, 'display');
  await expect(page.locator('.settings')).toContainText('interstellar appears only while test modes are on.');
  for (const name of TEST_TILES) await expect(tile(page, name)).toHaveCount(1);
  await interstellarTile(page).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'interstellar');
  await oceanTile(page).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ocean');
  // Offered from now on, without the address asking again.
  await page.goto('/');
  await page.locator('.button--primary').waitFor();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ocean');
  await openCategory(page, 'advanced');
  await testSwitch(page).click();
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  await openCategory(page, 'display');
  await expectNoTestTiles(page);
  await expect(tile(page, 'digits')).toHaveAttribute('aria-checked', 'true');
  // The choice is kept for when testing ends.
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ mode: 'ocean' });
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBe('{"schema":1,"offered":true,"on":false}');
});

for (const chosen of ['ocean', 'height', 'tree', 'interstellar']) {
  test(`${chosen} chosen while test modes are off shows digits, the choice kept`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (localStorage.getItem('settings') === null) localStorage.setItem('settings', JSON.stringify({ schema: 1, mode }));
    }, chosen);
    await openApp(page);
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ mode: chosen });
  });
}

test('a stored perpetual calendar, now removed, reads as digits', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('settings') === null) localStorage.setItem('settings', '{"schema":1,"mode":"calendar"}');
  });
  await openApp(page);
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});
