/**
 * Each round 3 screen against its design canvas frame, pixel by pixel, at
 * 720 × 450 in the default theme.
 *
 * Screens with nothing moving match exactly. Where the plan moves things with
 * transforms, browsers draw the moving part as its own layer, and how a layer
 * is rasterised differs between browser versions. The ring and timeline
 * references therefore draw the frame's geometry through the same kind of
 * layer (see fixtures/frames.ts), so they compare geometry rather than
 * rasteriser details. The seconds blur-away compares against the frame's own
 * markup and allows a few dozen pixels of edge noise. A misplaced element by
 * even one pixel differs in hundreds of pixels. In Firefox and WebKit, where
 * glyphs in a layer land a fraction of a pixel from the static frame's, the
 * blur-away is compared once that is averaged away (pixels.ts).
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { GRAPHITE, PAPER, checkInFrame, idleFrame, inPalette, limitFrame, pausedFrame, pausedMissedFrame, runningFrame } from './fixtures/frames.ts';
import { modeFrame } from './fixtures/mode-frames.ts';
import { createSession, pauseSession, resumeSession, serializeActiveState, startState } from '@stopwatch/core';
import { MINUTE, SECOND, compareWithReference, holdAnimationsAt, openApp, settle } from './helpers.ts';
import { SMOOTHED_LIMIT, expectLikeFrame } from './pixels.ts';

/** Moments across both blur-away windows, including their ends. */
const RUNNING_MOMENTS = [0.5, 3, 7.5, 9.9, 12, 35, 47.5, 59.5];

for (const seconds of RUNNING_MOMENTS) {
  test(`running at ${String(seconds)} s matches the running frame as the seconds blur away`, async ({ page, browser, browserName }) => {
    await openApp(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(seconds * SECOND);
    await settle(page);
    await holdAnimationsAt(page, seconds * SECOND);
    const diff = await compareWithReference(page, browser, runningFrame(seconds));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible).toBeLessThanOrEqual(60);
      expect(diff.maxChannelDelta).toBeLessThanOrEqual(64);
    });
  });
}

test('the comparison tells the blur-away apart from a moment 4.5 s away (a control check)', async ({ page, browser }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * SECOND);
  await settle(page);
  await holdAnimationsAt(page, 3 * SECOND);
  const diff = await compareWithReference(page, browser, runningFrame(7.5));
  expect(diff.smoothedMaxDelta).toBeGreaterThan(4 * SMOOTHED_LIMIT);
  expect(diff.visible).toBeGreaterThan(60);
});

test('running after a minute shows hh:mm exactly as the running frame', async ({ page, browser }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(75 * SECOND);
  await settle(page);
  const diff = await compareWithReference(page, browser, runningFrame(75));
  expect(diff).toMatchObject({ differing: 0 });
});

test('idle in the paper theme matches the "idle, paper theme" frame exactly', async ({ page, browser }) => {
  await openApp(page, { settings: { theme: 'paper' } });
  const diff = await compareWithReference(page, browser, inPalette(PAPER, idleFrame));
  expect(diff).toMatchObject({ differing: 0 });
});

test('the idle frame reconstruction matches the graphite idle screen too', async ({ page, browser }) => {
  await openApp(page);
  const diff = await compareWithReference(page, browser, idleFrame());
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

/** Runs a session in `mode` to `focus`, then optionally pauses it for `paused`. */
async function sessionAt(page: Page, mode: string, focus: number, paused = 0): Promise<void> {
  await openApp(page, { mode });
  await page.locator('.button--primary').click();
  await page.clock.runFor(focus);
  if (paused > 0) {
    await page.locator('.button--primary').click();
    await page.clock.runFor(paused);
  }
  await settle(page);
}

// The revised ring and timeline frames. The ring turns as a whole by a transform, so its edges are
// resampled by the browser where the frame draws them in place: a few pixels of anti-aliasing differ.
for (const [name, mode, focus, paused, limit] of [
  ['ring', 'ring', 84 * MINUTE, 0, 40],
  ['ringStart', 'ring', 1 * MINUTE, 0, 40],
  ['ringPaused', 'ring', 84 * MINUTE, 4 * MINUTE + 12 * SECOND, 40],
  ['timeline', 'timeline', 84 * MINUTE, 0, 0],
  ['timelineStart', 'timeline', 4 * MINUTE, 0, 0],
  ['timelinePaused', 'timeline', 84 * MINUTE, 4 * MINUTE + 12 * SECOND, 0],
] as const) {
  test(`${mode} matches the "${name}" frame`, async ({ page, browser }) => {
    await sessionAt(page, mode, focus, paused);
    const diff = await compareWithReference(page, browser, modeFrame(name, GRAPHITE));
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(limit);
  });
}

test('a check-in waiting matches the check-in frame exactly', async ({ page, browser }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(120 * MINUTE);
  await page.mouse.move(0, 0);
  await settle(page);
  const diff = await compareWithReference(page, browser, checkInFrame());
  expect(diff).toMatchObject({ differing: 0 });
});

test.describe('paused after a missed check-in', () => {
  // The check-in falls due at 16:00:30 UTC: 2:00 pm two hours west of UTC, as in the frame.
  test.use({ locale: 'en-US', timezoneId: 'Etc/GMT+2' });

  test('matches its frame exactly', async ({ page, browser }) => {
    await openApp(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(120 * MINUTE + 72 * MINUTE + 40 * SECOND);
    await page.mouse.move(0, 0);
    await settle(page);
    const diff = await compareWithReference(page, browser, pausedMissedFrame());
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('the session maximum matches its frame exactly', async ({ page, browser }) => {
  const HOUR = 60 * MINUTE;
  const T0 = Date.UTC(2026, 10, 16, 14, 0, 0);
  let session = createSession({ id: '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f', mode: 'digits', at: T0 - 16 * HOUR - 10 * MINUTE, timeZone: 'UTC' });
  session = resumeSession(pauseSession(session, T0 - 16 * HOUR), T0 - 15 * HOUR - 49 * MINUTE);
  const state = { ...startState(session), presenceAt: T0 - 30 * MINUTE };
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState(state));
  await openApp(page);
  await page.clock.runFor(MINUTE);
  const notice = page.locator('.notice');
  await notice.waitFor();
  await notice.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  // The notice's button took focus, and the browser rings it; the frame draws no focus state.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await settle(page);
  const diff = await compareWithReference(page, browser, limitFrame());
  expect(diff).toMatchObject({ differing: 0 });
});
