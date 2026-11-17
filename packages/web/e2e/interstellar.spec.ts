/** Interstellar (round 2.9): the map on the camera, the sky, the pause's comets, its frames, and its results. */

import { expect, test } from './test.ts';
import type { Browser, Page } from '@playwright/test';
import { createSession, serializeActiveState, startState } from '@stopwatch/core';
import { resultsSpaceFrame, spaceFrame, spacePausedFrame } from './fixtures/space-frames.ts';
import { MINUTE, SECOND, T0, T_READY, compareWithReference, endThroughCountdown, finishResults, freezeAnimations, openApp, settle } from './helpers.ts';
import { expectLikeFrame } from './pixels.ts';
import type { PixelDiff } from './pixels.ts';

// The results frame's clock times are 24-hour, in UTC (as results.spec.ts).
test.use({ locale: 'en-GB', timezoneId: 'UTC' });
const primary = (page: Page) => page.locator('.button--primary');

/** Opens the site with an interstellar session `focusMs` in (restored, so no check-in has come due). */
async function restoreAt(page: Page, focusMs: number, settings?: Readonly<Record<string, unknown>>): Promise<void> {
  const session = createSession({ id: '7d1e3a5c-2b4f-4c6d-8e0a-1b3c5d7e9f20', mode: 'interstellar', at: T_READY - focusMs, timeZone: 'UTC' });
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * SECOND }));
  await openApp(page, { mode: 'interstellar', ...(settings === undefined ? {} : { settings }) });
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
const NO_TEXT = '* { color: transparent !important; -webkit-text-fill-color: transparent !important; } text { fill: transparent !important; }';

/** The page and the frame compared with every glyph (and every icon drawn in the text colour) transparent. */
async function compareWithoutText(page: Page, browser: Browser, markup: string): Promise<PixelDiff> {
  // A constructed stylesheet: the site's CSP refuses inline style elements.
  await page.evaluate((css) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, NO_TEXT);
  const diff = await compareWithReference(page, browser, markup.replace('</body>', `<style>${NO_TEXT}</style></body>`));
  await page.evaluate(() => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.slice(0, -1);
  });
  return diff;
}

/**
 * Edge noise: Jupiter's bands are drawn as the bands' own shapes (art can name no clip), so their ends differ from
 * the frame's clipped strips by a few edge pixels; measured at most 6 past 8 levels, smoothed at most 4.8.
 */
const SPACE_EDGES = 12;
const SPACE_SMOOTHED = 14;
/**
 * The results card's route is drawn exactly where the frame draws it (its centre within 0.07 px along its whole
 * length), but anti-aliased in another pattern over the card than in the frame's page: measured 422 pixels past 8
 * levels, at most 24 levels, smoothed 11.6.
 */
const RESULTS_ROUTE_EDGES = 480;

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

/** The still sky: the frames are stills, so the sky that turns while paused is held at its still view. */
async function holdStillSky(page: Page): Promise<void> {
  await page.locator('.sky').evaluate((sky) => {
    sky.classList.remove('sky--turning');
    // The turn never ends: it is stopped; the crossfade back is finished.
    for (const animation of sky.getAnimations({ subtree: true })) {
      if (animation.effect?.getTiming().iterations === Infinity) animation.cancel();
      else animation.finish();
    }
  });
}

// The frame's distance line reads "past jupiter" at 11.1 AU, where its own map has passed Saturn; the site names the
// last landmark passed, as the results frame works it out (decision 351).
test('interstellar matches the "interstellar, paused" frame, its sky held still and without its random comets', async ({ page, browser, browserName }) => {
  await restoreAt(page, 84 * MINUTE + 500);
  await primary(page).click();
  await page.clock.runFor(4 * MINUTE + 12 * SECOND);
  await settle(page);
  // The comets are drawn at random (checked on their own below); the rest of the frame is compared.
  await page.locator('.comets').evaluate((element) => {
    element.remove();
  });
  await holdStillSky(page);
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
    const line = map.querySelector('.map__path line');
    if (line === null) throw new Error('no route');
    const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line.getAttribute(name)));
    // The map's view box is the screen at 720 × 450: one unit a pixel.
    const left = map.getBoundingClientRect().left;
    const top = map.getBoundingClientRect().top;
    return [...map.querySelectorAll<SVGGElement>('.map__landmark')].map((landmark) => {
      const art = landmark.querySelector('svg');
      const rect = (art ?? landmark).getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - left;
      const cy = rect.top + rect.height / 2 - top;
      const dx = (x2 ?? 0) - (x1 ?? 0);
      const dy = (y2 ?? 0) - (y1 ?? 0);
      const distance = Math.abs(dy * (cx - (x1 ?? 0)) - dx * (cy - (y1 ?? 0))) / Math.hypot(dx, dy);
      return { name: landmark.querySelector('text')?.textContent ?? 'start', opacity: Number(getComputedStyle(landmark).opacity), distance };
    });
  });
}

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

test('while paused the sky turns once in 6 minutes from the still view; never with low power', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 500);
  await expect(page.locator('.sky')).not.toHaveClass(/sky--turning/);
  await primary(page).click();
  await expect(page.locator('.sky')).toHaveClass(/sky--turning/);
  const turn = await page.locator('.sky__strip').evaluate((strip) => {
    const animation = strip.getAnimations()[0];
    const timing = animation?.effect?.getTiming();
    const frames = animation?.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [];
    const images = [...strip.querySelectorAll('img')].map((image) => ({ src: image.getAttribute('src') ?? '', decoded: image.complete && image.naturalWidth > 0 }));
    return { duration: Number(timing?.duration), iterations: timing?.iterations, from: String(frames[0]?.['transform']), to: String(frames.at(-1)?.['transform']), images };
  });
  // One turn of the strip (360° at 8 px a degree) in 6 minutes, from where the still view stands.
  expect(turn).toMatchObject({ duration: 6 * MINUTE, iterations: Infinity, from: 'translateX(0px)', to: 'translateX(2880px)' });
  // The whole sky, drawn by the build (round 2.10): one image, twice side by side, decoded before it shows.
  expect(turn.images).toHaveLength(2);
  expect(turn.images.every((image) => image.decoded && image.src === turn.images[0]?.src && /interstellar-stars-turning-[\w-]+\.svg$/.test(image.src))).toBe(true);
  // Every star of the catalog is in it (1,637 to magnitude 5, a few twice across its edges).
  const stars = await page.evaluate(async (src) => (await (await fetch(src)).text()).match(/<circle /g)?.length ?? 0, turn.images[0]?.src ?? '');
  expect(stars).toBeGreaterThan(1637);
  await primary(page).click();
  await expect(page.locator('.sky')).not.toHaveClass(/sky--turning/);
});

test('with low power the paused sky stays still and no comets come', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 500, { lowPower: true });
  await primary(page).click();
  await settle(page);
  await expect(page.locator('.sky')).not.toHaveClass(/sky--turning/);
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
