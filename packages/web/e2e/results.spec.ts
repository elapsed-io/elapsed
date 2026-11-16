/**
 * Round 5: the ending countdown, the results screen and its replays, compared
 * with their frames; retry, share, reload, reduced motion, small windows and
 * sessions that end on their own.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BRAND } from '@stopwatch/core';
import { endingFrame, resultsRingFrame, resultsStripFrame } from './fixtures/frames.ts';
import type { ResultsData } from './fixtures/frames.ts';
import { MINUTE, SECOND, TIMER_END, compareWithReference, endThroughCountdown, finishResults, openApp, settle } from './helpers.ts';

// Clock times as in the frames: a 24-hour region, in UTC.
test.use({ locale: 'en-GB', timezoneId: 'UTC' });

const primary = (page: Page) => page.locator('.button--primary');

/**
 * The frames' sample session, played through the site: started at 14:02,
 * 92 min of focus, a 10 min pause, 48 min, an 8 min pause, then 27 min 40 s.
 */
async function playSampleSession(page: Page, mode?: string): Promise<void> {
  await openApp(page, { width: 720, height: 520, ...(mode === undefined ? {} : { mode }) });
  await page.clock.runFor(90 * SECOND);
  await primary(page).click();
  await page.clock.runFor(92 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(10 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(48 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(8 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(27 * MINUTE + 40 * SECOND);
  await endThroughCountdown(page);
  await finishResults(page);
  await settle(page);
}

const SAMPLE: ResultsData = {
  focused: '02:47:40',
  stats: ['03:05:40', '00:18:00', '2', '01:32:00', '14:02', '17:07'],
  stretches: [
    { from: 0, to: 92 },
    { from: 102, to: 150 },
    { from: 158, to: 185 + 40 / 60 },
  ],
  total: 185 + 40 / 60,
  start: '14:02',
  end: '17:07',
  // 17:00 would crowd the end label, so the strip leaves it out.
  hours: [
    { text: '15:00', minute: 58 },
    { text: '16:00', minute: 118 },
  ],
};

test('the ending countdown matches its frame, with no corner icons', async ({ page, browser }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(MINUTE);
  await page.locator(TIMER_END).click();
  await page.locator('.ending').waitFor();
  await page.mouse.move(0, 0);
  // Hold the bar half full: 190 of 380 px at 2.5 s.
  await page.locator('.ending__fill').evaluate((fill) => {
    for (const animation of fill.getAnimations()) {
      animation.pause();
      animation.currentTime = 2500;
    }
  });
  await expect(page.locator('.corner')).toBeHidden();
  const diff = await compareWithReference(page, browser, endingFrame(190));
  // The moving bar is drawn on its own layer, which shifts anti-aliasing at its edge.
  expect(diff.visible).toBeLessThanOrEqual(20);
});

test('results for digits match the "results: digits and timeline" frame exactly', async ({ page, browser }) => {
  await playSampleSession(page);
  await expect(page.locator('.strip__label').filter({ hasText: '17:00' })).toBeHidden();
  const diff = await compareWithReference(page, browser, resultsStripFrame(SAMPLE));
  expect(diff).toMatchObject({ differing: 0 });
});

test('results for ring match the "results: analog and ring" frame exactly', async ({ page, browser }) => {
  await playSampleSession(page, 'ring');
  const diff = await compareWithReference(page, browser, resultsRingFrame(SAMPLE));
  expect(diff).toMatchObject({ differing: 0 });
});

test('timeline replays as the focus strip too', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  await primary(page).click();
  await page.clock.runFor(20 * MINUTE);
  await endThroughCountdown(page);
  await expect(page.locator('.results .strip')).toBeVisible();
});

test('the session ends where end was pressed; cancel loses nothing', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(10 * MINUTE);
  await page.locator(TIMER_END).click();
  // The fake clock moves on while the countdown shows; cancel keeps that time.
  await page.clock.runFor(4 * SECOND);
  await page.getByRole('button', { name: 'cancel' }).click();
  await page.clock.runFor(MINUTE - 4 * SECOND);
  await page.locator(TIMER_END).click();
  await page.clock.runFor(4 * SECOND);
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'end now' }).click();
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:11:00');
});

test('end now ignores a press in its first 300 ms', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(MINUTE);
  await page.locator(TIMER_END).dblclick();
  await expect(page.locator('.ending')).toBeVisible();
  await expect(page.locator('.results')).toHaveCount(0);
});

test('the headline counts up in CSS during the replay and lands on the total', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(42 * MINUTE + 7 * SECOND);
  await endThroughCountdown(page);
  const time = page.locator('.results__time');
  await expect(time).toHaveClass(/results__time--counting/);
  const counted = await time.evaluate((element) =>
    element.getAnimations().flatMap((animation) => (animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes().map((frame) => Object.keys(frame)) : [])).flat(),
  );
  expect(counted).toContain('--results-focused');
  await finishResults(page);
  await expect(time).not.toHaveClass(/results__time--counting/);
  expect(await time.innerText()).toBe('00:42:07');
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:42:07');
});

test('retry and Space start a new session; the finished one leaves tab storage', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(3 * MINUTE);
  await endThroughCountdown(page);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['timer.finished']);
  await expect(page.getByRole('button', { name: 'retry' })).toBeFocused();
  await page.getByRole('button', { name: 'retry' }).click();
  await expect(primary(page)).toHaveAccessibleName('pause');
  await expect(page.locator('.results')).toBeHidden();
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});

test('a reload shows the results again, in their final state, without the replay', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(25 * MINUTE);
  await endThroughCountdown(page);
  await page.reload();
  await page.locator('.results[data-ready]').waitFor();
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:25:00');
  const running = await page.locator('.results').evaluate((element) => element.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  await expect(page.locator('.ending')).toBeHidden();
});

test('a session shorter than a minute still gets its results', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(20 * SECOND);
  await endThroughCountdown(page);
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:00:20');
});

test.describe('share', () => {
  test('copies the line on a computer and shows a check for 2 seconds', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(2 * 60 * MINUTE - 13 * MINUTE + 5 * SECOND);
    await endThroughCountdown(page);
    await finishResults(page);
    await page.getByRole('button', { name: 'share' }).click();
    await expect(page.locator('[role="status"]')).toHaveText('copied');
    await expect(page.locator('.action__check')).toHaveCSS('opacity', '1');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`i studied for 1h 47m on ${BRAND.name} http://localhost:4173/`);
  });

  test('opens the share sheet on a touch device', async ({ page }) => {
    await page.addInitScript(() => {
      const shared: unknown[] = [];
      (window as unknown as { __shared: unknown[] }).__shared = shared;
      Object.defineProperty(navigator, 'share', { value: (data: unknown) => Promise.resolve(void shared.push(data)) });
      const real = window.matchMedia.bind(window);
      // The main pointer is touch.
      window.matchMedia = (query: string): MediaQueryList => {
        const list = real(query);
        return query === '(pointer: coarse)' ? (Object.create(list, { matches: { value: true } }) as MediaQueryList) : list;
      };
    });
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(45 * SECOND);
    await endThroughCountdown(page);
    await finishResults(page);
    await page.getByRole('button', { name: 'share' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared))
      .toEqual([{ text: `i studied for 45s on ${BRAND.name}`, url: 'http://localhost:4173/' }]);
  });
});

test('with reduced motion there is no replay: the final state crossfades in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(30 * MINUTE);
  await endThroughCountdown(page);
  await expect(page.locator('.results__time')).not.toHaveClass(/results__time--counting/);
  const replaying = await page.locator('.results__graphic').evaluate((element) => element.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
  expect(replaying).toBe(0);
  await expect(page.locator('.strip__bar').first()).toBeVisible();
});

test('on a phone the headline scales, the strip fits and the stats wrap into rows of three', async ({ page }) => {
  await openApp(page, { width: 390, height: 844 });
  await primary(page).click();
  await page.clock.runFor(70 * MINUTE);
  await endThroughCountdown(page);
  await finishResults(page);
  const layout = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const stats = [...document.querySelectorAll('.stat')].map((element) => Math.round(element.getBoundingClientRect().top));
    return {
      headline: Number.parseFloat(getComputedStyle(document.querySelector('.results__time') ?? document.body).fontSize),
      label: Number.parseFloat(getComputedStyle(document.querySelector('.stat__label') ?? document.body).fontSize),
      strip: box('.strip'),
      rows: new Set(stats).size,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(layout.headline).toBeCloseTo(60 * (390 / 720), 1);
  expect(layout.label).toBe(11);
  expect(layout.strip?.left).toBeGreaterThanOrEqual(16);
  expect(layout.strip?.right).toBeLessThanOrEqual(390 - 16);
  expect(layout.rows).toBe(2);
  expect(layout.scrollWidth).toBe(390);
});

test('a pause past the limit skips the countdown and shows the results, in every open tab', async ({ page, context }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(6 * MINUTE);
  await primary(page).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('[role="status"]').waitFor({ state: 'attached' });
  await page.clock.runFor(31 * MINUTE);
  // Both tabs replay 31 minutes of one-second wakes first, which is slow when tests run in parallel.
  for (const tab of [page, other]) {
    await expect(tab.getByRole('button', { name: 'retry' })).toBeVisible({ timeout: 15_000 });
    await expect(tab.getByRole('button', { name: 'cancel' })).toBeHidden();
  }
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:06:00');
});

test('end now never shows the results before the tabulating screen has held and faded', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(25 * SECOND);
  // Watch every change to the page and note any moment the results could be seen early.
  await page.evaluate(() => {
    const early: string[] = [];
    (window as unknown as { __early: string[] }).__early = early;
    new MutationObserver(() => {
      const results = document.querySelector('.results');
      if (!(results instanceof HTMLElement) || results.hidden) return;
      const style = getComputedStyle(results);
      if (style.visibility !== 'hidden' && Number(style.opacity) > 0) early.push(results.hasAttribute('data-ready') ? 'ready' : 'not ready');
    }).observe(document.body, { subtree: true, attributes: true, childList: true });
  });
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  // Seen only once timed, and then only by its fade-in, which starts 1 s after the bar filled.
  expect(await page.evaluate(() => (window as unknown as { __early: string[] }).__early)).toEqual([]);
  const opacity = await page.locator('.results').evaluate((element) => getComputedStyle(element).opacity);
  expect(Number(opacity)).toBeLessThan(1);
});
