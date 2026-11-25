/** Height (round 2.5): the sky and its stars, the pause's effects, its frames, and its results. */

import { expect, test } from './test.ts';
import type { Browser, Page } from '@playwright/test';
import { createSession, HEIGHT_CONFIG, HEIGHT_COPY, serializeActiveState, skyColour, startState } from '@stopwatch/core';
import { resultsHeightLitFrame } from './fixtures/frames.ts';
import type { FrameLandmark, ResultsData } from './fixtures/frames.ts';
import { heightFrame, heightPausedFrame } from './fixtures/mode-frames.ts';
import { compareWithReference, endThroughCountdown, ENVIRONMENT_IN_TESTING, finishResults, freezeAnimations, MINUTE, openApp, SECOND, settle, T0, T_READY } from './helpers.ts';
import { builtInRecipe } from './fixtures/recipes.ts';
import { expectLikeFrame } from './pixels.ts';
import type { Clip } from './helpers.ts';

const HEIGHT = HEIGHT_CONFIG;

// The results frames' clock times are 24-hour, in UTC (as results.spec.ts).
test.use({ locale: 'en-GB', timezoneId: 'UTC' });
const primary = (page: Page) => page.locator('.button--primary');

/** Opens the site with a height session `focusMs` in when it is ready (restored, so no check-in has come due). */
async function restoreAt(page: Page, focusMs: number, settings?: Readonly<Record<string, unknown>>): Promise<void> {
  const session = createSession({ id: '3c5a7e9b-1d2f-4a6b-8c0d-2e4f6a8b0c1d', mode: 'height', at: T_READY - focusMs, timeZone: 'UTC' });
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * SECOND }));
  await openApp(page, { mode: 'height', ...(settings === undefined ? {} : { settings }) });
}

/** The sky: still or gliding, the stretch it is drawn over, and its glide; the stars' opacity and glide. */
interface Sky {
  readonly still: boolean;
  readonly height: string;
  /** The first and last colours of the drawn gradient (bottom and top), as rgb(). */
  readonly bottom: string;
  readonly top: string;
  readonly layer: string;
  readonly glide: { readonly first: string; readonly last: string; readonly duration: number; readonly easing: string } | null;
  readonly stars: { readonly opacity: string; readonly glide: readonly [number, number] | null };
}

/** A transform with its percentages to four decimals (WebKit writes six). */
const fourDecimals = (transform: string): string => transform.replace(/-?\d+\.\d+/g, (number) => String(Number(Number(number).toFixed(4))));

async function sky(page: Page): Promise<Sky> {
  const drawn = await page.locator('.light').evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.light__strip');
    const stars = element.querySelector<HTMLElement>('.starfield');
    if (strip === null || stars === null) throw new Error('no sky');
    const found = strip.style.backgroundImage.match(/rgb\([^)]*\)/g) ?? [];
    const effect = (target: HTMLElement): KeyframeEffect | null => {
      const animation = target.getAnimations()[0];
      return animation?.effect instanceof KeyframeEffect ? animation.effect : null;
    };
    const glide = effect(strip);
    const twinkle = effect(stars);
    const frames = glide?.getKeyframes() ?? [];
    const starFrames = twinkle?.getKeyframes() ?? [];
    return {
      still: strip.classList.contains('light__strip--still'),
      height: strip.style.height,
      bottom: found[0] ?? '',
      top: found.at(-1) ?? '',
      layer: getComputedStyle(strip).willChange,
      glide: glide === null ? null : { first: String(frames[0]?.['transform']), last: String(frames.at(-1)?.['transform']), duration: Number(glide.getTiming().duration), easing: String(glide.getTiming().easing) },
      stars: { opacity: stars.style.opacity, glide: twinkle === null ? null : ([Number(starFrames[0]?.['opacity']), Number(starFrames.at(-1)?.['opacity'])] as const) },
    };
  });
  return drawn.glide === null ? drawn : { ...drawn, glide: { ...drawn.glide, first: fourDecimals(drawn.glide.first), last: fourDecimals(drawn.glide.last) } };
}

/** A light-model colour as the browser writes it in a gradient. */
function rgb(height: number): string {
  const hex = skyColour(height);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
}

const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

test('before a session, height shows the sky from 1,500 m below the ground to 1,500 m above, still, with no stars', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  await openApp(page, { mode: 'height' });
  expect(await sky(page)).toMatchObject({ still: true, height: '100%', bottom: rgb(-1500), top: rgb(1500), glide: null, stars: { opacity: '0', glide: null } });
});

test('the sky glides down the screen on its own layer, 140 m a minute, set afresh each minute', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  await openApp(page, { mode: 'height' });
  await primary(page).click();
  await page.clock.runFor(84 * MINUTE + 30 * SECOND);
  // Minute 84: from 11,760 m to 11,900 m, the strip drawn from 10,260 m to 13,400 m (3,140 m, 104.6667 % of the
  // screen), moving down by 140 m of it.
  expect(await sky(page)).toMatchObject({
    still: false,
    height: expect.stringMatching(/^104\.66[67]/),
    bottom: rgb(10_260),
    top: rgb(13_400),
    layer: 'transform',
    glide: { first: 'translateY(0%)', last: 'translateY(4.4586%)', duration: MINUTE, easing: 'linear' },
    stars: { glide: [0, 0] },
  });
  await page.clock.runFor(MINUTE);
  expect(await sky(page)).toMatchObject({ bottom: rgb(10_400), top: rgb(13_540), glide: { first: 'translateY(0%)' } });
});

test('the stars fade in with the climb, from 18 km to 42 km, gliding with the sky', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  // 30 km is minute 214 2/7: the glide of minute 214 runs from 29,960 m to 30,100 m.
  await restoreAt(page, 214 * MINUTE + 30 * SECOND);
  const stars = (await sky(page)).stars.glide;
  expect(stars?.[0]).toBeCloseTo(sm((29_960 - 18_000) / 24_000), 6);
  expect(stars?.[1]).toBeCloseTo(sm((30_100 - 18_000) / 24_000), 6);
  await expect(page.locator('.starfield .art circle')).toHaveCount(127);
  // Paused, they hold exactly where the climb is.
  await primary(page).click();
  await settle(page);
  const held = await sky(page);
  expect(held.stars.glide).toBeNull();
  expect(Number(held.stars.opacity)).toBeCloseTo(sm((30_030 - 18_000) / 24_000), 6);
});

test('paused, the sky holds where it reached, and glides on from there', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  await openApp(page, { mode: 'height' });
  await primary(page).click();
  await page.clock.runFor(84 * MINUTE + 30 * SECOND);
  await primary(page).click();
  await settle(page);
  // 11,830 m: 10,330 m to 13,330 m, filling the screen.
  expect(await sky(page)).toMatchObject({ still: true, height: '100%', bottom: rgb(10_330), top: rgb(13_330), glide: null });
  await page.clock.runFor(5 * MINUTE);
  expect(await sky(page)).toMatchObject({ still: true, bottom: rgb(10_330) });
  await primary(page).click();
  expect(await sky(page)).toMatchObject({ still: false, bottom: rgb(10_260) });
});

for (const [how, prepare] of [
  [
    'reduced motion',
    async (page: Page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openApp(page, { mode: 'height' });
    },
  ],
] as const) {
  test(`with ${how}, the sky steps once a minute instead of gliding`, async ({ page }) => {
    test.skip(true, ENVIRONMENT_IN_TESTING);
    await prepare(page);
    await primary(page).click();
    await page.clock.runFor(59 * SECOND);
    expect(await sky(page)).toMatchObject({ still: true, bottom: rgb(-1500), top: rgb(1500), glide: null });
    await page.clock.runFor(SECOND);
    expect(await sky(page)).toMatchObject({ still: true, bottom: rgb(-1360), top: rgb(1640), glide: null });
  });
}

test('height stops at 100 km', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  // 714 focused minutes in: its last minute up, from 99,960 m.
  await restoreAt(page, 714 * MINUTE + 30 * SECOND);
  expect(await sky(page)).toMatchObject({ still: false, bottom: rgb(98_460), glide: { first: 'translateY(0%)' } });
  await page.clock.runFor(MINUTE);
  // At the top: still, the sky at 100 km filling the screen.
  expect(await sky(page)).toMatchObject({ still: false, height: '100%', bottom: rgb(98_500), top: rgb(101_500), glide: null, stars: { opacity: '1' } });
  await page.clock.runFor(10 * MINUTE);
  expect(await sky(page)).toMatchObject({ height: '100%', bottom: rgb(98_500), glide: null });
});

test('the height palette keeps its text and buttons readable over the sky, the icons dimmer while paused', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  // Two stacked copies of the time and of each corner icon, the frames' colours and deep navy; one shows.
  const colours = (): Promise<{ time: string; icon: string; button: string; shown: string }> =>
    page.locator('.screen').evaluate((screen) => {
      const navy = screen.querySelector('.contrast__shade');
      const dark = navy !== null && getComputedStyle(navy).opacity === '1';
      const time = screen.querySelector(dark ? '.contrast__shade .time--main' : '.contrast__lit .time--main');
      const icon = screen.querySelector(dark ? '.icon-button--settings .icon-shade' : '.icon-button--settings > svg');
      const button = screen.querySelector('.controls button');
      return { time: time === null ? '' : getComputedStyle(time).color, icon: icon === null ? '' : getComputedStyle(icon).color, button: button === null ? '' : getComputedStyle(button).color, shown: dark ? 'navy' : 'own' };
    });
  // Near the ground, where the sky is bright, the time and the icons are deep navy (owner, changes 3); the buttons keep theirs.
  await openApp(page, { mode: 'height' });
  await settle(page);
  const navy = 'rgb(14, 36, 64)';
  expect(await colours()).toEqual({ time: navy, icon: navy, button: 'rgb(238, 244, 250)', shown: 'navy' });
  // Above the switch (4,046 m), the frames' own palette.
  await restoreAt(page, 13_388_571);
  await settle(page);
  expect(await colours()).toMatchObject({ time: 'rgb(238, 244, 250)', icon: 'rgb(201, 220, 238)', shown: 'own' });
  await primary(page).click();
  await settle(page);
  expect((await colours()).icon).toBe('rgb(154, 166, 200)');
});

test('the contrast switch crossfades the time and the icons back from navy, by opacity alone, as the sky darkens past 4,046 m', async ({ page }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  const contrast = (): Promise<string | undefined> => page.locator('.screen').evaluate((screen) => (screen as HTMLElement).dataset['contrast']);
  // 4,046 m is reached after 28 minutes 54 seconds of focus; the display redraws on the minute.
  await restoreAt(page, 28 * MINUTE + 50 * SECOND);
  expect(await contrast()).toBe('dark');
  await page.clock.runFor(20 * SECOND);
  expect(await contrast()).toBeUndefined();
  // The two copies cross by opacity over 220 ms: nothing but opacity transitions.
  const fades = await page.locator('.contrast__lit, .contrast__shade, .icon-lit, .icon-shade').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return `${style.transitionProperty} ${style.transitionDuration}`;
    }),
  );
  expect(new Set(fades)).toEqual(new Set(['opacity 0.22s']));
});

/** Everything about the pause's streaks, read from the page. */
async function meteors(page: Page) {
  return page.locator('.meteor').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      const animations = element.getAnimations();
      return {
        shower: element.classList.contains('meteor--shower'),
        name: style.animationName,
        css: animations.length > 0 && animations.every((animation) => animation instanceof CSSAnimation),
        period: Number.parseFloat(style.animationDuration),
        delay: Number.parseFloat(style.animationDelay),
        iterations: style.animationIterationCount,
        width: Number.parseFloat(style.width),
        height: Number.parseFloat(style.height),
        colour: style.getPropertyValue('--meteor-colour').trim(),
        left: Number.parseFloat(style.left),
        top: Number.parseFloat(style.top),
      };
    }),
  );
}

test('paused above the stars: the altitude line, shooting stars and a shower, all drawn once by CSS; they go when the timer resumes', async ({ page }) => {
  // 31,240 m (223 1/7 focused minutes).
  await restoreAt(page, 13_388_571);
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.recipe__caption .contrast__lit')).toHaveText('31,240 m · stratosphere');
  await expect(page.locator('.recipe__caption')).toHaveCSS('opacity', '1');
  const drawn = await meteors(page);
  const shooting = drawn.filter((meteor) => !meteor.shower);
  const shower = drawn.filter((meteor) => meteor.shower);
  const { meteors: m } = HEIGHT;
  const recipeColours = builtInRecipe('height').layers.flatMap((layer) => (layer.type === 'particles' ? (layer.colors ?? []) : []));
  expect(recipeColours).toHaveLength(4);
  expect(shooting).toHaveLength(m.count);
  expect(shower.length).toBeGreaterThanOrEqual(m.shower.count.min);
  expect(shower.length).toBeLessThanOrEqual(m.shower.count.max);
  for (const meteor of drawn) {
    expect(meteor.css).toBe(true);
    expect(meteor.iterations).toBe('infinite');
    expect(meteor.width).toBeGreaterThanOrEqual(m.lengthPx.min);
    expect(meteor.width).toBeLessThanOrEqual(m.lengthPx.max);
    expect(meteor.height).toBeGreaterThanOrEqual(m.thicknessPx.min);
    expect(meteor.height).toBeLessThanOrEqual(m.thicknessPx.max);
    expect(recipeColours).toContain(meteor.colour.toUpperCase());
  }
  for (const meteor of shooting) {
    expect(meteor.name).toBe('height-shoot');
    expect(meteor.period).toBeGreaterThanOrEqual(m.periodSeconds.min);
    expect(meteor.period).toBeLessThanOrEqual(m.periodSeconds.max);
    expect(meteor.delay).toBeLessThan(meteor.period);
  }
  // The shower: from one point, within 3 s, once every few minutes.
  const delays = shower.map((meteor) => meteor.delay);
  expect(Math.max(...delays) - Math.min(...delays)).toBeLessThanOrEqual(m.shower.withinSeconds);
  for (const meteor of shower) {
    expect(meteor.name).toBe('height-shower');
    expect(meteor.period).toBe(m.shower.periodSeconds);
  }
  const lefts = shower.map((meteor) => meteor.left);
  const tops = shower.map((meteor) => meteor.top);
  expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(2 * m.shower.spreadPx + 1);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2 * m.shower.spreadPx + 1);
  // Drawn once: the same streaks a minute later.
  await page.clock.runFor(MINUTE);
  expect(await meteors(page)).toEqual(drawn);
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.meteors')).toHaveCount(0);
  // While height is in testing its altitude line stays as the session runs (owner, round 2.11, bug 5).
  await expect(page.locator('.recipe__caption')).toHaveCSS('opacity', '1');
});

test('paused below the stars: the altitude line, and no shooting stars', async ({ page }) => {
  await openApp(page, { mode: 'height' });
  await primary(page).click();
  await page.clock.runFor(84 * MINUTE);
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.recipe__caption .contrast__lit')).toHaveText('11,760 m · troposphere');
  await expect(page.locator('.meteor')).toHaveCount(0);
});

test('with reduced motion, nothing comes while paused: no shooting stars; the altitude line stays while in testing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await restoreAt(page, 13_388_571);
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.meteor')).toHaveCount(0);
  // The line is the altitude's one sign on the theme's background (owner, round 2.11, bug 5; decision 396).
  await expect(page.locator('.recipe__caption')).toHaveCSS('opacity', '1');
});

// The height frames draw the sky as one gradient between the colours 1,500 m above and below; the site draws a
// stop every 100 m, so it follows the light model's curve as it glides. Measured at most 2 levels apart.
const HEIGHT_LEVELS = 3;
/**
 * In the reference image, Chromium draws the timer's small text over the sky (the button labels; on the paused
 * screen "paused for", its time and the altitude line) with subpixel anti-aliasing, and the frame's page with
 * greyscale: 324 pixels past 8 levels on the running frames, 2,673 on the paused one, smoothed at most 25.6 and
 * 32.6, all on glyph edges (Firefox and WebKit match within a level). The sky away from text is checked exactly
 * below, and a control 1,000 m off fails it (decision 310).
 */
const HEIGHT_TEXT_EDGES = 400;
const HEIGHT_PAUSED_TEXT_EDGES = 3000;
const HEIGHT_TEXT_SMOOTHED = 40;
/** Where the height frames draw no text: the sky and its stars alone, above the time and below the buttons. */
const SKY_ONLY: readonly Clip[] = [
  { x: 0, y: 50, width: 640, height: 90 },
  { x: 0, y: 310, width: 720, height: 100 },
];

async function expectSkyLikeFrame(page: Page, browser: Browser, browserName: string, markup: string): Promise<void> {
  for (const clip of SKY_ONLY) {
    const diff = await compareWithReference(page, browser, markup, clip);
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible, JSON.stringify(diff)).toBe(0);
      expect(diff.maxChannelDelta, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_LEVELS);
    });
  }
}

for (const [frame, focus, h, hhmm] of [
  ['at 1 h 24 min (11,760 m)', 84 * MINUTE, 11_760, '01:24'],
  ['at 3 h 34 min (29,960 m), stars coming out', 214 * MINUTE, 29_960, '03:34'],
  ['at 5 h (42,000 m), every star out', 300 * MINUTE, 42_000, '05:00'],
] as const) {
  test(`height matches the "height, full climb" frame ${frame}`, async ({ page, browser, browserName }) => {
    test.skip(true, ENVIRONMENT_IN_TESTING);
    // Half a second into the minute, so it reads as that minute; the glide is frozen at the minute's start.
    await restoreAt(page, focus + 500);
    await settle(page);
    await freezeAnimations(page, { at: { '.light__strip': 0, '.starfield': 0 } });
    const diff = await compareWithReference(page, browser, heightFrame(h, hhmm));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_TEXT_EDGES);
      expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_TEXT_SMOOTHED);
    });
    await expectSkyLikeFrame(page, browser, browserName, heightFrame(h, hhmm));
  });
}

test('height matches the "height, paused" frame without its random shooting stars', async ({ page, browser, browserName }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  await restoreAt(page, 13_388_571);
  await primary(page).click();
  await page.clock.runFor(4 * MINUTE + 12 * SECOND);
  await settle(page);
  // The shooting stars are drawn at random (and checked above); the rest of the frame is compared.
  await page.locator('.meteors').evaluate((element) => {
    element.remove();
  });
  await freezeAnimations(page);
  const frame = heightPausedFrame(31_240, '03:43', '00:04:12', '31,240 m · stratosphere');
  const diff = await compareWithReference(page, browser, frame);
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_PAUSED_TEXT_EDGES);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_TEXT_SMOOTHED);
  });
  await expectSkyLikeFrame(page, browser, browserName, frame);
});

test('control: the sky 1,000 m off fails the running frame by far', async ({ page, browser, browserName }) => {
  test.skip(true, ENVIRONMENT_IN_TESTING);
  test.skip(browserName !== 'chromium' || process.env['PIXEL_REFERENCE'] !== '1', 'exact pixel rules hold only in the reference environment');
  await restoreAt(page, 84 * MINUTE + 500);
  await settle(page);
  await freezeAnimations(page, { at: { '.light__strip': 0, '.starfield': 0 } });
  for (const clip of SKY_ONLY) expect((await compareWithReference(page, browser, heightFrame(12_760, '01:24'), clip)).maxChannelDelta).toBeGreaterThan(HEIGHT_LEVELS);
});

// ---- Results ---------------------------------------------------------------------------------------------

/** The sample session of the results frames: 2 h 47 min 40 s of focus with two pauses. */
async function playSampleSession(page: Page, settings?: Readonly<Record<string, unknown>>): Promise<void> {
  await openApp(page, { width: 720, height: 520, mode: 'height', ...(settings === undefined ? {} : { settings }) });
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
  hours: [],
};

/** The landmarks the climb profile drew, as the frame lists them: height and name (from the list read aloud). */
function drawnLandmarks(page: Page): Promise<FrameLandmark[]> {
  return page.locator('.profile li').evaluateAll((items) =>
    items.map((item): [number, string] => {
      const [name = '', height = ''] = item.textContent.split(' · ');
      return [Number(height.replace(/[^0-9]/g, '')), name];
    }),
  );
}

/** Edge noise allowed on the line under the landmark dots, as on the ocean results (results.spec.ts). */
const LANDMARK_EDGES = 250;
const LANDMARK_SMOOTHED = 20;

test('results for height match the "results: height (build this one)" frame exactly, without landmarks', async ({ page, browser, browserName }) => {
  await playSampleSession(page, { heightLandmarks: false });
  await expect(page.locator('.profile__landmark')).toHaveCount(0);
  const diff = await compareWithReference(page, browser, resultsHeightLitFrame(SAMPLE, []));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBe(0);
    expect(diff.maxChannelDelta, JSON.stringify(diff)).toBeLessThanOrEqual(HEIGHT_LEVELS);
  });
});

test('results for height match the frame with the landmarks they picked: only their dots once the labels fade', async ({ page, browser, browserName }) => {
  await playSampleSession(page);
  await page.mouse.move(0, 0);
  await settle(page);
  const landmarks = await drawnLandmarks(page);
  expect(landmarks.length).toBeGreaterThan(0);
  await expect.poll(() => page.locator('.profile__landmark-tag').evaluateAll((tags) => tags.every((tag) => getComputedStyle(tag).opacity === '0'))).toBe(true);
  const diff = await compareWithReference(page, browser, resultsHeightLitFrame(SAMPLE, landmarks));
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(LANDMARK_EDGES);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(LANDMARK_SMOOTHED);
  });
});

test('the climb profile shows at most six landmarks, at most two from each 10 km band, only from the catalog and only where the climb went', async ({ page }) => {
  await playSampleSession(page);
  const catalog = new Map<number, string>(HEIGHT.landmarks.map(([height, id]): [number, string] => [height, HEIGHT_COPY.landmarks[id]]));
  const reached = (167 + 40 / 60) * HEIGHT.metresPerFocusedMinute;
  const landmarks = await drawnLandmarks(page);
  expect(landmarks.length).toBeGreaterThan(0);
  expect(landmarks.length).toBeLessThanOrEqual(6);
  await expect(page.locator('.profile__landmark')).toHaveCount(landmarks.length);
  const perBand = new Map<number, number>();
  for (const [height, name] of landmarks) {
    expect(catalog.get(height)).toBe(name);
    expect(height).toBeLessThanOrEqual(reached);
    perBand.set(Math.floor(height / 10_000), (perBand.get(Math.floor(height / 10_000)) ?? 0) + 1);
  }
  for (const count of perBand.values()) expect(count).toBeLessThanOrEqual(2);
  await expect(page.locator('.profile ul[aria-label="landmarks passed"] li')).toHaveCount(landmarks.length);
});

test('every landmark dot lies on the climb, within 1 px, at rest and as the chart zooms during the replay', async ({ page }) => {
  await playSampleSession(page);
  const offPath = (): Promise<number[]> =>
    page.locator('.profile__chart').evaluate((chart) => {
      const line = chart.querySelector<SVGPolylineElement>('.profile__line');
      const matrix = line?.getScreenCTM();
      if (line === null || matrix === null || matrix === undefined) throw new Error('no path');
      const points = [...line.points].map((point) => new DOMPoint(point.x, point.y).matrixTransform(matrix));
      return [...chart.querySelectorAll('.profile__landmark-dot')].map((dot) => {
        const box = dot.getBoundingClientRect();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        let best = Number.POSITIVE_INFINITY;
        for (let i = 1; i < points.length; i += 1) {
          const a = points[i - 1];
          const b = points[i];
          if (a === undefined || b === undefined) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const t = Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy) / (dx * dx + dy * dy || 1)));
          best = Math.min(best, Math.hypot(cx - (a.x + t * dx), cy - (a.y + t * dy)));
        }
        return best;
      });
    });
  const atRest = await offPath();
  expect(atRest.length).toBeGreaterThan(0);
  for (const distance of atRest) expect(distance).toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    const results = document.querySelector('.results');
    results?.removeAttribute('data-replayed');
    results?.animate([{ '--replay-progress': 0.4 }, { '--replay-progress': 0.4 }], { duration: 1000, fill: 'forwards' }).pause();
  });
  const zoomed = await page.locator('.profile__zoom').first().evaluate((group) => getComputedStyle(group).transform);
  expect(zoomed).not.toBe('none');
  for (const distance of await offPath()) expect(distance).toBeLessThanOrEqual(1);
});

/** The card's colour at the top and bottom, the stars' and the horizon's opacity, and the horizon's top. */
async function card(page: Page) {
  return page.locator('.results').evaluate((results) => {
    const style = (selector: string): CSSStyleDeclaration | null => {
      const element = results.querySelector(selector);
      return element === null ? null : getComputedStyle(element);
    };
    const horizon = results.querySelector('.card-shape')?.getBoundingClientRect();
    const box = results.getBoundingClientRect();
    return {
      stars: Number(style('.card-stars')?.opacity),
      horizon: Number(style('.card-shape')?.opacity),
      horizonTop: horizon === undefined ? Number.NaN : horizon.top - box.top,
      end: Number(style('.lit__end')?.opacity),
    };
  });
}

test('the height card climbs with the replay: stars from 18 km, the horizon rising from 15 km, then resting where the climb ended', async ({ page }) => {
  await playSampleSession(page);
  // At rest: 23,473 m.
  const reached = (167 + 40 / 60) * 140;
  const rest = await card(page);
  expect(rest.stars).toBeCloseTo(Number(sm((reached - 18_000) / 24_000).toFixed(2)), 2);
  const shown = sm((reached - 15_000) / 8000);
  expect(rest.horizon).toBeCloseTo(Number(shown.toFixed(2)), 2);
  expect(rest.horizonTop).toBeCloseTo(530 - 70 * shown - 50 * sm((reached - 23_000) / 77_000), 0);
  expect(rest.end).toBe(0);
  // Held at the start of the replay, the card is at the ground: no stars, no horizon.
  await page.evaluate(() => {
    const results = document.querySelector('.results');
    results?.removeAttribute('data-replayed');
    results?.animate([{ '--replay-progress': 0 }, { '--replay-progress': 0 }], { duration: 1000, fill: 'forwards' }).pause();
  });
  expect(await card(page)).toMatchObject({ stars: 0, horizon: 0 });
});
