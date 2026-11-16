/**
 * Time-based motion runs from the session's own times, so opening settings or any other overlay never
 * restarts, skips or jumps it (plan, Product principles, "Appealing and fast"; tester report of round 8:
 * with settings open, the seconds' slide ended in a jump).
 *
 * Opening settings narrows the room the time has, so its size changes while the seconds may be sliding
 * away. The slide moves by distances in em; Chromium's compositor kept the distances from before the panel
 * opened, so the painted time slid too far and jumped back when the slide ended (17 px at 1280 × 800).
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SECOND, freezeAnimations, openApp } from './helpers.ts';

const TIME_AREA_WIDTH = 840;

/** The leftmost column of the time's bright pixels in a screenshot, decoded in a separate blank page. */
async function leftEdge(decoder: Page, png: Buffer): Promise<number> {
  return decoder.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('no 2d context');
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    for (let x = 0; x < bitmap.width; x += 1) {
      for (let y = 0; y < bitmap.height; y += 1) {
        const at = (y * bitmap.width + x) * 4;
        if ((data[at] ?? 0) + (data[at + 1] ?? 0) + (data[at + 2] ?? 0) > 300) return x;
      }
    }
    return -1;
  }, png.toString('base64'));
}

async function timeClip(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.locator('.time--main').boundingBox();
  if (box === null) throw new Error('no time');
  return { x: 0, y: Math.floor(box.y), width: TIME_AREA_WIDTH, height: Math.ceil(box.height) };
}

test('settings open while the seconds slide away: the slide ends where the time belongs, without a jump', async ({ page, context, browserName }) => {
  test.slow();
  const decoder = await context.newPage();
  // Real time, as a person sees it: the time redraws every second while the seconds show, and the slide runs
  // between redraws. (A held test clock stops the redraws, and with them what made the slide go wrong.)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.button--primary').click();
  const started = Date.now();
  // Before the ones digit's slide begins (it moves from 5.5 s to 10 s of focus).
  await page.waitForTimeout(1500);
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const clip = await timeClip(page);
  const edges: number[] = [];
  while (Date.now() - started < 11_500) edges.push(await leftEdge(decoder, await page.screenshot({ clip })));
  expect(edges.length, browserName).toBeGreaterThan(10);
  // The time only ever moves one way while its seconds slide away, and stops where it belongs.
  const backwards = edges.slice(1).map((edge, index) => (edges[index] ?? edge) - edge);
  expect(Math.max(...backwards), JSON.stringify(edges)).toBeLessThanOrEqual(1);
  const last = edges.at(-1) ?? -1;
  expect(Math.max(...edges) - last, JSON.stringify(edges)).toBeLessThanOrEqual(1);
});

for (const moment of [10 * SECOND, 60 * SECOND]) {
  test(`settings open across ${String(moment / SECOND)} s: the time stays where it is as the moment passes`, async ({ page, context }) => {
    const decoder = await context.newPage();
    await openApp(page, { width: 1280, height: 800 });
    await page.locator('.button--primary').click();
    await page.clock.runFor(moment - 3 * SECOND);
    await page.keyboard.press(',');
    await page.locator('.settings').waitFor();
    await page.clock.runFor(3 * SECOND - 50);
    await freezeAnimations(page, { css: moment - 50 });
    const clip = await timeClip(page);
    const before = await leftEdge(decoder, await page.screenshot({ clip }));
    await page.clock.runFor(100);
    await freezeAnimations(page, { css: moment + 50 });
    const after = await leftEdge(decoder, await page.screenshot({ clip }));
    expect(before).toBeGreaterThan(0);
    expect(Math.abs(after - before), `before ${String(before)}, after ${String(after)}`).toBeLessThanOrEqual(1);
  });
}
