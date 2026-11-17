/**
 * Focus view and fullscreen (round 2.8; plan, Interface and Product principles; the "running, recently
 * touched", "running, untouched" and "the motion, on a loop" frames). These tests let the page go quiet: the
 * rest of the suite keeps every page touched (e2e/test.ts).
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, compareWithReference, openApp, settle } from './helpers.ts';
import { GRAPHITE } from './fixtures/frames.ts';
import { focusFrame } from './fixtures/focus-frames.ts';
import { expectLikeFrame } from './pixels.ts';

test.use({ awake: false });

const focused = (page: Page): Promise<boolean> => page.locator('.screen').evaluate((screen) => screen.classList.contains('screen--focus'));

/** Each moving part's transition: property, duration and easing, as computed. */
function transitions(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const read = (selector: string): string => {
      const element = document.querySelector(selector);
      if (element === null) return 'none';
      const style = getComputedStyle(element);
      return `${style.transitionProperty} ${style.transitionDuration} ${style.transitionTimingFunction}`;
    };
    return { controls: read('.screen > .controls'), corner: read('.screen > .corner'), time: read('.mode-root > .time-stack') };
  });
}

test('untouched for 3 seconds while running, the controls step aside and the time grows, as the "running, untouched" frame', async ({ page, browser, browserName }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  expect(await focused(page)).toBe(true);
  await settle(page);
  const diff = await compareWithReference(page, browser, focusFrame('focusQuiet', GRAPHITE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBe(0);
  });
  // Hidden controls take no presses (a first tap only brings them back), and the pointer hides.
  expect(await page.locator('.screen > .controls').evaluate((controls) => getComputedStyle(controls).pointerEvents)).toBe('none');
  expect(await page.locator('.screen').evaluate((screen) => getComputedStyle(screen).cursor)).toBe('none');
});

test('any mouse move brings everything back exactly, as the "running, recently touched" frame, until 3 more quiet seconds', async ({ page, browser, browserName }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  expect(await focused(page)).toBe(true);
  await page.mouse.move(100, 100);
  expect(await focused(page)).toBe(false);
  await settle(page);
  const diff = await compareWithReference(page, browser, focusFrame('focusActive', GRAPHITE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBe(0);
  });
  await page.clock.runFor(2.9 * SECOND);
  expect(await focused(page)).toBe(false);
  await page.clock.runFor(0.2 * SECOND);
  expect(await focused(page)).toBe(true);
});

test('the motion: controls drop and fade over 180 ms easing in, the time grows over 220 ms easing out; back, both ease out as fast', async ({ page }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * SECOND);
  expect(await focused(page)).toBe(true);
  expect(await transitions(page)).toEqual({
    controls: 'opacity, transform 0.18s, 0.18s cubic-bezier(0.11, 0, 0.5, 0), cubic-bezier(0.11, 0, 0.5, 0)',
    corner: 'opacity, transform 0.18s, 0.18s cubic-bezier(0.11, 0, 0.5, 0), cubic-bezier(0.11, 0, 0.5, 0)',
    time: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)',
  });
  await page.keyboard.down('Shift');
  expect(await focused(page)).toBe(false);
  expect(await transitions(page)).toEqual({
    controls: 'opacity, transform 0.18s, 0.18s cubic-bezier(0.25, 1, 0.5, 1), cubic-bezier(0.25, 1, 0.5, 1)',
    corner: 'opacity, transform 0.18s, 0.18s cubic-bezier(0.25, 1, 0.5, 1), cubic-bezier(0.25, 1, 0.5, 1)',
    time: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)',
  });
  await page.keyboard.up('Shift');
  // Only transforms and opacity move.
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll('.controls, .corner, .mode-root > .time-stack')].flatMap((element) => getComputedStyle(element).transitionProperty.split(', ')),
  );
  expect([...new Set(moving)].sort()).toEqual(['opacity', 'transform']);
});

test('a shortcut key still does its job from the focus view, and brings the controls back', async ({ page }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(10 * SECOND);
  expect(await focused(page)).toBe(true);
  await page.keyboard.press('Space');
  await expect(page.locator('.button--primary')).toHaveAccessibleName('resume');
  expect(await focused(page)).toBe(false);
});

test('paused and check-in screens never hide their controls', async ({ page }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  await page.keyboard.press('Space');
  await page.clock.runFor(MINUTE);
  expect(await focused(page)).toBe(false);
  await page.keyboard.press('Space');
  // The check-in falls due after two hours of focus.
  await page.clock.runFor(120 * MINUTE);
  await expect(page.locator('.check-in')).toBeVisible();
  expect(await focused(page)).toBe(false);
});

test('the setting: after 10 s waits ten quiet seconds; never keeps the controls', async ({ page }) => {
  await openApp(page, { settings: { focusHide: '10s' } });
  await page.locator('.button--primary').click();
  await page.clock.runFor(9 * SECOND);
  expect(await focused(page)).toBe(false);
  await page.clock.runFor(SECOND);
  expect(await focused(page)).toBe(true);
});

test('with never, the controls stay', async ({ page }) => {
  await openApp(page, { settings: { focusHide: 'never' } });
  await page.locator('.button--primary').click();
  await page.clock.runFor(10 * MINUTE);
  expect(await focused(page)).toBe(false);
});

test('settings open over a running session keep the controls; closing them starts the quiet count again', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  await page.locator('.button--primary').click();
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  await page.clock.runFor(MINUTE);
  expect(await focused(page)).toBe(false);
  await page.keyboard.press('Escape');
  await page.clock.runFor(2 * SECOND);
  expect(await focused(page)).toBe(false);
  await page.clock.runFor(2 * SECOND);
  expect(await focused(page)).toBe(true);
});

/** A page fullscreen the test can watch: entering and leaving are recorded, as a browser would carry them out. */
async function watchFullscreen(page: Page, enabled = true): Promise<void> {
  await page.addInitScript((on) => {
    const calls: string[] = [];
    let element: Element | null = null;
    (window as unknown as { __fullscreen: string[] }).__fullscreen = calls;
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => on, configurable: true });
    Object.defineProperty(Document.prototype, 'fullscreenElement', { get: () => element, configurable: true });
    // The site asks for the whole page.
    Element.prototype.requestFullscreen = () => {
      element = document.documentElement;
      calls.push('enter');
      return Promise.resolve();
    };
    Document.prototype.exitFullscreen = () => {
      element = null;
      calls.push('leave');
      return Promise.resolve();
    };
  }, enabled);
}

const fullscreenCalls = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __fullscreen: string[] }).__fullscreen);

for (const [leave, afterPause, afterEnd] of [
  ['end', ['enter'], ['enter', 'leave']],
  // Fullscreen comes with a session's start only: resuming stays in the window.
  ['pause-or-end', ['enter', 'leave'], ['enter', 'leave']],
  ['never', ['enter'], ['enter']],
] as const) {
  test(`fullscreen when a session starts, leaving it ${leave === 'never' ? 'never' : `on ${leave.replaceAll('-', ' ')}`}`, async ({ page }) => {
    await watchFullscreen(page);
    await openApp(page, { settings: { fullscreenOnStart: true, leaveFullscreen: leave } });
    await page.locator('.button--primary').click();
    await page.clock.runFor(MINUTE);
    await page.keyboard.press('Space');
    expect(await fullscreenCalls(page)).toEqual(afterPause);
    await page.keyboard.press('Space');
    await page.keyboard.press('e');
    await page.locator('.ending').waitFor();
    await page.clock.runFor(6 * SECOND);
    await page.locator('.results').waitFor();
    expect(await fullscreenCalls(page)).toEqual(afterEnd);
  });
}

test('fullscreen stays off unless asked', async ({ page }) => {
  await watchFullscreen(page);
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(MINUTE);
  expect(await fullscreenCalls(page)).toEqual([]);
});
