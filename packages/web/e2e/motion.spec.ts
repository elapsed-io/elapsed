/**
 * Round 2.1: animation speed and low power (plan, Settings catalog > Appearance; Loading and performance >
 * Low power; the Release 2 appearance frame).
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { CONFIG, DIGITS_RECIPE } from '@stopwatch/core';
import { MINUTE, SECOND, TIMER_END, endThroughCountdown, openApp, settle } from './helpers.ts';

const primary = (page: Page) => page.locator('.button--primary');

/** Every running animation's duration on `selector` (and inside it). */
function durations(page: Page, selector: string): Promise<number[]> {
  return page.locator(selector).first().evaluate((element) =>
    element.getAnimations({ subtree: true }).map((animation) => Math.round(Number(animation.effect?.getTiming().duration))),
  );
}

for (const speed of ['slower', 'faster'] as const) {
  test(`animation speed "${speed}" scales the start morph and the results replay`, async ({ page }) => {
    const scale = CONFIG.motion.speeds[speed];
    await openApp(page, { settings: { animationSpeed: speed } });
    expect(Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--motion-scale')))).toBeCloseTo(scale);
    // The morph: end slides in beside pause over the scaled 160 ms.
    await primary(page).click();
    expect(await durations(page, TIMER_END)).toContain(Math.round(CONFIG.motion.startMorph * scale));
    await settle(page);
    await page.clock.runFor(5 * MINUTE);
    await endThroughCountdown(page);
    await page.locator('.results[data-ready]').waitFor();
    const replay = await page.locator('.results').evaluate((results) =>
      results
        .getAnimations()
        .filter((animation) => animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some((frame) => '--replay-progress' in frame))
        .map((animation) => Math.round(Number(animation.effect?.getTiming().duration))),
    );
    // Digits replays for its own 1.4 s (a 5-minute session adds nothing), scaled.
    expect(replay).toEqual([Math.round(DIGITS_RECIPE.results.replay.seconds * 1000 * scale)]);
  });
}

test('normal is the Design system timing', async ({ page }) => {
  await openApp(page);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--motion-morph').trim())).toBe('0.16s');
  await primary(page).click();
  expect(await durations(page, TIMER_END)).toContain(CONFIG.motion.startMorph);
});

test('low power is switched on in settings, and stops the modes gliding', async ({ page }) => {
  await openApp(page, { mode: 'ring', width: 1280, height: 1160 });
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^appearance$/ }).click();
  const lowPower = page.getByRole('switch', { name: 'low power' });
  await expect(lowPower).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-low-power');
  await lowPower.click();
  await expect(lowPower).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-low-power', '');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ schema: 2, lowPower: true });
  await page.keyboard.press(',');
  await primary(page).click();
  await page.clock.runFor(90 * SECOND);
  await settle(page);
  // Nothing on the ring moves: it stands on the minute.
  expect(await durations(page, '.ring__rotor')).toEqual([]);
  expect(await page.locator('.ring__rotor').evaluate((element) => (element as HTMLElement).style.transform)).toBe('rotate(6deg)');
});

test('the system asking for reduced motion turns low power on, and settings say so', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, { mode: 'timeline', width: 1280, height: 1160 });
  await expect(page.locator('html')).toHaveAttribute('data-low-power', '');
  await page.keyboard.press(',');
  await page.locator('.settings__row', { hasText: /^appearance$/ }).click();
  const lowPower = page.getByRole('switch', { name: 'low power' });
  await expect(lowPower).toHaveAttribute('aria-checked', 'true');
  await expect(lowPower).toHaveAttribute('aria-disabled', '');
  // It cannot be turned off here while the system asks; the stored setting stays off.
  await lowPower.click();
  await expect(lowPower).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).not.toHaveProperty('lowPower', true);
  // The system stops asking: low power follows, and the timeline glides again.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(lowPower).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-low-power');
  await page.keyboard.press(',');
  await primary(page).click();
  await page.clock.runFor(SECOND);
  expect((await durations(page, '.timeline__track')).filter((duration) => duration === 60_000)).toHaveLength(3);
});
