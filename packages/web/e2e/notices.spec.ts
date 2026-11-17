/**
 * Notices (round 2.8; plan, Interface; the "notice: fullscreen tip" frame): one pill above the time, a dismiss ×
 * that holds, and the universal "change" link. These tests start without the dismissed tip the rest of the suite
 * starts with (playwright.config.ts).
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { compareWithReference, openApp, settle } from './helpers.ts';
import { GRAPHITE } from './fixtures/frames.ts';
import { focusFrame } from './fixtures/focus-frames.ts';
import { SMOOTHED_LIMIT, expectLikeFrame } from './pixels.ts';

test.use({ storageState: { cookies: [], origins: [] } });

/** Whether the page can go fullscreen: yes, as on a computer, or no, as on an iPhone. */
async function pageFullscreen(page: Page, enabled: boolean): Promise<void> {
  await page.addInitScript((on) => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => on, configurable: true });
    if (!on) Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined, configurable: true });
  }, enabled);
}

const pill = (page: Page) => page.locator('.pill');

// The pill hangs from the time, so it is drawn in the time's layer: a few of its glyphs' edges land a few levels
// from the frame's (91 pixels measured, smoothed 9). A pill one pixel off differs along its whole outline.
const NOTICE_LIMIT = 150;

test('the idle screen shows the fullscreen tip above the time, as the "notice: fullscreen tip" frame', async ({ page, browser, browserName }) => {
  await pageFullscreen(page, true);
  await openApp(page);
  await expect(pill(page)).toHaveText('fullscreen hides your other tabschange');
  await expect(pill(page)).toHaveAttribute('role', 'status');
  await settle(page);
  const diff = await compareWithReference(page, browser, focusFrame('notice', GRAPHITE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(NOTICE_LIMIT);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(SMOOTHED_LIMIT);
  });
});

test('control: a pill one pixel lower fails the notice frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await pageFullscreen(page, true);
  await openApp(page);
  await pill(page).evaluate((element) => {
    (element as HTMLElement).style.setProperty('translate', '0 1px');
  });
  await settle(page);
  const diff = await compareWithReference(page, browser, focusFrame('notice', GRAPHITE));
  expect(diff.visible, JSON.stringify(diff)).toBeGreaterThan(NOTICE_LIMIT);
});

test('the pill never moves the time, and a dismissed tip stays dismissed', async ({ page }) => {
  await pageFullscreen(page, true);
  await openApp(page);
  const time = page.locator('.time--main');
  const withTip = await time.boundingBox();
  await page.getByRole('button', { name: 'dismiss' }).click();
  await expect(pill(page)).toHaveCount(0);
  expect(await time.boundingBox()).toEqual(withTip);
  // Focus moves on to start rather than being lost with the pill.
  await expect(page.locator('.button--primary')).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":1,"dismissed":["fullscreen"]}');
  await page.reload();
  await page.locator('.button--primary').waitFor();
  await expect(pill(page)).toHaveCount(0);
});

test('"change" turns the setting on at once and opens settings on it, outlined in the accent colour for a moment', async ({ page }) => {
  await pageFullscreen(page, true);
  await openApp(page, { width: 1280, height: 1220 });
  await page.getByRole('button', { name: 'change' }).click();
  const row = page.locator('[data-setting="fullscreenOnStart"]');
  await expect(row).toHaveClass(/setting--highlight/);
  await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ fullscreenOnStart: true });
  // The tip has done its job: it does not come back.
  await expect(pill(page)).toHaveCount(0);
  // The outline comes and goes in 2 seconds by its own CSS animation, by opacity alone: no timer.
  expect(
    await row.evaluate((element) =>
      element.getAnimations({ subtree: true }).map((animation) => ({
        name: animation instanceof CSSAnimation ? animation.animationName : '',
        duration: animation.effect?.getTiming().duration,
        opacity: (animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : []).map((frame) => frame['opacity']),
      })),
    ),
  ).toEqual([{ name: 'setting-highlight', duration: 2000, opacity: ['0', '1', '1', '0'] }]);
  await page.keyboard.press('Escape');
  await expect(pill(page)).toHaveCount(0);
});

test('without page fullscreen (iPhones) there is no tip, and neither fullscreen setting', async ({ page }) => {
  await pageFullscreen(page, false);
  await openApp(page, { width: 1280, height: 800 });
  await expect(pill(page)).toHaveCount(0);
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^display$/ }).click();
  await expect(page.getByRole('group', { name: 'focus view' })).toBeVisible();
  await expect(page.locator('[data-setting="fullscreenOnStart"]')).toBeHidden();
  await expect(page.locator('[data-setting="leaveFullscreen"]')).toBeHidden();
  await expect(page.getByRole('group', { name: 'focus view' }).getByRole('radio', { name: 'after 3 s' })).toBeVisible();
});

test('the tip shows on the idle screen only', async ({ page }) => {
  await pageFullscreen(page, true);
  await openApp(page);
  await expect(pill(page)).toHaveCount(1);
  await page.locator('.button--primary').click();
  await expect(pill(page)).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(pill(page)).toHaveCount(0);
});

test('clear device data brings a dismissed tip back', async ({ page }) => {
  await pageFullscreen(page, true);
  await openApp(page, { width: 1280, height: 800 });
  await page.getByRole('button', { name: 'dismiss' }).click();
  await expect(pill(page)).toHaveCount(0);
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^privacy and data$/ }).click();
  await page.getByRole('button', { name: 'clear device data' }).click();
  await page.getByRole('group', { name: 'clear device data' }).getByRole('button', { name: 'clear', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('notices'))).toBeNull();
  await page.keyboard.press('Escape');
  await expect(pill(page)).toHaveCount(1);
});
