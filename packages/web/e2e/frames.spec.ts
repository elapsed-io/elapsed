/**
 * Each round 3 screen against its design canvas frame, pixel by pixel, at
 * 720 × 450 in the default theme.
 *
 * Screens with nothing moving match exactly. Where the plan moves things with
 * transforms (the seconds re-centring, the ring turning, the timeline
 * sliding), the browser draws the moving part as its own layer, which shifts
 * anti-aliasing by a fraction of a pixel; those comparisons allow a few dozen
 * pixels of edge noise (more than 8 levels apart) and nothing larger. A
 * misplaced element by even one pixel differs in hundreds of pixels.
 */

import { expect, test } from '@playwright/test';
import { pausedFrame, ringFrame, runningFrame, timelineFrame } from './fixtures/frames.ts';
import { MINUTE, SECOND, compareWithReference, holdAnimationsAt, openApp, settle } from './helpers.ts';

/** Moments across both blur-away windows, including their ends. */
const RUNNING_MOMENTS = [0.5, 3, 7.5, 9.9, 12, 35, 47.5, 59.5];

for (const seconds of RUNNING_MOMENTS) {
  test(`running at ${String(seconds)} s matches the running frame as the seconds blur away`, async ({ page, browser }) => {
    await openApp(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(seconds * SECOND);
    await settle(page);
    await holdAnimationsAt(page, seconds * SECOND);
    const diff = await compareWithReference(page, browser, runningFrame(seconds));
    expect(diff.visible).toBeLessThanOrEqual(60);
    expect(diff.maxChannelDelta).toBeLessThanOrEqual(64);
  });
}

test('running after a minute shows hh:mm exactly as the running frame', async ({ page, browser }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(75 * SECOND);
  await settle(page);
  const diff = await compareWithReference(page, browser, runningFrame(75));
  expect(diff).toMatchObject({ differing: 0 });
});

test('paused matches the paused frame exactly', async ({ page, browser }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  await page.locator('.button--primary').click();
  await page.clock.runFor(4 * MINUTE + 12 * SECOND);
  await settle(page);
  const diff = await compareWithReference(page, browser, pausedFrame());
  expect(diff).toMatchObject({ differing: 0 });
});

test('ring matches the ring frame', async ({ page, browser }) => {
  await openApp(page, { mode: 'ring' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  await settle(page);
  await holdAnimationsAt(page, 84 * MINUTE);
  const diff = await compareWithReference(page, browser, ringFrame());
  expect(diff.visible).toBeLessThanOrEqual(100);
  expect(diff.maxChannelDelta).toBeLessThanOrEqual(40);
});

test('timeline matches the timeline frame', async ({ page, browser }) => {
  await openApp(page, { mode: 'timeline' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  await settle(page);
  await holdAnimationsAt(page, 84 * MINUTE);
  const diff = await compareWithReference(page, browser, timelineFrame());
  expect(diff.visible).toBeLessThanOrEqual(150);
  expect(diff.maxChannelDelta).toBeLessThanOrEqual(48);
});
