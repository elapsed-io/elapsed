/**
 * Ambient idle screens and environment changes (round 2.8; plan, Product principles: modes with their own
 * environment show their starting scene and colours on the idle screen, so starting changes nothing abruptly), and
 * the settings panel over the chosen mode. Round 2.10 (plan, Principles): any crossfade of a mode switch lasts
 * 120 ms or less, and while ocean depth and height are in testing they draw no environment
 * (mode-switch.spec.ts), so interstellar's space is the one environment there is.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, openApp, settle, openSettingsOn } from './helpers.ts';

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

test('interstellar: the idle screen shows the starting scene and colours, and starting changes nothing at once', async ({ page }) => {
  await openApp(page, { mode: 'interstellar' });
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

test('leaving an environment crossfades over 120 ms, by opacity alone, held where it was', async ({ page }) => {
  await openApp(page, { mode: 'interstellar', width: 1280, height: 800 });
  await page.locator('.button--primary').click();
  await page.clock.runFor(5 * MINUTE);
  await openSettingsOn(page, 'display');
  await page.getByRole('radio', { name: 'digits' }).click();
  await expect(page.locator('.screen[data-mode="digits"]')).toHaveCount(1);
  // To a mode without an environment, space fades out on its own, held still.
  const out = await page.evaluate(() => {
    const leaving = document.querySelector('.environment--leaving');
    const animation = leaving?.getAnimations().find((candidate) => !(candidate instanceof CSSAnimation) && !(candidate instanceof CSSTransition));
    const effect = animation?.effect instanceof KeyframeEffect ? animation.effect : null;
    return {
      frames: (effect?.getKeyframes() ?? []).map((frame) => ({ opacity: frame['opacity'], transform: frame['transform'] })),
      duration: effect?.getTiming().duration,
      leavingMoves: (leaving?.getAnimations({ subtree: true }).length ?? 0) - (animation === undefined ? 0 : 1),
    };
  });
  expect(out).toEqual({ frames: [{ opacity: '1', transform: undefined }, { opacity: '0', transform: undefined }], duration: 120, leavingMoves: 0 });
  await expect(page.locator('.environment--leaving')).toHaveCount(0, { timeout: 2000 });
  await expect(page.locator('.environment')).toHaveCount(0);
});

test('with reduced motion an environment changes at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { mode: 'interstellar', width: 1280, height: 800 });
  await openSettingsOn(page, 'display');
  await page.getByRole('radio', { name: 'digits' }).click();
  await expect(page.locator('.screen[data-mode="digits"]')).toHaveCount(1);
  await expect(page.locator('.environment')).toHaveCount(0);
});

test('the settings panel opens over the chosen mode, which shows behind it', async ({ page }) => {
  await openApp(page, { mode: 'interstellar', width: 1280, height: 800 });
  await openSettingsOn(page, 'display');
  await expect(page.locator('.mode-root > .environment')).toBeVisible();
  // Space fills the screen to the panel's edge.
  const space = await page.locator('.mode-root > .environment').boundingBox();
  expect(space).toMatchObject({ x: 0, y: 0 });
  expect(space?.width ?? 0).toBeGreaterThanOrEqual(840);
});
