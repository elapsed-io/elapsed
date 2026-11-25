/** Tree (round 2.6): its year, its two views, its frames and its results. */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { resultsTreeFrame, treeIsoFrame, treeSideFrame } from './fixtures/tree-frames.ts';
import { MINUTE, SECOND, compareWithReference, endThroughCountdown, finishResults, freezeAnimations, openApp, settle } from './helpers.ts';
import type { Clip } from './helpers.ts';
import { expectLikeFrame } from './pixels.ts';

// The results frame's clock times are 24-hour, in UTC (as results.spec.ts).
test.use({ locale: 'en-GB', timezoneId: 'UTC' });

const primary = (page: Page) => page.locator('.button--primary');
const YEAR = 60 * MINUTE;
const TREE_PARTS = '.tree__cluster, .tree__stage, .tree__layer';

/**
 * A tree session `focus` in. The tree's frames (a test mode's, drawn before round 2.14) show hh:mm, as seconds blurring
 * away do after a minute, and its year is re-pinned only when what is shown changes: so its sessions blur seconds away
 * unless a test says otherwise.
 */
async function sessionAt(page: Page, focus: number, own: Readonly<Record<string, unknown>> = {}): Promise<void> {
  await openApp(page, { mode: 'tree', settings: { hideSeconds: 'blur-away', ...own } });
  await primary(page).click();
  await page.clock.runFor(focus);
  await page.locator('.tree__svg').waitFor();
  await settle(page);
}

/** The tree's year: how many animations, whether they run, where they are, and what they animate. */
async function year(page: Page) {
  return page.locator('.tree__svg').evaluate((drawing) => {
    const animations = drawing.getAnimations({ subtree: true });
    const properties = new Set<string>();
    for (const animation of animations) {
      const effect = animation.effect;
      if (effect instanceof KeyframeEffect) for (const frame of effect.getKeyframes()) for (const key of Object.keys(frame)) if (!['offset', 'computedOffset', 'easing', 'composite'].includes(key)) properties.add(key);
    }
    const states = new Set(animations.map((animation) => animation.playState));
    const times = new Set(animations.map((animation) => Math.round(Number(animation.currentTime))));
    const timing = animations[0]?.effect?.getTiming();
    return { count: animations.length, states: [...states], times: [...times], properties: [...properties].sort(), duration: Number(timing?.duration), iterations: timing?.iterations };
  });
}

test('the tree’s year runs with the session: an hour long, endless, opacity and transform only', async ({ page }) => {
  await sessionAt(page, 22 * MINUTE + 30 * SECOND);
  const running = await year(page);
  // 70 clusters, each in five colours, and the snow (ground and branches), falling and fallen leaves.
  expect(running.count).toBe(70 * 6 + 4);
  expect(running).toMatchObject({ states: ['running'], properties: ['opacity', 'transform'], duration: YEAR, iterations: Infinity });
  // Set to the session's focused time when the minute was shown, then running on with it (the page's own time).
  expect(running.times).toHaveLength(1);
  expect(running.times[0]).toBeGreaterThanOrEqual(22 * MINUTE);
  expect(running.times[0]).toBeLessThan(22 * MINUTE + 10 * SECOND);
  // Paused, it holds exactly where the session is.
  await primary(page).click();
  await page.clock.runFor(3 * MINUTE);
  await settle(page);
  expect(await year(page)).toMatchObject({ states: ['paused'], times: [22 * MINUTE + 30 * SECOND] });
});

test('a session past an hour begins the tree’s year again', async ({ page }) => {
  await sessionAt(page, 70 * MINUTE);
  await primary(page).click();
  await settle(page);
  expect(await year(page)).toMatchObject({ states: ['paused'], times: [10 * MINUTE] });
});

test('with reduced motion, the tree stands at each minute’s start, stepping once a minute', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await sessionAt(page, 22 * MINUTE + 30 * SECOND);
  expect(await year(page)).toMatchObject({ states: ['paused'], times: [22 * MINUTE] });
  await page.clock.runFor(30 * SECOND);
  expect(await year(page)).toMatchObject({ states: ['paused'], times: [23 * MINUTE] });
});

test('the isometric view is a mode option, and only the chosen view’s art loads', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (request) => {
    const match = /\/(side|iso)-[\w-]+\.js$/.exec(new URL(request.url()).pathname);
    if (match?.[1] !== undefined) fetched.push(match[1]);
  });
  await sessionAt(page, 7 * MINUTE, { treeView: 'isometric' });
  await expect(page.locator('.tree__drawing')).toHaveClass(/tree--isometric/);
  await expect(page.locator('.tree__svg')).toHaveAttribute('aria-label', 'an isometric tree on a grassy field, cycling through the seasons');
  // 45 cubes in five colours, the field in five, and the snow (field and branches), falling and fallen leaves.
  expect((await year(page)).count).toBe(45 * 6 + 5 + 4);
  expect(fetched).toEqual(['iso']);
});

/**
 * The tree frames at moments through the year, checked in two parts (decision 318). The drawing, on its own: each
 * cluster's colours are five copies added together where the frames mix one colour, and the drawing is nested
 * layers where the frames draw one group, so leaf edges and thin branch strokes land a few levels apart (measured
 * at most 5 pixels past 8 levels side on, 22 isometric, 104 on the results card). The whole screen: the reference
 * image's Chromium draws the page's small text with subpixel anti-aliasing and the frame's with greyscale, as on
 * height's screens (decision 310): 633 pixels on the timer, 3,207 on the results card, smoothed at most 38.9;
 * Firefox and WebKit draw the results card's thin branches a little apart (smoothed 38.9 and 52.3). A control a
 * season off differs by far more.
 */
const TREE_SIDE = { visible: 10, levels: 12 };
const TREE_ISO = { visible: 40, levels: 30 };
const TREE_SCREEN = { visible: 800, smoothed: 40 };
const TREE_RESULTS_DRAWING = { visible: 150, smoothed: 45 };
const TREE_RESULTS_CARD = { visible: 4000, smoothed: 45 };
/** Elsewhere than the reference Chromium, the results card's branches (measured smoothed 52.3 in WebKit). */
const TREE_RESULTS_SMOOTHED = 60;

/** The drawing's box on the page, inside its edges. */
async function drawingClip(page: Page, selector = '.tree__drawing .tree__svg'): Promise<Clip> {
  const box = await page.locator(selector).boundingBox();
  if (box === null) throw new Error('no drawing');
  return { x: Math.ceil(box.x), y: Math.ceil(box.y), width: Math.floor(box.width) - 1, height: Math.floor(box.height) - 1 };
}

for (const [view, minutes] of [
  ['side', 7],
  ['side', 22],
  ['side', 37],
  ['side', 50],
  ['isometric', 7],
  ['isometric', 37],
  ['isometric', 50],
] as const) {
  test(`the tree matches the "tree, ${view === 'side' ? 'side view' : 'isometric'}" frame at ${String(minutes)} minutes`, async ({ page, browser, browserName }) => {
    await sessionAt(page, minutes * MINUTE + 500, { treeView: view });
    await freezeAnimations(page, { at: { [TREE_PARTS]: minutes * MINUTE } });
    const frame = view === 'side' ? treeSideFrame(minutes) : treeIsoFrame(minutes);
    const drawing = await compareWithReference(page, browser, frame, await drawingClip(page));
    const limit = view === 'side' ? TREE_SIDE : TREE_ISO;
    expectLikeFrame(drawing, browserName, () => {
      expect(drawing.visible, JSON.stringify(drawing)).toBeLessThanOrEqual(limit.visible);
      expect(drawing.maxChannelDelta, JSON.stringify(drawing)).toBeLessThanOrEqual(limit.levels);
    });
    const screen = await compareWithReference(page, browser, frame);
    expectLikeFrame(screen, browserName, () => {
      expect(screen.visible, JSON.stringify(screen)).toBeLessThanOrEqual(TREE_SCREEN.visible);
      expect(screen.smoothedMaxDelta, JSON.stringify(screen)).toBeLessThanOrEqual(TREE_SCREEN.smoothed);
    });
  });
}

test('control: the tree a season off fails its frame by far', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await sessionAt(page, 22 * MINUTE + 500);
  await freezeAnimations(page, { at: { [TREE_PARTS]: 22 * MINUTE } });
  const diff = await compareWithReference(page, browser, treeSideFrame(37));
  expect(diff.visible).toBeGreaterThan(1000);
});

test('results for the tree match the "results: tree" frame: full grown, in the season the session ended in', async ({ page, browser, browserName }) => {
  // Seconds blurring away, as the tree's frames are drawn (decision 419): a session of three hours otherwise
  // re-places the tree's animations every simulated second.
  await openApp(page, { width: 720, height: 520, mode: 'tree', settings: { hideSeconds: 'blur-away' } });
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
  const frame = resultsTreeFrame(167 + 40 / 60, '02:47:40', ['03:05:40', '00:18:00', '2', '01:32:00', '14:02', '17:07']);
  const drawing = await compareWithReference(page, browser, frame, await drawingClip(page, '.tree-replay .tree__svg'));
  const card = await compareWithReference(page, browser, frame);
  // Its own limits in every browser (see above).
  if (browserName === 'chromium' && process.env['PIXEL_REFERENCE'] === '1') {
    expect(drawing.visible, JSON.stringify(drawing)).toBeLessThanOrEqual(TREE_RESULTS_DRAWING.visible);
    expect(drawing.smoothedMaxDelta, JSON.stringify(drawing)).toBeLessThanOrEqual(TREE_RESULTS_DRAWING.smoothed);
    expect(card.visible, JSON.stringify(card)).toBeLessThanOrEqual(TREE_RESULTS_CARD.visible);
    expect(card.smoothedMaxDelta, JSON.stringify(card)).toBeLessThanOrEqual(TREE_RESULTS_CARD.smoothed);
  } else {
    expect(card.smoothedMaxDelta, JSON.stringify(card)).toBeLessThanOrEqual(TREE_RESULTS_SMOOTHED);
  }
});

test('the results tree grows with the replay: from 45 % with no leaves, to its size and season at the end', async ({ page }) => {
  await openApp(page, { width: 720, height: 520, mode: 'tree' });
  await primary(page).click();
  await page.clock.runFor(30 * MINUTE);
  await endThroughCountdown(page);
  await finishResults(page);
  await settle(page);
  const grown = (): Promise<string> => page.locator('.tree-replay .tree__grow').evaluate((group) => getComputedStyle(group).transform);
  // 30 minutes: 72.5 % at the end, in summer's end (a season every 15 minutes).
  expect(await grown()).toBe('matrix(0.725, 0, 0, 0.725, 0, 0)');
  // Held at the start of the replay (the results' one progress at 0): 45 %, bare.
  await page.evaluate(() => {
    const results = document.querySelector('.results');
    results?.removeAttribute('data-replayed');
    results?.animate([{ '--replay-progress': 0 }, { '--replay-progress': 0 }], { duration: 1000, fill: 'forwards' }).pause();
  });
  expect(await grown()).toBe('matrix(0.45, 0, 0, 0.45, 0, 0)');
  // Halfway through a 30-minute session: 15 minutes, summer's start, every cluster out.
  await page.evaluate(() => {
    document.querySelector('.results')?.animate([{ '--replay-progress': 0.5 }, { '--replay-progress': 0.5 }], { duration: 1000, fill: 'forwards' }).pause();
  });
  expect(await grown()).toBe('matrix(0.5875, 0, 0, 0.5875, 0, 0)');
  expect(new Set(await page.locator('.tree-replay .tree__cluster').evaluateAll((clusters) => clusters.map((cluster) => getComputedStyle(cluster).opacity)))).toEqual(new Set(['1']));
  await page.evaluate(() => {
    document.querySelector('.results')?.animate([{ '--replay-progress': 0 }, { '--replay-progress': 0 }], { duration: 1000, fill: 'forwards' }).pause();
  });
  const leaves = await page.locator('.tree-replay .tree__cluster').evaluateAll((clusters) => clusters.map((cluster) => getComputedStyle(cluster).opacity));
  expect(new Set(leaves)).toEqual(new Set(['0']));
});
