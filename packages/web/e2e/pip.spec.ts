/**
 * Picture-in-picture behind the test flag (round 2.15; owner, answer 38: moved to a later release, its code kept
 * behind the flag, its settings row and corner button hidden at launch). Only Chromium browsers offer a window for
 * a page (the Document Picture-in-Picture API), so the tests of the window itself run there.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, openApp, openSettingsOn, untilEndNowAccepts } from './helpers.ts';

const primary = (page: Page) => page.locator('.screen > .controls .button--primary');
const pipButton = (page: Page) => page.locator('.icon-button--pip');
const pipRow = (page: Page) => page.locator('[data-setting="pictureInPicture"]');

/** What the floating window shows: its time, its buttons, and its colours. */
const pipWindow = (page: Page) =>
  page.evaluate(() => {
    const pip = (window as unknown as { documentPictureInPicture: { window: Window | null } }).documentPictureInPicture.window;
    if (pip === null) return null;
    const doc = pip.document;
    const buttons = [...doc.querySelectorAll('button')].filter((button) => !button.hidden).map((button) => button.textContent);
    return { time: doc.querySelector('.pip__time')?.textContent ?? null, buttons, background: getComputedStyle(doc.body).backgroundColor };
  });

/** Presses a button in the floating window. */
const pressInPip = (page: Page, name: string) =>
  page.evaluate((label) => {
    const pip = (window as unknown as { documentPictureInPicture: { window: Window | null } }).documentPictureInPicture.window;
    const button = [...(pip?.document.querySelectorAll('button') ?? [])].find((candidate) => candidate.textContent === label);
    button?.click();
  }, name);

test('without the flag there is no row, no button and none of its code, even where the browser offers the window', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { width: 1280, height: 1220, pip: true, settings: { pictureInPicture: true } });
  await expect(pipButton(page)).toHaveCount(0);
  await openSettingsOn(page, 'display');
  await expect(pipRow(page)).toHaveCount(0);
  await page.getByRole('searchbox').fill('picture');
  await expect(page.locator('.settings__empty, .settings__no-matches')).toHaveCount(1);
  expect(scripts.filter((path) => path.includes('/assets/pip-'))).toEqual([]);
});

test('with the flag, where the browser offers no window for a page, neither the row nor the button exists', async ({ page }) => {
  await openApp(page, { width: 1280, height: 1220, flagged: true, settings: { pictureInPicture: true } });
  await expect(pipButton(page)).toHaveCount(0);
  await openSettingsOn(page, 'display');
  await expect(pipRow(page)).toHaveCount(0);
});

test.describe('with the flag, where the browser offers the window', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'only Chromium browsers offer a window for a page');

  test('the row, off by default, adds a button left of settings that opens a floating timer with the same time and buttons', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await openApp(page, { width: 1280, height: 1220, flagged: true, pip: true });
    await expect(pipButton(page)).toHaveCount(0);
    await openSettingsOn(page, 'display');
    await expect(pipRow(page).getByRole('switch', { name: 'picture-in-picture' })).toHaveAttribute('aria-checked', 'false');
    await expect(pipRow(page).locator('.setting__help')).toHaveText('adds a button to the timer that opens a small floating timer. shown only in browsers that offer it.');
    await pipRow(page).getByRole('switch').click();
    await page.keyboard.press('Escape');
    await page.locator('.settings').waitFor({ state: 'hidden' });

    // Left of settings, the same size and colour as the other corner icons.
    await expect(page.locator('.corner > *')).toHaveCount(3);
    expect(await page.locator('.corner > *').evaluateAll((items) => items.map((item): string => item.getAttribute('aria-label') ?? item.getAttribute('class') ?? ''))).toEqual([
      'picture-in-picture',
      'settings',
      'icon-button icon-button--placeholder',
    ]);
    const look = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const box = element.getBoundingClientRect();
        const icon = element.querySelector('svg')?.getBoundingClientRect();
        return { width: box.width, height: box.height, icon: [icon?.width, icon?.height], color: getComputedStyle(element).color };
      });
    expect(await look('.icon-button--pip')).toEqual(await look('.icon-button--settings'));
    // Each has its own 44 px tap area, and the two never overlap.
    const area = (selector: string) =>
      page.locator(selector).evaluate((element) => {
        const box = element.getBoundingClientRect();
        const before = getComputedStyle(element, '::before');
        const left = box.left + Number.parseFloat(before.left);
        const right = box.right - Number.parseFloat(before.right);
        return { left, right, height: box.height - Number.parseFloat(before.top) - Number.parseFloat(before.bottom) };
      });
    const pipArea = await area('.icon-button--pip');
    const settingsArea = await area('.icon-button--settings');
    expect([pipArea.right - pipArea.left, pipArea.height, settingsArea.right - settingsArea.left, settingsArea.height]).toEqual([44, 44, 44, 44]);
    expect(pipArea.right).toBeLessThanOrEqual(settingsArea.left);

    await primary(page).click();
    await page.clock.runFor(MINUTE + 5 * SECOND);
    await pipButton(page).click();
    await expect.poll(() => pipWindow(page)).toEqual({ time: '00:01:05', buttons: ['pause', 'end'], background: 'rgb(14, 15, 17)' });
    // It follows the timer, and its buttons do what the timer's do.
    await page.clock.runFor(SECOND);
    await expect.poll(async () => (await pipWindow(page))?.time).toBe('00:01:06');
    await pressInPip(page, 'pause');
    await expect(primary(page)).toHaveAccessibleName('resume');
    await expect.poll(async () => (await pipWindow(page))?.buttons).toEqual(['resume', 'end']);
    await pressInPip(page, 'resume');
    await expect(primary(page)).toHaveAccessibleName('pause');
    await pressInPip(page, 'end');
    await untilEndNowAccepts(page);
    await page.getByRole('button', { name: 'end now' }).click();
    await page.locator('.results').waitFor();
    await expect.poll(async () => (await pipWindow(page))?.buttons).toEqual(['start']);

    // Closed, it lets go of everything; the button opens a fresh one.
    await page.evaluate(() => {
      (window as unknown as { documentPictureInPicture: { window: Window | null } }).documentPictureInPicture.window?.close();
    });
    await expect.poll(() => pipWindow(page)).toBeNull();
    expect(errors).toEqual([]);
  });

  test('switching the setting off removes the button and closes the window', async ({ page }) => {
    await openApp(page, { width: 1280, height: 1220, flagged: true, pip: true, settings: { pictureInPicture: true } });
    await pipButton(page).click();
    await expect.poll(async () => (await pipWindow(page))?.buttons).toEqual(['start']);
    await openSettingsOn(page, 'display');
    await pipRow(page).getByRole('switch').click();
    await expect(pipButton(page)).toHaveCount(0);
    await expect.poll(() => pipWindow(page)).toBeNull();
  });
});
