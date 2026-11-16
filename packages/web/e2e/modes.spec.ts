/** Display modes through the contract, chosen in settings, and lazy loading. */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, openApp, settle } from './helpers.ts';

test('loads ring and timeline only when asked for', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { mode: 'ring' });
  await expect(page.locator('.ring')).toBeVisible();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ring');
  expect(scripts.some((path) => path.includes('/assets/ring-'))).toBe(true);
  expect(scripts.some((path) => path.includes('/assets/timeline-'))).toBe(false);
});

for (const value of ['Ring', 'analog', 'ocean', '../ring', '', 42]) {
  test(`shows digits for a stored mode of ${JSON.stringify(value)}`, async ({ page }) => {
    await openApp(page, { settings: { mode: value } });
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    await expect(page.locator('.ring, .timeline')).toHaveCount(0);
  });
}

test('no longer reads a mode from the address', async ({ page }) => {
  await page.goto('/?mode=ring');
  await page.locator('.button--primary').waitFor();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});

/** The ring's rotor: its resting transform, its glide if any, its tail's length, and whether it has its own layer. */
function ringRotor(page: Page): Promise<{ rest: string; glide: { from: string; to: string; easing: string; duration: number; state: string; at: number } | null; tail: string; layer: string }> {
  return page.locator('.ring__rotor').evaluate((element) => {
    const animation = element.getAnimations()[0];
    const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
    const frames = effect?.getKeyframes() ?? [];
    return {
      rest: (element as HTMLElement).style.transform,
      glide:
        animation === undefined || effect === null
          ? null
          : {
              from: String(frames[0]?.['transform']),
              to: String(frames.at(-1)?.['transform']),
              easing: String(effect.getTiming().easing),
              duration: Number(effect.getTiming().duration),
              state: animation.playState,
              at: Math.round(Number(animation.currentTime)),
            },
      tail: (element as HTMLElement).style.getPropertyValue('--ring-tail'),
      layer: getComputedStyle(element).willChange,
    };
  });
}

test('the ring glides 6° a minute on its own layer, anchored once a minute, and its tail grows in behind the head', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(0deg)', glide: null, tail: '0deg', layer: 'auto' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(30 * SECOND);
  // Half way through the first minute: gliding from 12 o'clock; the tail grows on whole minutes behind it.
  expect(await ringRotor(page)).toMatchObject({
    glide: { from: 'rotate(0deg)', to: 'rotate(6deg)', easing: 'linear', duration: 60_000, state: 'running' },
    tail: '0deg',
    layer: 'transform',
  });
  expect((await ringRotor(page)).glide?.at).toBeCloseTo(30_000, -3);
  await page.clock.runFor(30 * SECOND);
  expect(await ringRotor(page)).toMatchObject({ glide: { from: 'rotate(6deg)', to: 'rotate(12deg)', state: 'running' }, tail: '6deg' });
  await page.clock.runFor(4 * MINUTE + 2 * SECOND);
  expect(await ringRotor(page)).toMatchObject({ glide: { from: 'rotate(30deg)', to: 'rotate(36deg)' }, tail: '30deg' });
  // Whole after about nine minutes, and never changed again.
  await page.clock.runFor(5 * MINUTE);
  expect(await ringRotor(page)).toMatchObject({ glide: { from: 'rotate(60deg)', to: 'rotate(66deg)' }, tail: '55deg' });
  // Past 12 o'clock it keeps turning forward, never back.
  await page.clock.runFor(55 * MINUTE);
  expect(await ringRotor(page)).toMatchObject({ glide: { from: 'rotate(390deg)', to: 'rotate(396deg)' }, tail: '55deg' });
});

test('the ring holds where its glide had reached while paused, and glides on from there', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * MINUTE + 30 * SECOND);
  await page.locator('.button--primary').click();
  expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(21deg)', glide: null, layer: 'auto' });
  await page.clock.runFor(10 * MINUTE);
  expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(21deg)', glide: null });
  await page.locator('.button--primary').click();
  expect(await ringRotor(page)).toMatchObject({ glide: { from: 'rotate(18deg)', to: 'rotate(24deg)', state: 'running' } });
  expect((await ringRotor(page)).glide?.at).toBeCloseTo(30_000, -3);
});

for (const [how, prepare] of [
  ['low power', async (page: Page) => openApp(page, { mode: 'ring', settings: { lowPower: true } })],
  [
    'reduced motion',
    async (page: Page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, { mode: 'ring' });
    },
  ],
] as const) {
  test(`with ${how}, the ring steps once a minute instead of gliding`, async ({ page }) => {
    await prepare(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(59 * SECOND);
    expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(0deg)', glide: null, tail: '0deg', layer: 'auto' });
    await page.clock.runFor(SECOND);
    expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(6deg)', glide: null, tail: '6deg' });
    await page.clock.runFor(9 * MINUTE + 30 * SECOND);
    expect(await ringRotor(page)).toMatchObject({ rest: 'rotate(60deg)', glide: null, tail: '55deg' });
  });
}

/** Each timeline layer's resting transform and its glide, if any. */
function timelineLayers(page: Page): Promise<{ rest: string; glide: { from: string; to: string; easing: string; duration: number; state: string } | null; layer: string }[]> {
  return page.locator('.timeline__glide').evaluateAll((layers) =>
    layers.map((element) => {
      const animation = element.getAnimations()[0];
      const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
      const frames = effect?.getKeyframes() ?? [];
      return {
        rest: (element as HTMLElement).style.transform,
        glide:
          animation === undefined || effect === null
            ? null
            : { from: String(frames[0]?.['transform']), to: String(frames.at(-1)?.['transform']), easing: String(effect.getTiming().easing), duration: Number(effect.getTiming().duration), state: animation.playState },
        layer: getComputedStyle(element).willChange,
      };
    }),
  );
}

test('the timeline glides 10 px a minute on its own layers, anchored once a minute, and draws nothing before the start', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  // Idle: still, the strip's start at now (the past layer, the future layer clipped from now, the labels).
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])).toEqual([
    ['translateX(240px)', null],
    ['translateX(0px)', null],
    ['translateX(240px)', null],
  ]);
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  const running = await timelineLayers(page);
  expect(running.map(({ glide }) => glide)).toEqual([
    { from: 'translateX(240px)', to: 'translateX(230px)', easing: 'linear', duration: 60_000, state: 'running' },
    { from: 'translateX(0px)', to: 'translateX(-10px)', easing: 'linear', duration: 60_000, state: 'running' },
    { from: 'translateX(240px)', to: 'translateX(230px)', easing: 'linear', duration: 60_000, state: 'running' },
  ]);
  expect(running.map(({ layer }) => layer)).toEqual(['transform', 'transform', 'transform']);
  // The next minute anchors the glide 10 px on, from where the last one ended.
  await page.clock.runFor(59 * SECOND);
  expect((await timelineLayers(page))[0]?.glide).toMatchObject({ from: 'translateX(230px)', to: 'translateX(220px)', state: 'running' });
  // Paused half way through the minute, it stands still where the glide had reached, drawn in place.
  await page.clock.runFor(30 * SECOND);
  await page.locator('.button--primary').click();
  const paused = await timelineLayers(page);
  expect(paused.map(({ rest, glide, layer }) => [rest, glide, layer])).toEqual([
    ['translateX(225px)', null, 'auto'],
    ['translateX(-15px)', null, 'auto'],
    ['translateX(225px)', null, 'auto'],
  ]);
  // Resumed, it glides on from there.
  await page.locator('.button--primary').click();
  expect((await timelineLayers(page))[0]?.glide).toMatchObject({ from: 'translateX(230px)', to: 'translateX(220px)', state: 'running' });
  expect(await page.locator('.timeline__glide').first().evaluate((element) => element.getAnimations()[0]?.currentTime)).toBeCloseTo(30_000, -3);
  // The strip starts at the session's start: nothing at negative positions.
  const leftmost = await page.locator('.timeline__strip rect, .timeline__label').evaluateAll((shapes) => Math.min(...shapes.map((shape) => Number(shape.getAttribute('x')))));
  expect(leftmost).toBe(0);
  expect(await page.locator('.timeline__svg').evaluateAll((drawings) => drawings.map((drawing) => drawing.getAttribute('shape-rendering')))).toEqual(['crispEdges', 'crispEdges', 'crispEdges']);
});

for (const [how, prepare] of [
  ['low power', async (page: Page) => openApp(page, { mode: 'timeline', settings: { lowPower: true } })],
  [
    'reduced motion',
    async (page: Page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, { mode: 'timeline' });
    },
  ],
] as const) {
test(`with ${how}, the timeline steps once a minute instead of gliding`, async ({ page }) => {
  await prepare(page);
  await page.locator('.button--primary').click();
  await page.clock.runFor(59 * SECOND);
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])[0]).toEqual(['translateX(240px)', null]);
  await page.clock.runFor(SECOND);
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])).toEqual([
    ['translateX(230px)', null],
    ['translateX(-10px)', null],
    ['translateX(230px)', null],
  ]);
});
}

for (const mode of ['ring', 'timeline', 'digits']) {
  test(`paused in ${mode}, the whole display blurs and the buttons stay sharp`, async ({ page }) => {
    await openApp(page, { mode });
    await page.locator('.button--primary').click();
    await page.clock.runFor(2 * MINUTE);
    await page.locator('.button--primary').click();
    await settle(page);
    // At rest, as the frames draw it: the display itself blurred 10 px at 40 %; no veil.
    const body = page.locator('.time-stack__body');
    const veil = page.locator('.time-stack__veil');
    expect(await body.evaluate((element) => [getComputedStyle(element).filter, getComputedStyle(element).opacity]), mode).toEqual(['blur(10px)', '0.4']);
    expect(await veil.evaluate((element) => [getComputedStyle(element).backdropFilter, getComputedStyle(element).opacity]), mode).toEqual(['none', '0']);
    // The graphics are inside the blurred body; the pause length and buttons are not.
    if (mode !== 'digits') expect(await body.locator(mode === 'ring' ? '.ring__rotor' : '.timeline__track').count(), mode).toBe(1);
    expect(await page.locator('.time--paused-for').evaluate((element) => element.closest('.time-stack__body'))).toBeNull();
    expect(await page.locator('.screen > .controls').evaluate((element) => getComputedStyle(element).filter), mode).toBe('none');
    // Resumed: the blurred state fades out through the veil, whose blur is fixed; only opacities move.
    await page.locator('.button--primary').click();
    expect(await body.evaluate((element) => getComputedStyle(element).filter), mode).toBe('none');
    expect(await veil.evaluate((element) => [getComputedStyle(element).backdropFilter, element.getAnimations().map((animation) => (animation.effect as KeyframeEffect).getKeyframes().map((frame) => Object.keys(frame).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))))]), mode).toEqual(['blur(10px)', [[['opacity'], ['opacity']]]]);
    await settle(page);
    expect(await veil.evaluate((element) => [getComputedStyle(element).backdropFilter, getComputedStyle(element).opacity]), mode).toEqual(['none', '0']);
    expect(await body.evaluate((element) => [getComputedStyle(element).filter, getComputedStyle(element).opacity]), mode).toEqual(['none', '1']);
  });
}

test('modes record the mode a session started in', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  await expect(page.locator('.timeline__frame')).toBeVisible();
  await expect(page.locator('.timeline .time--main')).toBeVisible();
});


