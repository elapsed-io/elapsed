/**
 * Notices (round 2.8; plan, Interface; the "notice: fullscreen tip" frame): one pill above the time, a dismiss ×
 * that holds, and the universal "change" link. These tests start without the dismissed tip the rest of the suite
 * starts with (playwright.config.ts).
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, compareWithReference, endThroughCountdown, openApp, openSettingsOn, settle } from './helpers.ts';
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
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":2,"dismissed":["fullscreen"],"firstSession":false}');
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
  await openSettingsOn(page, 'display');
  await expect(page.getByRole('group', { name: 'focus mode' })).toBeVisible();
  await expect(page.locator('[data-setting="fullscreenOnStart"]')).toBeHidden();
  await expect(page.locator('[data-setting="leaveFullscreen"]')).toBeHidden();
  await expect(page.getByRole('group', { name: 'focus mode' }).getByRole('radio', { name: 'after 3 s' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'focus mode' }).getByRole('radiogroup', { name: 'hide seconds after starting' })).toBeVisible();
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

// The seconds tip (round 2.14; plan version 13, answer 37; the "notice: seconds tip" frame): on the idle screen
// after the person’s first completed session, only while "hide seconds after starting" is "never" (plan version 14,
// answer 37); the fullscreen tip comes before it.

/** Starts a session, lets it run, ends it and goes back to the timer: a first completed session. */
async function completeSession(page: Page): Promise<void> {
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * MINUTE);
  await endThroughCountdown(page);
  await page.getByRole('button', { name: 'back to the timer' }).click();
  await expect(page.locator('.results')).toBeHidden();
}

/** Stores a notices record before the first load, unless one is stored (a reload keeps what the page wrote). */
async function seedNotices(page: Page, record: string): Promise<void> {
  await page.addInitScript((text) => {
    if (localStorage.getItem('notices') === null) localStorage.setItem('notices', text);
  }, record);
}

const SECONDS_TIP = 'seconds can fade out after a minute, for a calmer screenchange';

test('after the first completed session the idle screen shows the seconds tip instead, as the "notice: seconds tip" frame', async ({ page, browser, browserName }) => {
  await pageFullscreen(page, true);
  await openApp(page);
  // Before the first session: the fullscreen tip, alone.
  await expect(pill(page)).toHaveText('fullscreen hides your other tabschange');
  await completeSession(page);
  // After it: the seconds tip, alone, though the fullscreen tip was never dismissed.
  await expect(pill(page)).toHaveCount(1);
  await expect(pill(page)).toHaveText(SECONDS_TIP);
  await expect(pill(page)).toHaveAttribute('role', 'status');
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":2,"dismissed":[],"firstSession":true}');
  await settle(page);
  const diff = await compareWithReference(page, browser, focusFrame('noticeSeconds', GRAPHITE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(NOTICE_LIMIT);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(SMOOTHED_LIMIT);
  });
  // The moment is kept: a reload shows the seconds tip again until it is dismissed or acted on.
  await page.reload();
  await page.locator('.button--primary').waitFor();
  await expect(pill(page)).toHaveText(SECONDS_TIP);
});

test('without page fullscreen (iPhones) the seconds tip still comes after the first session', async ({ page }) => {
  await pageFullscreen(page, false);
  await openApp(page);
  await expect(pill(page)).toHaveCount(0);
  await completeSession(page);
  await expect(pill(page)).toHaveText(SECONDS_TIP);
});

test('"change" on the seconds tip sets hide seconds after starting to blur away and opens settings on it, outlined in the accent colour', async ({ page }) => {
  await pageFullscreen(page, true);
  await seedNotices(page, '{"schema":2,"dismissed":[],"firstSession":true}');
  await openApp(page, { width: 1280, height: 1220 });
  await expect(pill(page)).toHaveText(SECONDS_TIP);
  await page.getByRole('button', { name: 'change' }).click();
  const row = page.locator('[data-setting="hideSeconds"]');
  await expect(row).toHaveClass(/setting--highlight/);
  await expect(row).toBeInViewport();
  await expect(page.getByRole('radiogroup', { name: 'hide seconds after starting' }).getByRole('radio', { name: 'blur away' })).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ hideSeconds: 'blur-away' });
  await expect(pill(page)).toHaveCount(0);
  // Acted on, it never returns; nor does the fullscreen tip, whose moment has passed.
  await page.keyboard.press('Escape');
  await expect(pill(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":2,"dismissed":["seconds"],"firstSession":true}');
  await page.reload();
  await page.locator('.button--primary').waitFor();
  await expect(pill(page)).toHaveCount(0);
});

test('the seconds tip shows only while hide seconds after starting is "never", and a dismissed one never returns', async ({ page }) => {
  await pageFullscreen(page, true);
  await seedNotices(page, '{"schema":2,"dismissed":[],"firstSession":true}');
  await openApp(page, { width: 1280, height: 800, settings: { hideSeconds: 'right-away' } });
  await expect(pill(page)).toHaveCount(0);
  // Back to never hiding them: the tip's moment has come.
  await openSettingsOn(page, 'display');
  await page.getByRole('radiogroup', { name: 'hide seconds after starting' }).getByRole('radio', { name: 'never' }).click();
  await page.keyboard.press('Escape');
  await expect(pill(page)).toHaveText(SECONDS_TIP);
  await page.getByRole('button', { name: 'dismiss' }).click();
  await expect(pill(page)).toHaveCount(0);
  await expect(page.locator('.button--primary')).toBeFocused();
  // Another session and a reload bring nothing back.
  await completeSession(page);
  await expect(pill(page)).toHaveCount(0);
  await page.reload();
  await page.locator('.button--primary').waitFor();
  await expect(pill(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":2,"dismissed":["seconds"],"firstSession":true}');
});

test('a fullscreen tip dismissed before the first session leaves the seconds tip its own moment', async ({ page }) => {
  await pageFullscreen(page, true);
  await openApp(page);
  await page.getByRole('button', { name: 'dismiss' }).click();
  await expect(pill(page)).toHaveCount(0);
  await completeSession(page);
  await expect(pill(page)).toHaveText(SECONDS_TIP);
  expect(await page.evaluate(() => localStorage.getItem('notices'))).toBe('{"schema":2,"dismissed":["fullscreen"],"firstSession":true}');
});
