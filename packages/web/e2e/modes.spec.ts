/** Display modes through the contract, chosen in settings, and lazy loading. */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { createSession, oceanColour, serializeActiveState, startState } from '@stopwatch/core';
import { ENVIRONMENT_IN_TESTING, MINUTE, SECOND, T0, openApp, settle, openSettingsOn } from './helpers.ts';

test('digits, ring and timeline are in the core: shown without another download; a downloaded mode loads only when chosen', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { mode: 'ring', width: 1280, height: 800 });
  await expect(page.locator('.ring')).toBeVisible();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ring');
  // Round 2.10: the core holds what the timer, digits, ring and timeline need; nothing else loads for them.
  const atStart = [...scripts];
  expect(atStart.some((path) => /\/assets\/(?:ring|timeline|track|dial|analog)-/.test(path))).toBe(false);
  await openSettingsOn(page, 'display');
  await page.getByRole('radio', { name: 'timeline', exact: true }).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'timeline');
  expect(scripts.some((path) => /\/assets\/(?:timeline|track)-/.test(path))).toBe(false);
  expect(scripts.some((path) => /\/assets\/(?:dial|analog)-/.test(path))).toBe(false);
  await page.getByRole('radio', { name: 'analog', exact: true }).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'analog');
  expect(scripts.some((path) => path.includes('/assets/analog-'))).toBe(true);
  expect(scripts.some((path) => path.includes('/assets/dial-'))).toBe(true);
});

for (const value of ['Ring', 'Analog', 'sundial', '../ring', '', 42]) {
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

/** Each analog hand's resting turn and its glide, if any. */
interface AnalogHand {
  rest: string;
  glide: { from: string; to: string; easing: string; duration: number; state: string; at: number } | null;
  layer: string;
}

function analogHands(page: Page): Promise<{ minute: AnalogHand; hours: AnalogHand; seconds: AnalogHand }> {
  return page.locator('.analog').evaluate((analog) => {
    const read = (element: Element | null) => {
      if (element === null) throw new Error('no hand');
      const animation = element.getAnimations()[0];
      const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
      const frames = effect?.getKeyframes() ?? [];
      return {
        rest: (element as HTMLElement).style.transform,
        glide:
          animation === undefined || effect === null
            ? null
            : { from: String(frames[0]?.['transform']), to: String(frames.at(-1)?.['transform']), easing: String(effect.getTiming().easing), duration: Number(effect.getTiming().duration), state: animation.playState, at: Math.round(Number(animation.currentTime)) },
        layer: getComputedStyle(element).willChange,
      };
    };
    return {
      minute: read(analog.querySelector('.analog__hand--minute')),
      hours: read(analog.querySelector('.analog__hand[data-cycle="half-day"]')),
      seconds: read(analog.querySelector('.analog__hand[data-cycle="minute"]')),
    };
  });
}

test('the analog hands glide on their own layers, 6°, 0.5° and a whole turn a minute, anchored once a minute', async ({ page }) => {
  await openApp(page, { mode: 'analog' });
  expect(await analogHands(page)).toMatchObject({
    minute: { rest: 'rotate(0deg)', glide: null, layer: 'auto' },
    hours: { rest: 'rotate(0deg)', glide: null },
    seconds: { rest: 'rotate(0deg)', glide: null },
  });
  await page.locator('.button--primary').click();
  await page.clock.runFor(30 * SECOND);
  expect(await analogHands(page)).toMatchObject({
    minute: { glide: { from: 'rotate(0deg)', to: 'rotate(6deg)', easing: 'linear', duration: 60_000, state: 'running' }, layer: 'transform' },
    hours: { glide: { from: 'rotate(0deg)', to: 'rotate(0.5deg)', easing: 'linear', duration: 60_000, state: 'running' } },
    seconds: { glide: { from: 'rotate(0deg)', to: 'rotate(360deg)', easing: 'linear', duration: 60_000, state: 'running' } },
  });
  expect((await analogHands(page)).minute.glide?.at).toBeCloseTo(30_000, -3);
  await page.clock.runFor(84 * MINUTE - 30 * SECOND);
  expect(await analogHands(page)).toMatchObject({
    minute: { glide: { from: 'rotate(504deg)', to: 'rotate(510deg)' } },
    hours: { glide: { from: 'rotate(42deg)', to: 'rotate(42.5deg)' } },
    seconds: { glide: { from: 'rotate(30240deg)', to: 'rotate(30600deg)' } },
  });
});

test('with the seconds set never to show, the analog seconds hand rests at its 60', async ({ page }) => {
  await openApp(page, { mode: 'analog', settings: { seconds: 'never' } });
  await page.locator('.button--primary').click();
  await page.clock.runFor(30 * SECOND);
  expect(await analogHands(page)).toMatchObject({ minute: { glide: { state: 'running' } }, seconds: { rest: 'rotate(0deg)', glide: null } });
});

test('the analog crown dips once, by transform alone, when end is pressed (button or E)', async ({ page }) => {
  await openApp(page, { mode: 'analog' });
  const dips = (): Promise<{ count: number; frames: string[]; duration: number }> =>
    page.locator('.analog__crown').evaluate((crown) => {
      const animations = crown.getAnimations();
      const effect = animations[0]?.effect instanceof KeyframeEffect ? animations[0].effect : null;
      return { count: animations.length, frames: (effect?.getKeyframes() ?? []).map((frame) => String(frame['transform'])), duration: Number(effect?.getTiming().duration ?? 0) };
    });
  await page.locator('.button--primary').click();
  await page.clock.runFor(MINUTE);
  expect((await dips()).count).toBe(0);
  await page.keyboard.press('e');
  expect(await dips()).toEqual({ count: 1, frames: ['translateY(0px)', 'translateY(4px)', 'translateY(0px)'], duration: 180 });
  await page.locator('.ending .button--secondary').click();
  await page.getByRole('button', { name: 'end', exact: true }).dispatchEvent('pointerdown');
  expect((await dips()).count).toBeGreaterThanOrEqual(1);
});

test('the analog hands hold where they reached while paused, and glide on from there', async ({ page }) => {
  await openApp(page, { mode: 'analog' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * MINUTE + 30 * SECOND);
  await page.locator('.button--primary').click();
  expect(await analogHands(page)).toMatchObject({ minute: { rest: 'rotate(21deg)', glide: null, layer: 'auto' }, hours: { rest: 'rotate(1.75deg)', glide: null } });
  await page.clock.runFor(10 * MINUTE);
  expect((await analogHands(page)).minute).toMatchObject({ rest: 'rotate(21deg)', glide: null });
  await page.locator('.button--primary').click();
  expect((await analogHands(page)).minute.glide).toMatchObject({ from: 'rotate(18deg)', to: 'rotate(24deg)', state: 'running' });
});

for (const [how, prepare] of [
  ['low power', async (page: Page) => openApp(page, { mode: 'analog', settings: { lowPower: true } })],
  [
    'reduced motion',
    async (page: Page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, { mode: 'analog' });
    },
  ],
] as const) {
  test(`with ${how}, the analog hands step once a minute instead of gliding`, async ({ page }) => {
    await prepare(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(59 * SECOND);
    expect(await analogHands(page)).toMatchObject({ minute: { rest: 'rotate(0deg)', glide: null }, hours: { rest: 'rotate(0deg)', glide: null }, seconds: { rest: 'rotate(0deg)', glide: null } });
    await page.clock.runFor(SECOND);
    expect(await analogHands(page)).toMatchObject({ minute: { rest: 'rotate(6deg)', glide: null }, hours: { rest: 'rotate(0.5deg)', glide: null }, seconds: { rest: 'rotate(360deg)', glide: null } });
  });
}

test('analog keeps the time readable on request, and shows no digits', async ({ page }) => {
  await openApp(page, { mode: 'analog' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  const time = page.locator('.analog-stack .time--main');
  await expect(time).toHaveAttribute('role', 'timer');
  await expect(time).toHaveAccessibleName('1 hour 24 minutes focused');
  expect(await time.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  await expect(page.locator('.analog')).toHaveAttribute('aria-hidden', 'true');
});

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
  // Idle: still, the strip's start at now, the middle of the compact 360 px track (the past layer, the future layer
  // clipped from now, the labels).
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])).toEqual([
    ['translateX(180px)', null],
    ['translateX(0px)', null],
    ['translateX(180px)', null],
  ]);
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  const running = await timelineLayers(page);
  expect(running.map(({ glide }) => glide)).toEqual([
    { from: 'translateX(180px)', to: 'translateX(170px)', easing: 'linear', duration: 60_000, state: 'running' },
    { from: 'translateX(0px)', to: 'translateX(-10px)', easing: 'linear', duration: 60_000, state: 'running' },
    { from: 'translateX(180px)', to: 'translateX(170px)', easing: 'linear', duration: 60_000, state: 'running' },
  ]);
  expect(running.map(({ layer }) => layer)).toEqual(['transform', 'transform', 'transform']);
  // The next minute anchors the glide 10 px on, from where the last one ended.
  await page.clock.runFor(59 * SECOND);
  expect((await timelineLayers(page))[0]?.glide).toMatchObject({ from: 'translateX(170px)', to: 'translateX(160px)', state: 'running' });
  // Paused half way through the minute, it stands still where the glide had reached, drawn in place.
  await page.clock.runFor(30 * SECOND);
  await page.locator('.button--primary').click();
  const paused = await timelineLayers(page);
  expect(paused.map(({ rest, glide, layer }) => [rest, glide, layer])).toEqual([
    ['translateX(165px)', null, 'auto'],
    ['translateX(-15px)', null, 'auto'],
    ['translateX(165px)', null, 'auto'],
  ]);
  // Resumed, it glides on from there.
  await page.locator('.button--primary').click();
  expect((await timelineLayers(page))[0]?.glide).toMatchObject({ from: 'translateX(170px)', to: 'translateX(160px)', state: 'running' });
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
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])[0]).toEqual(['translateX(180px)', null]);
  await page.clock.runFor(SECOND);
  expect((await timelineLayers(page)).map(({ rest, glide }) => [rest, glide])).toEqual([
    ['translateX(170px)', null],
    ['translateX(-10px)', null],
    ['translateX(170px)', null],
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



/*
 * Ocean depth's water and its palette over it (the ocean frames). While ocean depth is in testing it keeps the
 * theme's background at all times, idle and running, with no environment colours (owner, round 2.10; test-modes.spec.ts
 * holds that), so the water is never drawn: these return when testing ends and the mode draws its environment again
 * (modes/built-in/ocean.ts, `environment`).
 */
test.describe('ocean depth\'s water (drawn again when testing ends)', () => {
  test.skip(true, ENVIRONMENT_IN_TESTING);

  /** The ocean's water: still or gliding, the window it shows, and its glide's keyframes. */
  interface Water {
    readonly still: boolean;
    readonly height: string;
    /** The first and last colours of the drawn gradient, as rgb(). */
    readonly top: string;
    readonly bottom: string;
    readonly layer: string;
    readonly glide: { readonly frames: number; readonly first: string; readonly last: string; readonly duration: number; readonly easing: string } | null;
  }

  /** A transform with its percentages to four decimals (WebKit writes six). */
  const fourDecimals = (transform: string): string => transform.replace(/-?\d+\.\d+/g, (number) => String(Number(Number(number).toFixed(4))));

  async function water(page: Page): Promise<Water> {
    const drawn = await page.locator('.light__strip').evaluate((strip) => {
      const colours = /rgb\([^)]*\)/g;
      const found = strip.style.backgroundImage.match(colours) ?? [];
      const animation = strip.getAnimations()[0];
      const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
      const frames = effect?.getKeyframes() ?? [];
      return {
        still: strip.classList.contains('light__strip--still'),
        height: strip.style.height,
        top: found[0] ?? '',
        bottom: found.at(-1) ?? '',
        layer: getComputedStyle(strip).willChange,
        glide:
          effect === null
            ? null
            : {
                frames: frames.length,
                first: String(frames[0]?.['transform']),
                last: String(frames.at(-1)?.['transform']),
                duration: Number(effect.getTiming().duration),
                easing: String(effect.getTiming().easing),
              },
      };
    });
    return drawn.glide === null ? drawn : { ...drawn, glide: { ...drawn.glide, first: fourDecimals(drawn.glide.first), last: fourDecimals(drawn.glide.last) } };
  }

  /** A light-model colour as the browser writes it in a gradient. */
  function rgb(depth: number): string {
    const hex = oceanColour(depth);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
  }

  test('before a session, ocean depth shows the water from the surface to 6 m, still', async ({ page }) => {
    await openApp(page, { mode: 'ocean' });
    expect(await water(page)).toMatchObject({ still: true, height: '100%', top: rgb(0), bottom: rgb(6), glide: null });
  });

  test('the water glides up the screen on its own layer, 15 m a minute, set afresh each minute', async ({ page }) => {
    await openApp(page, { mode: 'ocean' });
    await page.locator('.button--primary').click();
    await page.clock.runFor(6 * MINUTE + 30 * SECOND);
    // Minute 6: from 90 m to 105 m, the strip drawn from 84 m to 111 m (27 m, so 225 % of the screen).
    expect(await water(page)).toMatchObject({
      still: false,
      height: '225%',
      top: rgb(84),
      bottom: rgb(111),
      layer: 'transform',
      glide: { frames: 2, first: 'translateY(0%) scaleY(1)', last: 'translateY(-55.5556%) scaleY(1)', duration: MINUTE, easing: 'linear' },
    });
    await page.clock.runFor(MINUTE);
    expect(await water(page)).toMatchObject({ top: rgb(99), bottom: rgb(126), glide: { frames: 2, first: 'translateY(0%) scaleY(1)' } });
  });

  test('in its first metres the water stretches from the surface, never showing above it', async ({ page }) => {
    await openApp(page, { mode: 'ocean' });
    await page.locator('.button--primary').click();
    await page.clock.runFor(30 * SECOND);
    // Minute 0: the window grows from 0–6 m to 0–12 m by 6 m, then moves down to 9–21 m.
    const glide = (await water(page)).glide;
    expect(glide).toMatchObject({ first: 'translateY(0%) scaleY(2)', last: 'translateY(-42.8571%) scaleY(1)' });
    expect(glide?.frames).toBeGreaterThan(40);
    expect(await water(page)).toMatchObject({ top: rgb(0), bottom: rgb(21) });
  });

  test('paused, the water holds where it reached, and glides on from there', async ({ page }) => {
    await openApp(page, { mode: 'ocean' });
    await page.locator('.button--primary').click();
    await page.clock.runFor(6 * MINUTE + 30 * SECOND);
    await page.locator('.button--primary').click();
    await settle(page);
    // 97.5 m: 91.5 m to 103.5 m, filling the screen.
    expect(await water(page)).toMatchObject({ still: true, height: '100%', top: rgb(91.5), bottom: rgb(103.5), glide: null });
    await page.clock.runFor(5 * MINUTE);
    expect(await water(page)).toMatchObject({ still: true, top: rgb(91.5) });
    await page.locator('.button--primary').click();
    expect(await water(page)).toMatchObject({ still: false, top: rgb(84), glide: { frames: 2 } });
  });

  for (const [how, prepare] of [
    ['low power', async (page: Page) => openApp(page, { mode: 'ocean', settings: { lowPower: true } })],
    [
      'reduced motion',
      async (page: Page) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openApp(page, { mode: 'ocean' });
      },
    ],
  ] as const) {
    test(`with ${how}, the water steps once a minute instead of gliding`, async ({ page }) => {
      await prepare(page);
      await page.locator('.button--primary').click();
      await page.clock.runFor(59 * SECOND);
      expect(await water(page)).toMatchObject({ still: true, top: rgb(0), bottom: rgb(6), glide: null });
      await page.clock.runFor(SECOND);
      expect(await water(page)).toMatchObject({ still: true, top: rgb(9), bottom: rgb(21), glide: null });
    });
  }

  test('ocean depth stops at 10,935 m', async ({ page }) => {
    // A session 728 focused minutes in: its last minute down.
    const session = createSession({ id: '7d3e9a1c-2b4f-4e8a-9c6d-5f1a2b3c4d5e', mode: 'ocean', at: T0 - 728 * MINUTE, timeZone: 'UTC' });
    await page.goto('/sw-control.json');
    await page.evaluate((text) => {
      localStorage.setItem('timer.active', text);
    }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * MINUTE }));
    await openApp(page, { mode: 'ocean' });
    expect(await water(page)).toMatchObject({ still: false, top: rgb(10_914), bottom: rgb(10_941), glide: { frames: 2 } });
    await page.clock.runFor(MINUTE);
    // At the bottom: still, the deepest water filling the screen below it.
    expect(await water(page)).toMatchObject({ still: false, height: '100%', top: rgb(10_929), bottom: rgb(10_935), glide: null });
    await page.clock.runFor(10 * MINUTE);
    expect(await water(page)).toMatchObject({ height: '100%', top: rgb(10_929), glide: null });
  });

  test('the ocean palette keeps its text and buttons readable over the water: deep navy near the surface', async ({ page }) => {
    await openApp(page, { mode: 'ocean' });
    // Two stacked copies of the time and of each corner icon, the frames' colours and deep navy; one shows.
    const colours = (): Promise<{ time: string; icon: string; button: string }> =>
      page.locator('.screen').evaluate((screen) => {
        const navy = screen.querySelector('.contrast__shade');
        const dark = navy !== null && getComputedStyle(navy).opacity === '1';
        const time = screen.querySelector(dark ? '.contrast__shade .time--main' : '.contrast__lit .time--main');
        const icon = screen.querySelector(dark ? '.icon-button--settings .icon-shade' : '.icon-button--settings > svg');
        const button = screen.querySelector('.controls button');
        return { time: time === null ? '' : getComputedStyle(time).color, icon: icon === null ? '' : getComputedStyle(icon).color, button: button === null ? '' : getComputedStyle(button).color };
      });
    await settle(page);
    // At the surface the water is bright: the time and the icons are deep navy (owner, changes 3); the buttons keep theirs.
    expect(await colours()).toEqual({ time: 'rgb(14, 36, 64)', icon: 'rgb(14, 36, 64)', button: 'rgb(220, 232, 238)' });
    // Past 4.3 m (17 seconds of focus), the frames' own colours, from the next redraw.
    await page.locator('.button--primary').click();
    await page.clock.runFor(MINUTE);
    await settle(page);
    expect(await colours()).toMatchObject({ time: 'rgb(220, 232, 238)', icon: 'rgb(158, 195, 214)' });
  });
});

/** The life chunks the page fetched (art/ocean/life-<zone>). */
function lifeRequests(page: Page): string[] {
  const fetched: string[] = [];
  page.on('request', (request) => {
    const match = /\/life-([a-z]+)-[\w-]+\.js$/.exec(new URL(request.url()).pathname);
    if (match?.[1] !== undefined) fetched.push(match[1]);
  });
  return fetched;
}

test('ocean life arrives at random while paused, from the zone the dive is in, and leaves when the timer resumes', async ({ page }) => {
  const fetched = lifeRequests(page);
  await openApp(page, { mode: 'ocean' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(6 * MINUTE);
  await expect(page.locator('.life')).toHaveCount(0);
  await page.locator('.button--primary').click();
  const life = page.locator('.life--in');
  await life.waitFor({ state: 'attached' });
  // 90 m: the sunlight zone's catalog, and only it.
  await expect(page.locator('.life')).toHaveAttribute('data-zone', 'sunlight');
  expect(fetched.filter((zone) => zone !== 'placeholder')).toEqual(['sunlight']);
  // Arrivals at random from that zone's catalog (far, middle and near fish, and bubbles), as the recipe sets out:
  // the first within 3 s, the next 3 to 9 s apart, each staying 8 to 20 s, never more than four at once.
  const keys = await page.locator('.life [data-art]').evaluateAll((art) => [...new Set(art.map((element) => element.getAttribute('data-art')))]);
  expect(keys.every((key) => /^sunlight\/(fish-far|fish-mid|fish-near|bubble)$/.test(key ?? ''))).toBe(true);
  const arrivals = await page.locator('.life__arrival').evaluateAll((elements) =>
    elements.map((element) => {
      const [animation] = element.getAnimations().filter((candidate) => !(candidate instanceof CSSAnimation));
      const timing = animation?.effect?.getComputedTiming();
      const frames = (animation?.effect as KeyframeEffect | undefined)?.getKeyframes() ?? [];
      return {
        start: (timing?.delay ?? 0) / 1000,
        life: (frames[3]?.computedOffset ?? 0) * (Number(timing?.duration ?? 0) / 1000),
        properties: [...new Set(frames.flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key))))].sort(),
        iterations: timing?.iterations,
      };
    }),
  );
  expect(arrivals.length).toBeGreaterThan(10);
  expect(arrivals[0]?.start).toBeLessThanOrEqual(3);
  for (const [k, arrival] of arrivals.entries()) {
    expect(arrival.properties).toEqual(['opacity', 'transform']);
    expect(arrival.iterations).toBe(Infinity);
    expect(arrival.life).toBeGreaterThanOrEqual(8 - 1e-6);
    expect(arrival.life).toBeLessThanOrEqual(20 + 1e-6);
    const next = arrivals[k + 1];
    if (next !== undefined) expect(next.start - arrival.start).toBeGreaterThanOrEqual(3 - 1e-6);
    // One leaving as another arrives is not both at once (the keyframes' offsets carry a little rounding).
    const atOnce = arrivals.filter((other) => other.start <= arrival.start && other.start + other.life > arrival.start + 1e-6).length;
    expect(atOnce).toBeLessThanOrEqual(4);
  }
  // Fish at three distances, wiggling and bobbing by CSS; nothing else animates.
  const kinds = await page.locator('.life').evaluate((layer) => [...new Set(layer.getAnimations({ subtree: true }).map((animation) => animation.constructor.name))].sort());
  expect(kinds).toEqual(['Animation', 'CSSAnimation']);
  await page.locator('.button--primary').click();
  await expect(page.locator('.life')).toHaveCount(0);
});

test('deeper, ocean life comes from that zone only', async ({ page }) => {
  const fetched = lifeRequests(page);
  await openApp(page, { mode: 'ocean' });
  await page.locator('.button--primary').click();
  // 20 minutes: 300 m, in the twilight zone.
  await page.clock.runFor(20 * MINUTE);
  await page.locator('.button--primary').click();
  await page.locator('.life--in').waitFor({ state: 'attached' });
  await expect(page.locator('.life')).toHaveAttribute('data-zone', 'twilight');
  expect(fetched.filter((zone) => zone !== 'placeholder')).toEqual(['twilight']);
});

for (const [how, prepare] of [
  ['the option off', async (page: Page) => openApp(page, { mode: 'ocean', settings: { oceanLife: false } })],
  ['low power', async (page: Page) => openApp(page, { mode: 'ocean', settings: { lowPower: true } })],
  [
    'reduced motion',
    async (page: Page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, { mode: 'ocean' });
    },
  ],
] as const) {
  test(`with ${how}, no ocean life comes while paused`, async ({ page }) => {
    const fetched = lifeRequests(page);
    await prepare(page);
    await page.locator('.button--primary').click();
    await page.clock.runFor(6 * MINUTE);
    await page.locator('.button--primary').click();
    await page.clock.runFor(MINUTE);
    await settle(page);
    await expect(page.locator('.life')).toHaveCount(0);
    expect(fetched).toEqual([]);
  });
}

test('turning ocean life on while paused brings it in; off takes it away', async ({ page }) => {
  await openApp(page, { mode: 'ocean', width: 1280, height: 800, settings: { oceanLife: false } });
  await page.locator('.button--primary').click();
  await page.clock.runFor(6 * MINUTE);
  await page.locator('.button--primary').click();
  await openSettingsOn(page, 'display');
  const option = page.getByRole('switch', { name: 'ocean life' });
  await expect(option).toHaveAttribute('aria-checked', 'false');
  await option.click();
  await page.locator('.life--in').waitFor({ state: 'attached' });
  await option.click();
  await expect(page.locator('.life')).toHaveCount(0);
});
