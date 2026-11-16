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
import { modeFrame, oceanFrame, oceanPausedFrame } from './fixtures/mode-frames.ts';
import { createSession, pauseSession, resumeSession, serializeActiveState, startState } from '@stopwatch/core';
import { MINUTE, SECOND, compareWithReference, freezeAnimations, holdAnimationsAt, openApp, settle } from './helpers.ts';
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

test('running after a minute shows hh:mm exactly as the running frame', async ({ page, browser, browserName }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(75 * SECOND);
  await settle(page);
  const diff = await compareWithReference(page, browser, runningFrame(75));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('idle in the paper theme matches the "idle, paper theme" frame exactly', async ({ page, browser, browserName }) => {
  await openApp(page, { settings: { theme: 'paper' } });
  // Nothing moving, even in a browser busy enough to start a transition late.
  await settle(page);
  const diff = await compareWithReference(page, browser, inPalette(PAPER, idleFrame));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('the idle frame reconstruction matches the graphite idle screen too', async ({ page, browser, browserName }) => {
  await openApp(page);
  // Nothing moving, even in a browser busy enough to start a transition late.
  await settle(page);
  const diff = await compareWithReference(page, browser, idleFrame());
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('paused matches the paused frame exactly', async ({ page, browser, browserName }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  await page.locator('.button--primary').click();
  await page.clock.runFor(4 * MINUTE + 12 * SECOND);
  await settle(page);
  const diff = await compareWithReference(page, browser, pausedFrame());
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
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
// resampled by the browser where the frame draws them in place: a few pixels of anti-aliasing differ. While
// it glides, the rotor is a layer the compositor turns, which resamples a little more (decision 267): the
// running frame allows 100 such pixels, and the control below shows a ring 3° off fails by far.
// Each frame shows a whole minute, so the timeline's and the ring's glides are frozen at the start of their minute.
const RING_GLIDING_LIMIT = 100;
for (const [name, mode, focus, paused, limit] of [
  ['ring', 'ring', 84 * MINUTE, 0, RING_GLIDING_LIMIT],
  ['ringStart', 'ring', 1 * MINUTE, 0, 40],
  ['ringPaused', 'ring', 84 * MINUTE, 4 * MINUTE + 12 * SECOND, 40],
  ['timeline', 'timeline', 84 * MINUTE, 0, 0],
  ['timelineStart', 'timeline', 4 * MINUTE, 0, 0],
  ['timelinePaused', 'timeline', 84 * MINUTE, 4 * MINUTE + 12 * SECOND, 0],
] as const) {
  test(`${mode} matches the "${name}" frame`, async ({ page, browser, browserName }) => {
    await sessionAt(page, mode, focus, paused);
    await freezeAnimations(page, { at: { '.timeline__glide': 0, '.ring__rotor': 0 } });
    const diff = await compareWithReference(page, browser, modeFrame(name, GRAPHITE));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(limit);
      expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(SMOOTHED_LIMIT);
    });
  });
}

// The analog frame at 1 h 24 min. Its hands are the frame's own lines, each in a drawing that CSS turns (so the
// compositor can glide it), where the frame turns the line itself: the long diagonal minute hand's
// anti-aliased edges differ by a few levels along its length (262 pixels measured, smoothed 10). A hand 3° off
// differs by 724 (smoothed 68), as the control below checks.
const ANALOG_LIMIT = 300;
/** The most any ocean pixel may differ from its frame: the frames' two-stop water against the site's every metre. */
const OCEAN_LEVELS = 10;
/**
 * Ocean life's fish and bubbles: the frame rounds each position to 0.1 px where the site moves them exactly,
 * so their anti-aliased edges differ by a few levels. Measured in the reference image: 2,905 pixels past
 * 8 levels in Chromium, smoothed at most 33.2 in any browser; a second off differs by 5,342 to 19,465 pixels,
 * smoothed 124 (the control below).
 */
const OCEAN_LIFE_LIMIT = 4000;
const OCEAN_LIFE_SMOOTHED = 40;
/** At 5 m that difference passes the 8 levels the pixel check counts as visible, over a band of the screen (45,913 measured). */
const OCEAN_SURFACE_LIMIT = 50_000;

test('analog matches the "analog stopwatch" frame', async ({ page, browser, browserName }) => {
  await sessionAt(page, 'analog', 84 * MINUTE);
  await freezeAnimations(page, { at: { '.analog__hand': 0 } });
  const diff = await compareWithReference(page, browser, modeFrame('analog', GRAPHITE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(ANALOG_LIMIT);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(SMOOTHED_LIMIT);
  });
});

// Ocean depth: the frames draw the water as one gradient between the colours 6 m above and 6 m below; the site
// draws a stop every metre, so it follows the light model's curve as it glides (decision 295). Measured: 2
// levels at 90 m, 3 at 20 m, 8 at 10 m and 10 at 5 m, where the light changes fastest. Text, icons and
// buttons match exactly.
for (const [frame, focus, depth, minutes, into, limit] of [
  ['ocean depth, running', 6 * MINUTE, 90, 6, 0, 0],
  ['ocean depth, 0 to 20 m (at 5 m)', 20 * SECOND, 5, 0, 20 * SECOND, OCEAN_SURFACE_LIMIT],
  ['ocean depth, 0 to 20 m (at 10 m)', 40 * SECOND, 10, 0, 40 * SECOND, 0],
  ['ocean depth, 0 to 20 m (at 20 m)', 80 * SECOND, 20, 1, 20 * SECOND, 0],
] as const) {
  test(`ocean depth matches the "${frame}" frame`, async ({ page, browser, browserName }) => {
    await sessionAt(page, 'ocean', focus);
    await freezeAnimations(page, { at: { '.light__strip': into } });
    const diff = await compareWithReference(page, browser, oceanFrame(depth, minutes));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(limit);
      expect(diff.maxChannelDelta, JSON.stringify(diff)).toBeLessThanOrEqual(OCEAN_LEVELS);
    });
  });
}

test('ocean depth matches the "ocean depth, paused" frame, its life where the frame puts it', async ({ page, browser, browserName }) => {
  await sessionAt(page, 'ocean', 6 * MINUTE, 2 * MINUTE + 10 * SECOND);
  await page.locator('.life--in').waitFor({ state: 'attached' });
  // Ten seconds into the pause: the life has faded in, and every fish and bubble is where the frame's own
  // formulas put it then.
  await freezeAnimations(page, { css: 10 * SECOND });
  const diff = await compareWithReference(page, browser, oceanPausedFrame(10, '00:02:10'));
  // Its own limits in every browser (see OCEAN_LIFE_LIMIT): the control below differs by far more.
  expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(OCEAN_LIFE_SMOOTHED);
  if (browserName === 'chromium' && process.env['PIXEL_REFERENCE'] === '1') expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(OCEAN_LIFE_LIMIT);
});

test('control: ocean life a second off fails the paused frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await sessionAt(page, 'ocean', 6 * MINUTE, 2 * MINUTE + 10 * SECOND);
  await page.locator('.life--in').waitFor({ state: 'attached' });
  await freezeAnimations(page, { css: 11 * SECOND });
  const diff = await compareWithReference(page, browser, oceanPausedFrame(10, '00:02:10'));
  expect(diff.visible).toBeGreaterThan(OCEAN_LIFE_LIMIT);
  expect(diff.smoothedMaxDelta).toBeGreaterThan(OCEAN_LIFE_SMOOTHED);
});

test('control: ocean water 15 m off fails the running frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await sessionAt(page, 'ocean', 5 * MINUTE);
  await freezeAnimations(page, { at: { '.light__strip': 0 } });
  const diff = await compareWithReference(page, browser, oceanFrame(90, 5));
  expect(diff.maxChannelDelta).toBeGreaterThan(OCEAN_LEVELS);
});

test('control: analog hands 3° from the frame fail the analog frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await sessionAt(page, 'analog', 84 * MINUTE);
  await freezeAnimations(page, { at: { '.analog__hand': 30 * SECOND } });
  const diff = await compareWithReference(page, browser, modeFrame('analog', GRAPHITE));
  expect(diff.visible).toBeGreaterThan(ANALOG_LIMIT);
  expect(diff.smoothedMaxDelta).toBeGreaterThan(SMOOTHED_LIMIT);
});

test('control: a gliding ring 3° from the frame fails the ring frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await sessionAt(page, 'ring', 84 * MINUTE);
  await freezeAnimations(page, { at: { '.ring__rotor': 30 * SECOND } });
  const diff = await compareWithReference(page, browser, modeFrame('ring', GRAPHITE));
  expect(diff.visible).toBeGreaterThan(RING_GLIDING_LIMIT);
  expect(diff.smoothedMaxDelta).toBeGreaterThan(SMOOTHED_LIMIT);
});

test('a check-in waiting matches the check-in frame exactly', async ({ page, browser, browserName }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(120 * MINUTE);
  await page.mouse.move(0, 0);
  await settle(page);
  const diff = await compareWithReference(page, browser, checkInFrame());
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test.describe('paused after a missed check-in', () => {
  // The check-in falls due at 16:00:30 UTC: 2:00 pm two hours west of UTC, as in the frame.
  test.use({ locale: 'en-US', timezoneId: 'Etc/GMT+2' });

  test('matches its frame exactly', async ({ page, browser, browserName }) => {
    await openApp(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(120 * MINUTE + 72 * MINUTE + 40 * SECOND);
    await page.mouse.move(0, 0);
    await settle(page);
    const diff = await compareWithReference(page, browser, pausedMissedFrame());
    expectLikeFrame(diff, browserName, () => {
      expect(diff).toMatchObject({ differing: 0 });
    });
  });
});

test('the session maximum matches its frame exactly', async ({ page, browser, browserName }) => {
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
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});
