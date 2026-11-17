/**
 * The test-modes switch (plan, Display modes > Interstellar; the Release 2 advanced frame): `?test=interstellar`
 * offers a "test modes" switch in advanced settings, off by default and offered from then on on this device; on,
 * the test modes' tiles show, with a note; off while one is chosen, the display goes back to digits. Any other
 * `test` value does nothing.
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
const calendarTile = (page: Page) => page.getByRole('radio', { name: 'perpetual calendar' });
const interstellarTile = (page: Page) => page.getByRole('radio', { name: 'interstellar' });

test('without the address asking, there is no switch and no test mode', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveCount(0);
  await openCategory(page, 'display');
  await expect(calendarTile(page)).toHaveCount(0);
  await expect(interstellarTile(page)).toHaveCount(0);
});

test('any other test value does nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?test=calendar');
  await page.locator('.button--primary').waitFor();
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveCount(0);
  await openCategory(page, 'display');
  await expect(calendarTile(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBeNull();
});

test('?test=interstellar offers the switch, off; on, the test modes show with a note; off again, back to digits', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?test=interstellar');
  await page.locator('.button--primary').waitFor();
  await openCategory(page, 'advanced');
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.settings')).toContainText('early modes that may change or disappear. shown after opening elapsed with ?test=interstellar.');
  await openCategory(page, 'display');
  await expect(calendarTile(page)).toHaveCount(0);
  await openCategory(page, 'advanced');
  await testSwitch(page).click();
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'true');
  await openCategory(page, 'display');
  await expect(page.locator('.settings')).toContainText('interstellar appears only while test modes are on.');
  await interstellarTile(page).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'interstellar');
  await calendarTile(page).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'calendar');
  // Offered from now on, without the address asking again.
  await page.goto('/');
  await page.locator('.button--primary').waitFor();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'calendar');
  await openCategory(page, 'advanced');
  await testSwitch(page).click();
  await expect(testSwitch(page)).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  await openCategory(page, 'display');
  await expect(calendarTile(page)).toHaveCount(0);
  await expect(interstellarTile(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBe('{"schema":1,"offered":true,"on":false}');
});

test('a test mode chosen while test modes are off shows digits', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('settings', '{"schema":1,"mode":"interstellar"}');
  });
  await openApp(page);
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});
