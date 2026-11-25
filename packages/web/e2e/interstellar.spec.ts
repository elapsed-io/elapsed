/** Interstellar (round 2.9): the map on the camera, the sky, the pause's comets, its frames, and its results. */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { createSession, serializeActiveState, startState } from '@stopwatch/core';
import { resultsSpaceFrame, spaceFrame, spacePausedFrame } from './fixtures/space-frames.ts';
import { MINUTE, SECOND, T0, T_READY, compareWithReference, compareWithoutText, endThroughCountdown, finishResults, freezeAnimations, openApp, settle } from './helpers.ts';
import { expectLikeFrame } from './pixels.ts';

// The results frame's clock times are 24-hour, in UTC (as results.spec.ts).
test.use({ locale: 'en-GB', timezoneId: 'UTC' });
const primary = (page: Page) => page.locator('.button--primary');

/**
 * Opens the site with an interstellar session `focusMs` in (restored, so no check-in has come due). Interstellar's
 * frames (a test mode's, drawn before round 2.14) show hh:mm, as seconds blurring away do after a minute: so its
 * sessions blur them away unless a test says otherwise.
 */
async function restoreAt(page: Page, focusMs: number, own?: Readonly<Record<string, unknown>>): Promise<void> {
  const settings = { seconds: 'blur-away', ...own };
  const session = createSession({ id: '7d1e3a5c-2b4f-4c6d-8e0a-1b3c5d7e9f20', mode: 'interstellar', at: T_READY - focusMs, timeZone: 'UTC' });
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * SECOND }));
  await openApp(page, { mode: 'interstellar', settings });
}

/**
 * Text: in the reference image Chromium draws the site's small text over space (the button labels, "paused for",
 * the distance line, the names, the results' headline and stats) with subpixel anti-aliasing and the frame's page
 * with greyscale, as over height's sky (decision 310): measured 326 to 332 pixels past 8 levels on the running
 * frames, 378 on the paused one and 5,068 on the results card, smoothed at most 37.6, all on glyph edges. Since
 * round 2.10 (the page layered anew: the sky as images, the pieces on their own) the map's names are drawn so
 * too, not only the buttons: 461 to 1,487 on the running frames, more the more names the map shows, smoothed at
 * most 38.3, still only on glyph edges (decision 384). So each frame is compared twice: whole, within that, and with every glyph transparent on both
 * sides, which must match within the drawing's own edges below (Firefox and WebKit, and Chromium elsewhere, match
 * whole).
 */
const TEXT_EDGES = 2000;
const PAUSED_TEXT_EDGES = 600;
const RESULTS_TEXT_EDGES = 6000;
const TEXT_SMOOTHED = 40;
/**
 * Edge noise: Jupiter's bands are drawn as the bands' own shapes (art can name no clip), so their ends differ from
 * the frame's clipped strips by a few edge pixels; measured at most 6 past 8 levels, smoothed at most 4.8. The owner
 * accepted the difference (round 2.11, decision 387); this allowance is it.
 */
const SPACE_EDGES = 12;
const SPACE_SMOOTHED = 14;
/**
 * The results card's route is drawn exactly where the frame draws it (its centre within 0.07 px along its whole
 * length). Over the card as it was (round 2.9) it was anti-aliased in another pattern than the frame's page: 422
 * pixels past 8 levels, at most 24, smoothed 11.6. Since the map fills the card (round 2.11) it matches within a
 * pixel in Chromium here; the allowance stays for the reference image's rasteriser.
 */
const RESULTS_ROUTE_EDGES = 480;

/**
 * The site's sky hidden: it is the HYG sky (owner, round 2.11), where the frames draw a hand-entered one, so the
 * frames are compared without stars on either side (fixtures/space-frames.ts).
 */
async function hideSky(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('.sky, .space-card__stars')) element.style.setProperty('visibility', 'hidden');
  });
}

/** The map as it stands at the minute's start: its glides stopped, leaving what each was drawn from. */
async function stillMap(page: Page): Promise<void> {
  await page.locator('.camera').evaluate((camera) => {
    for (const animation of camera.getAnimations({ subtree: true })) animation.cancel();
  });
}

for (const [minutes, hhmm] of [
  [84, '01:24'],
  [3, '00:03'],
  [30, '00:30'],
  [330, '05:30'],
  [900, '15:00'],
] as const) {
  test(`interstellar matches the "interstellar, running" frame at ${hhmm}`, async ({ page, browser, browserName }) => {
    // Half a second into the minute, so it reads as that minute; the glides are frozen at the minute's start.
    await restoreAt(page, minutes * MINUTE + 500);
    await settle(page);
    await stillMap(page);
    await hideSky(page);
    await freezeAnimations(page);
    const diff = await compareWithReference(page, browser, spaceFrame(minutes, hhmm));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(TEXT_EDGES);
      expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(TEXT_SMOOTHED);
    });
    const drawing = await compareWithoutText(page, browser, spaceFrame(minutes, hhmm));
    expectLikeFrame(drawing, browserName, () => {
      expect(drawing.visible, JSON.stringify(drawing)).toBeLessThanOrEqual(SPACE_EDGES);
      expect(drawing.smoothedMaxDelta, JSON.stringify(drawing)).toBeLessThanOrEqual(SPACE_SMOOTHED);
    });
    // Control: the map three minutes on fails by far.
    if (minutes === 84) expect((await compareWithoutText(page, browser, spaceFrame(minutes + 3, hhmm))).visible).toBeGreaterThan(10 * SPACE_EDGES);
  });
}

// The corrected paused frame reads "past saturn" at 10.1 AU, as the site does (owner, round 2.11).
test('interstellar matches the "interstellar, paused" frame, without its sky and its random comets', async ({ page, browser, browserName }) => {
  await restoreAt(page, 84 * MINUTE + 500);
  await primary(page).click();
  await page.clock.runFor(4 * MINUTE + 12 * SECOND);
  await settle(page);
  // The comets are drawn at random (checked on their own below); the rest of the frame is compared.
  await page.locator('.comets').evaluate((element) => {
    element.remove();
  });
  await hideSky(page);
  await freezeAnimations(page);
  const frame = spacePausedFrame(84, '01:24', '00:04:12', '10.1 au travelled · past saturn');
  const diff = await compareWithReference(page, browser, frame);
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(PAUSED_TEXT_EDGES);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(TEXT_SMOOTHED);
  });
  const drawing = await compareWithoutText(page, browser, frame);
  expectLikeFrame(drawing, browserName, () => {
    expect(drawing.visible, JSON.stringify(drawing)).toBeLessThanOrEqual(SPACE_EDGES);
    expect(drawing.smoothedMaxDelta, JSON.stringify(drawing)).toBeLessThanOrEqual(SPACE_SMOOTHED);
  });
});

/** The sample session of the results frames: 2 h 47 min 40 s of focus with two pauses (as height.spec.ts). */
async function playSampleSession(page: Page): Promise<void> {
  await openApp(page, { width: 720, height: 520, mode: 'interstellar' });
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

const SAMPLE_FOCUS = 167 + 40 / 60;
const SAMPLE = { focused: '02:47:40', stats: ['03:05:40', '00:18:00', '2', '01:32:00', '14:02', '17:07'] } as const;

test('results for interstellar match the "results: interstellar" frame as its replay lands', async ({ page, browser, browserName }) => {
  await playSampleSession(page);
  await page.locator('.space-map .comets').evaluate((element) => {
    element.remove();
  });
  await hideSky(page);
  await freezeAnimations(page);
  const frame = resultsSpaceFrame(SAMPLE_FOCUS, SAMPLE);
  const diff = await compareWithReference(page, browser, frame);
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(RESULTS_TEXT_EDGES);
    expect(diff.smoothedMaxDelta, JSON.stringify(diff)).toBeLessThanOrEqual(TEXT_SMOOTHED);
  });
  const drawing = await compareWithoutText(page, browser, frame);
  expectLikeFrame(drawing, browserName, () => {
    expect(drawing.visible, JSON.stringify(drawing)).toBeLessThanOrEqual(RESULTS_ROUTE_EDGES);
    expect(drawing.smoothedMaxDelta, JSON.stringify(drawing)).toBeLessThanOrEqual(SPACE_SMOOTHED);
  });
  // Control: the journey ten minutes shorter fails by far.
  const off = await compareWithoutText(page, browser, resultsSpaceFrame(SAMPLE_FOCUS - 10, SAMPLE));
  expect(off.visible).toBeGreaterThan(5 * RESULTS_ROUTE_EDGES);
});

/** Each body's centre and its distance from the travel line, as drawn (screen pixels). */
async function bodiesOnTheLine(page: Page): Promise<{ readonly name: string; readonly opacity: number; readonly distance: number }[]> {
  return page.locator('.camera__map').evaluate((map) => {
    const route = map.querySelector<SVGGraphicsElement>('.map__path line');
    const parent = (route?.parentNode as SVGGraphicsElement | null | undefined)?.getScreenCTM();
    if (route === null || parent === null || parent === undefined) throw new Error('no route');
    const own = getComputedStyle(route).transform;
    const toScreen = DOMMatrix.fromMatrix({ a: parent.a, b: parent.b, c: parent.c, d: parent.d, e: parent.e, f: parent.f });
    const matrix = toScreen.multiply(own === 'none' ? new DOMMatrix() : new DOMMatrix(own));
    // The route is one unit long on its own axis, stretched from the start to the traveller (path.ts).
    const at = (x: number): DOMPoint => new DOMPoint(x, 0).matrixTransform(matrix);
    const [a, b] = [at(0), at(1)];
    return [...map.querySelectorAll<SVGGElement>('.map__landmark')].map((landmark) => {
      const art = landmark.querySelector('svg');
      const rect = (art ?? landmark).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.abs(dy * (cx - a.x) - dx * (cy - a.y)) / Math.max(1e-9, Math.hypot(dx, dy));
      return { name: landmark.querySelector('text')?.textContent ?? 'start', opacity: Number(getComputedStyle(landmark).opacity), distance };
    });
  });
}

/**
 * Where the route's two ends are, and where the start (Earth) and the traveller are, as drawn (screen pixels), on
 * the running map or the results card's.
 */
async function routeEnds(page: Page, scope: '.camera__map' | '.space-map'): Promise<{ readonly start: readonly number[]; readonly end: readonly number[]; readonly earth: readonly number[]; readonly traveller: readonly number[] }> {
  return page.locator(scope).evaluate((map) => {
    const centre = (element: Element | null): number[] => {
      if (element === null) throw new Error('missing');
      const rect = element.getBoundingClientRect();
      return [rect.left + rect.width / 2, rect.top + rect.height / 2];
    };
    // The element's own transform as computed (its glide or the replay's, as now drawn), then its parent's matrix
    // to the screen: Firefox's getScreenCTM leaves out a transform set from a custom property.
    const point = (element: SVGGraphicsElement, x: number, y: number): number[] => {
      const parent = (element.parentNode as SVGGraphicsElement | null)?.getScreenCTM();
      if (parent === null || parent === undefined) throw new Error('no matrix');
      const own = getComputedStyle(element).transform;
      const p = new DOMPoint(x, y).matrixTransform(own === 'none' ? new DOMMatrix() : new DOMMatrix(own)).matrixTransform(parent);
      return [p.x, p.y];
    };
    // Styles brought up to date first: a matrix is read from the last layout, which setting an animation's time
    // does not redo.
    map.getBoundingClientRect();
    const camera = map.classList.contains('camera__map');
    // The running route is a unit line stretched along the heading; the results' a line between two points.
    const route = map.querySelector<SVGGraphicsElement>(camera ? '.map__path line' : '.space-map__drawing > line');
    if (route === null) throw new Error('no route');
    const ends = camera
      ? [point(route, 0, 0), point(route, 1, 0)]
      : [point(route, Number(route.getAttribute('x1')), Number(route.getAttribute('y1'))), point(route, Number(route.getAttribute('x2')), Number(route.getAttribute('y2')))];
    const earth = map.querySelector('.map__landmark--start svg');
    const traveller = camera ? map.querySelector('.map__head circle') : [...map.querySelectorAll('circle')].at(-1) ?? null;
    return { start: ends[0] ?? [], end: ends[1] ?? [], earth: centre(earth), traveller: centre(traveller) };
  });
}

/**
 * The map's glides set to `seconds` of focus: the site sets them right on each of the clock's ticks and the browser
 * moves them on in real time between, which the tests' held clock does not; this puts them where real time would.
 */
async function glidesAt(page: Page, seconds: number): Promise<void> {
  await page.locator('.camera').evaluate((camera, into) => {
    for (const animation of camera.getAnimations({ subtree: true })) {
      if (Number(animation.effect?.getTiming().duration) === 60_000) animation.currentTime = into;
    }
  }, (seconds * 1000) % 60_000);
}

function expectAttached(ends: Awaited<ReturnType<typeof routeEnds>>, where: string): void {
  const gap = (a: readonly number[], b: readonly number[]): number => Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0));
  expect(gap(ends.start, ends.earth), `${where}: the route's start against Earth ${JSON.stringify(ends)}`).toBeLessThanOrEqual(1);
  expect(gap(ends.end, ends.traveller), `${where}: the route's end against the traveller ${JSON.stringify(ends)}`).toBeLessThanOrEqual(1);
}

test('the route stays attached to Earth and the traveller, both ends within 1 px, while running and throughout the replay', async ({ page }) => {
  // Running, from the start: through the first minutes (the camera still), where it starts to pull back (about
  // 5 minutes in) and later, sampled inside each minute's glide.
  // Long: a dozen minutes sampled, then the replay held at points.
  test.setTimeout(90_000);
  // A session started now, from its first moment.
  await openApp(page, { mode: 'interstellar' });
  await settle(page);
  await primary(page).click();
  let at = 0;
  for (const moment of [0.5, 5, 20, 45, 59.5, 64, 90, 4 * 60 + 50, 5 * 60 + 2, 5 * 60 + 40, 12 * 60 + 10]) {
    await page.clock.runFor((moment - at) * SECOND);
    at = moment;
    await glidesAt(page, moment);
    const ends = await routeEnds(page, '.camera__map');
    expectAttached(ends, `running at ${String(moment)} s`);
    // The traveller is under way: the route has a length.
    if (moment >= 20) expect(Math.hypot((ends.end[0] ?? 0) - (ends.start[0] ?? 0), (ends.end[1] ?? 0) - (ends.start[1] ?? 0)), `${String(moment)} s`).toBeGreaterThan(5);
  }
  // Paused and still (the focus view has hidden the buttons: the keyboard pauses and resumes).
  await page.keyboard.press('Space');
  await settle(page);
  expectAttached(await routeEnds(page, '.camera__map'), 'paused');
  // The replay of those twelve minutes (the camera pulling back past 1.6 AU), held at points along it (its one
  // animated property).
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  const replay = async (progress: number): Promise<void> => {
    await page.locator('.results').evaluate((results, share) => {
      for (const animation of results.getAnimations()) {
        const keyframes = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
        if (!keyframes.some((frame) => '--replay-progress' in frame)) continue;
        animation.pause();
        // The property's own value, set where the easing would have it: the replay's curve is not the point here.
        animation.effect?.updateTiming({ easing: 'linear' });
        animation.currentTime = share * Number(animation.effect?.getTiming().duration);
      }
    }, progress);
  };
  for (const progress of [0, 0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999]) {
    await replay(progress);
    const ends = await routeEnds(page, '.space-map');
    expectAttached(ends, `replay at ${String(progress)}`);
    if (progress >= 0.1) expect(Math.hypot((ends.end[0] ?? 0) - (ends.start[0] ?? 0), (ends.end[1] ?? 0) - (ends.start[1] ?? 0)), `replay at ${String(progress)}`).toBeGreaterThan(5);
  }
});

test('every body sits on the travel line within 1 px, once reached', async ({ page }) => {
  for (const minutes of [5, 84, 330, 900]) {
    await restoreAt(page, minutes * MINUTE + 500);
    await settle(page);
    await stillMap(page);
    const bodies = await bodiesOnTheLine(page);
    const reached = bodies.filter((body) => body.opacity > 0);
    expect(reached.length, String(minutes)).toBeGreaterThan(0);
    for (const body of reached) expect(body.distance, `${body.name} at ${String(minutes)} min`).toBeLessThanOrEqual(1);
  }
});

test('while paused, comets drift across with their tails pointing away from the Sun, never more than two at once', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 500);
  await primary(page).click();
  await settle(page);
  const comets = await page.locator('.comets .comet').evaluateAll((elements) =>
    elements.map((element) => {
      const animation = element.getAnimations()[0];
      const frames = animation?.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
      const moved = String(frames.find((frame) => frame['offset'] !== 0 && frame['transform'] !== undefined)?.['transform'] ?? '');
      const [dx = 0, dy = 0] = (moved.match(/-?[\d.]+/g) ?? []).map(Number);
      const tail = element.querySelector<HTMLElement>('.comet__tail')?.style.transform ?? '';
      const timing = animation?.effect?.getTiming();
      return { x: parseFloat(element.style.left), y: parseFloat(element.style.top), dx, dy, angle: parseFloat(tail.replace('rotate(', '')), delay: timing?.delay ?? 0, frames: frames.map((frame) => [Number(frame['offset']), Number(frame['opacity'])]) };
    }),
  );
  expect(comets.length).toBeGreaterThan(20);
  for (const comet of comets) {
    const away = (Math.atan2(comet.y + comet.dy / 2 - 392, comet.x + comet.dx / 2 - 70) * 180) / Math.PI;
    expect(Math.abs(comet.angle - away)).toBeLessThan(0.1);
    expect(Math.hypot(comet.dx, comet.dy)).toBeGreaterThanOrEqual(280);
    expect(Math.hypot(comet.dx, comet.dy)).toBeLessThanOrEqual(400);
  }
  // They leave when the session resumes.
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.comets')).toHaveCount(0);
});

test('each body appears with a slow fade: about 2 s of focus while running, about a sixth of the replay on the results', async ({ page }) => {
  // Mars (1.52 AU) is reached 0.52 ÷ 0.12024 minutes in, about 259.5 s.
  const reached = (0.52 / 0.12024) * 60;
  test.setTimeout(120_000);
  // Restored running.
  await restoreAt(page, 250 * SECOND);
  await settle(page);
  const mars = async (): Promise<number> =>
    page.locator('.camera__map .map__landmark').evaluateAll((elements) => Number(getComputedStyle(elements.find((element) => element.textContent.includes('mars')) ?? document.body).opacity));
  let at = 250;
  const opacityAt = async (moment: number): Promise<number> => {
    await page.clock.runFor((moment - at) * SECOND);
    at = moment;
    await glidesAt(page, moment);
    return mars();
  };
  expect(await opacityAt(reached - 1)).toBe(0);
  const early = await opacityAt(reached + 0.3);
  const middle = await opacityAt(reached + 1);
  const late = await opacityAt(reached + 2.5);
  expect(early).toBeGreaterThan(0);
  expect(early).toBeLessThan(0.3);
  expect(middle).toBeGreaterThan(0.3);
  expect(middle).toBeLessThan(0.8);
  expect(late).toBeGreaterThan(0.99);
  // The results: over a sixth of the replay from where the replay reaches it.
  await page.clock.runFor(60 * MINUTE);
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  const resultsMars = async (progress: number): Promise<number> =>
    page.locator('.results').evaluate((results, share) => {
      for (const animation of results.getAnimations()) {
        const keyframes = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
        if (!keyframes.some((frame) => '--replay-progress' in frame)) continue;
        animation.pause();
        animation.effect?.updateTiming({ easing: 'linear' });
        animation.currentTime = share * Number(animation.effect?.getTiming().duration);
      }
      const body = [...results.querySelectorAll('.space-map .map__landmark')].find((element) => element.textContent.includes('mars'));
      return Number(getComputedStyle(body ?? results).opacity);
    }, progress);
  const reachedAt = 0.52 / ((at / 60 + 60) * 0.12024);
  expect(await resultsMars(reachedAt - 0.01)).toBe(0);
  const half = await resultsMars(reachedAt + 1 / 12);
  expect(half).toBeGreaterThan(0.3);
  expect(half).toBeLessThan(0.7);
  expect(await resultsMars(reachedAt + 1 / 6 + 0.01)).toBeGreaterThan(0.99);
  // Each body, the Sun and the route have a halo of space beneath the whole map, so no star shows on them.
  const halos = await page.locator('.space-map').evaluate((map) => {
    const group = map.querySelector('.space-map__halos');
    const first = map.querySelector('svg')?.firstElementChild;
    return { first: first === group, halos: group?.children.length ?? 0, bodies: map.querySelectorAll('.map__landmark').length, fill: group?.querySelector('circle')?.getAttribute('fill') ?? '' };
  });
  expect(halos.first).toBe(true);
  // One for each body (Earth included), the Sun's and the route's.
  expect(halos.halos).toBe(halos.bodies + 2);
  expect(halos.fill.toUpperCase()).toBe('#03040A');
});

/** The sky's strip: its turn, if any, and its images. */
async function skyStrip(page: Page): Promise<{ readonly state: string; readonly time: number; readonly duration: number; readonly iterations: number; readonly from: string; readonly to: string; readonly images: readonly { readonly src: string; readonly decoded: boolean }[] }> {
  return page.locator('.sky__strip').evaluate((strip) => {
    const animation = strip.getAnimations()[0];
    const timing = animation?.effect?.getTiming();
    const frames = animation?.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
    const images = [...strip.querySelectorAll('img')].map((image) => ({ src: image.getAttribute('src') ?? '', decoded: image.complete && image.naturalWidth > 0 }));
    return { state: animation?.playState ?? 'none', time: Number(animation?.currentTime ?? 0), duration: Number(timing?.duration ?? 0), iterations: timing?.iterations ?? 0, from: String(frames[0]?.['transform']), to: String(frames.at(-1)?.['transform']), images };
  });
}

test('one sky everywhere: the HYG sky shows from the start, still while running; pausing starts it turning once in 6 minutes, resuming stops it where it is', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 500);
  await settle(page);
  // Running: the whole sky, drawn by the build (round 2.10), one image twice side by side, decoded, standing still.
  const still = await skyStrip(page);
  expect(still.state).toBe('none');
  expect(still.images).toHaveLength(2);
  expect(still.images.every((image) => image.decoded && image.src === still.images[0]?.src && /interstellar-stars-turning-[\w-]+\.svg$/.test(image.src))).toBe(true);
  // Every star of the catalog is in it (1,637 to magnitude 5, a few twice across its edges): no other sky.
  const stars = await page.evaluate(async (src) => (await (await fetch(src)).text()).match(/<circle /g)?.length ?? 0, still.images[0]?.src ?? '');
  expect(stars).toBeGreaterThan(1637);
  await expect(page.locator('.sky img')).toHaveCount(2);
  // Paused: the same sky turns, one turn of the strip (360° at 8 px a degree) in 6 minutes, from where it stood.
  await primary(page).click();
  const turning = await skyStrip(page);
  expect(turning).toMatchObject({ state: 'running', duration: 6 * MINUTE, iterations: Infinity, from: 'translateX(0px)', to: 'translateX(2880px)' });
  expect(turning.images.map((image) => image.src)).toEqual(still.images.map((image) => image.src));
  // Resumed: it stops where it is, nothing jumps or fades.
  await page.evaluate(() => document.documentElement.animate([], { duration: 200 }).finished);
  await primary(page).click();
  const stopped = await skyStrip(page);
  expect(stopped.state).toBe('paused');
  expect(stopped.time).toBeGreaterThan(0);
  await expect(page.locator('.sky img')).toHaveCount(2);
});

test('with low power the paused sky stays still and no comets come', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 500, { lowPower: true });
  await primary(page).click();
  await settle(page);
  expect((await skyStrip(page)).state).toBe('none');
  await expect(page.locator('.comets')).toHaveCount(0);
});

test('the map glides a minute at a time while running', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 30 * SECOND);
  const glides = await page.locator('.camera').evaluate((camera) => camera.getAnimations({ subtree: true }).map((animation) => Number(animation.effect?.getTiming().duration)));
  expect(glides.length).toBeGreaterThan(20);
  for (const duration of glides) expect(duration).toBe(MINUTE);
});

test('with low power the map steps once a minute', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 30 * SECOND, { lowPower: true });
  expect(await page.locator('.camera').evaluate((camera) => camera.getAnimations({ subtree: true }).length)).toBe(0);
});
