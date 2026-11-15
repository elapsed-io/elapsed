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
 * even one pixel differs in hundreds of pixels.
 */

import { expect, test } from '@playwright/test';
import { TIMELINE_FRAME_LABELS, pausedFrame, ringFrame, runningFrame, timelineFrame } from './fixtures/frames.ts';
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
  expect(diff.visible).toBeLessThanOrEqual(20);
  expect(diff.maxChannelDelta).toBeLessThanOrEqual(40);
});

test('timeline matches the timeline frame', async ({ page, browser }) => {
  await openApp(page, { mode: 'timeline' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(84 * MINUTE);
  await settle(page);
  await holdAnimationsAt(page, 84 * MINUTE);

  // Labels: the same text, centred at the frame's positions, in the frame's type and colour.
  const labels = await page.evaluate(() => {
    const drawing = document.querySelector('.timeline__svg');
    if (drawing === null) throw new Error('no timeline');
    const box = drawing.getBoundingClientRect();
    return [...document.querySelectorAll('.timeline__label')]
      .map((text) => {
        const rect = text.getBoundingClientRect();
        const style = getComputedStyle(text);
        return {
          text: text.textContent,
          centre: rect.x + rect.width / 2 - box.x,
          size: style.fontSize,
          family: style.fontFamily,
          weight: style.fontWeight,
          fill: style.fill,
          baseline: text.getAttribute('y'),
        };
      })
      .filter((label) => label.centre > 0 && label.centre < box.width);
  });
  expect(labels.map((label) => label.text)).toEqual(TIMELINE_FRAME_LABELS.map(([text]) => text));
  labels.forEach((label, index) => {
    // Within a quarter pixel (text boxes are measured in 1/64 px layout units); a minute is 10 px.
    expect(Math.abs(label.centre - (TIMELINE_FRAME_LABELS[index]?.[1] ?? Number.NaN))).toBeLessThan(0.25);
    expect(label).toMatchObject({ size: '11px', family: '"Timer Sans", system-ui, sans-serif', weight: '400', fill: 'rgb(136, 135, 133)', baseline: '90' });
  });

  // Everything else, pixel for pixel. Text anti-aliasing inside a sliding layer varies between
  // browser versions, so the labels are compared by geometry above rather than here.
  await page.evaluate(() => {
    for (const label of document.querySelectorAll<SVGElement>('.timeline__label')) label.style.setProperty('visibility', 'hidden');
  });
  const diff = await compareWithReference(page, browser, timelineFrame({ labels: false }));
  expect(diff.visible).toBeLessThanOrEqual(20);
  expect(diff.maxChannelDelta).toBeLessThanOrEqual(48);
});
