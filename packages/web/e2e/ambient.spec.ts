/**
 * Ambient idle screens and environment changes (round 2.8; plan, Product principles: "modes with their own
 * environment show their starting scene and colors on the idle screen, so starting changes nothing abruptly,
 * and any change of environment crossfades over about 2 seconds"), and the settings panel over the chosen mode.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, openApp, settle } from './helpers.ts';

/** The screen's colour at a few points away from the time and the controls. */
async function backdrop(page: Page): Promise<string[]> {
  const shot = await page.screenshot();
  return page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (context === null) return [];
    context.drawImage(image, 0, 0);
    return [
      [40, 40],
      [680, 400],
      [40, 400],
    ].map(([x, y]) => [...context.getImageData(x ?? 0, y ?? 0, 1, 1).data.slice(0, 3)].join(','));
  }, shot.toString('base64'));
}

/** The time's and the corner icons' colours. */
const chrome = (page: Page): Promise<{ contrast: string | undefined }> => page.locator('.screen').evaluate((screen) => ({ contrast: (screen as HTMLElement).dataset['contrast'] }));

for (const mode of ['ocean', 'height'] as const) {
  test(`${mode}: the idle screen shows the starting scene and colours, and starting changes nothing at once`, async ({ page }) => {
    await openApp(page, { mode });
    await settle(page);
    const idle = { scene: await backdrop(page), chrome: await chrome(page) };
    // The environment is drawn at idle, not the theme's background.
    await expect(page.locator('.mode-root > .environment')).toBeVisible();
    expect(idle.scene.every((colour) => colour !== '14,15,17')).toBe(true);
    await page.locator('.button--primary').click();
    await page.clock.runFor(SECOND);
    await settle(page);
    // A second in, the scene has moved on by a level at most; nothing jumped.
    const running = await backdrop(page);
    const levels = running.flatMap((colour, index) => colour.split(',').map((value, channel) => Math.abs(Number(value) - Number(idle.scene[index]?.split(',')[channel]))));
    expect(Math.max(...levels), JSON.stringify({ idle: idle.scene, running })).toBeLessThanOrEqual(3);
    expect(await chrome(page)).toEqual(idle.chrome);
  });
}

test('a change of environment crossfades over about 2 seconds, by opacity alone', async ({ page }) => {
  await openApp(page, { mode: 'ocean', width: 1280, height: 800 });
  await page.locator('.button--primary').click();
  await page.clock.runFor(5 * MINUTE);
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^display$/ }).click();
  await page.getByRole('radio', { name: 'height' }).click();
  await expect(page.locator('.screen[data-mode="height"]')).toHaveCount(1);
  // The water stays, held where it was, behind the sky fading in over it.
  const fade = await page.evaluate(() => {
    const leaving = document.querySelector('.environment--leaving');
    const arriving = document.querySelector('.mode-root > .environment');
    const animation = arriving?.getAnimations().find((candidate) => candidate instanceof Animation && !(candidate instanceof CSSAnimation) && !(candidate instanceof CSSTransition));
    const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
    return {
      leaving: leaving !== null,
      leavingMoves: leaving?.getAnimations({ subtree: true }).length ?? -1,
      frames: (effect?.getKeyframes() ?? []).map((frame) => ({ opacity: frame['opacity'], transform: frame['transform'] })),
      duration: effect?.getTiming().duration,
    };
  });
  expect(fade).toEqual({ leaving: true, leavingMoves: 0, frames: [{ opacity: '0', transform: undefined }, { opacity: '1', transform: undefined }], duration: 2000 });
  // Once faded in, the old scene is gone.
  await expect(page.locator('.environment--leaving')).toHaveCount(0, { timeout: 5000 });
  // To a mode without an environment, the scene fades out on its own.
  await page.getByRole('radio', { name: 'digits' }).click();
  await expect(page.locator('.screen[data-mode="digits"]')).toHaveCount(1);
  const out = await page.evaluate(() => {
    const leaving = document.querySelector('.environment--leaving');
    const animation = leaving?.getAnimations()[0];
    const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
    return (effect?.getKeyframes() ?? []).map((frame) => frame['opacity']);
  });
  expect(out).toEqual(['1', '0']);
  await expect(page.locator('.environment--leaving')).toHaveCount(0, { timeout: 5000 });
});

test('with reduced motion an environment changes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { mode: 'ocean', width: 1280, height: 800 });
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^display$/ }).click();
  await page.getByRole('radio', { name: 'digits' }).click();
  await expect(page.locator('.screen[data-mode="digits"]')).toHaveCount(1);
  await expect(page.locator('.environment')).toHaveCount(0);
});

test('the settings panel opens over the chosen mode, which shows behind it', async ({ page }) => {
  await openApp(page, { mode: 'ocean', width: 1280, height: 800 });
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^display$/ }).click();
  await expect(page.locator('.mode-root > .environment')).toBeVisible();
  // The water fills the screen to the panel's edge.
  const water = await page.locator('.mode-root > .environment').boundingBox();
  expect(water).toMatchObject({ x: 0, y: 0 });
  expect(water?.width ?? 0).toBeGreaterThanOrEqual(840);
});
