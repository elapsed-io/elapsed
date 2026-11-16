/** Starting, pausing, resuming and ending, by pointer and keyboard, with the tab title. */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BRAND } from '@stopwatch/core';
import { MINUTE, SECOND, TIMER_END, endThroughCountdown, openApp, settle, untilEndNowAccepts } from './helpers.ts';

const NAME = BRAND.name;

async function timeText(page: Page, selector = '.time--main'): Promise<string> {
  return page.locator(selector).evaluate((element) => {
    // Visible digits only: the seconds hidden by the short layout are not part of what is read.
    const parts: string[] = [];
    const walk = (node: Node): void => {
      if (node instanceof HTMLElement && getComputedStyle(node).display === 'none') return;
      if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent ?? '');
      node.childNodes.forEach(walk);
    };
    walk(element);
    return parts.join('');
  });
}

const primary = (page: Page) => page.locator('.button--primary');
const end = (page: Page) => page.locator(TIMER_END);

test('starts, pauses, resumes and ends with the buttons', async ({ page }) => {
  await openApp(page);
  await expect(primary(page)).toHaveAccessibleName('start');
  await expect(end(page)).toBeHidden();
  expect(await page.title()).toBe(NAME);

  await primary(page).click();
  await page.clock.runFor(5 * SECOND);
  expect(await timeText(page)).toBe('00:00:05');
  await expect(primary(page)).toHaveAccessibleName('pause');
  await expect(end(page)).toBeVisible();
  expect(await page.title()).toBe(`00:00 · ${NAME}`);

  await page.clock.runFor(2 * MINUTE);
  expect(await timeText(page)).toBe('00:02');
  expect(await page.title()).toBe(`00:02 · ${NAME}`);

  await primary(page).click();
  await expect(primary(page)).toHaveAccessibleName('resume');
  await expect(page.locator('.paused')).toBeVisible();
  await page.clock.runFor(61 * SECOND);
  expect(await timeText(page, '.time--paused-for')).toBe('00:01:01paused for');
  expect(await page.title()).toBe(`paused for 00:01 · ${NAME}`);
  expect(await timeText(page)).toBe('00:02');

  await primary(page).click();
  await expect(primary(page)).toHaveAccessibleName('pause');
  await expect(page.locator('.paused')).toBeHidden();
  await page.clock.runFor(MINUTE);
  expect(await timeText(page)).toBe('00:03');

  // End opens the countdown; cancel goes back with no time lost.
  await end(page).click();
  await expect(page.locator('.ending')).toBeVisible();
  await expect(page.locator('.corner')).toBeHidden();
  await page.getByRole('button', { name: 'cancel' }).click();
  await expect(page.locator('.ending')).toBeHidden();
  await expect(primary(page)).toHaveAccessibleName('pause');
  await expect(primary(page)).toBeFocused();

  await endThroughCountdown(page);
  await expect(page.getByRole('button', { name: 'back to the timer' })).toBeVisible();
  await expect(page.locator('.screen > .controls')).toBeHidden();
  expect(await page.title()).toBe(NAME);
});

test('space starts, pauses and resumes; E ends', async ({ page }) => {
  await openApp(page);
  await page.locator('body').focus();
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('pause');
  await page.clock.runFor(3 * SECOND);
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('resume');
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('pause');
  // E opens the countdown; Space cancels it; E then E again (after its guard) ends now.
  await page.keyboard.press('e');
  await expect(page.locator('.ending')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.ending')).toBeHidden();
  await expect(primary(page)).toHaveAccessibleName('pause');
  await page.locator('body').focus();
  await page.keyboard.press('e');
  await page.keyboard.press('e');
  await expect(page.locator('.ending')).toBeVisible();
  // End now ignores its first 300 ms, counted on the countdown's own animation, which a slow browser starts late.
  await untilEndNowAccepts(page);
  await page.keyboard.press('e');
  await expect(page.locator('.results')).toBeVisible();
  // Space on the results goes back to the timer; Space there starts the next session.
  await page.locator('body').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.results')).toBeHidden();
  await expect(primary(page)).toHaveAccessibleName('start');
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('pause');
});

test('space on a focused button acts once, not twice', async ({ page }) => {
  await openApp(page);
  await primary(page).focus();
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('pause');
  await expect(primary(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(primary(page)).toHaveAccessibleName('resume');
});

test('shortcuts ignore modifier keys, held keys and typing', async ({ page }) => {
  await openApp(page);
  await page.locator('body').focus();
  for (const chord of ['Control+Space', 'Alt+Space', 'Shift+Space', 'Meta+Space']) {
    await page.keyboard.press(chord);
    await expect(primary(page)).toHaveAccessibleName('start');
  }
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'typing';
    document.body.append(input);
  });
  await page.locator('#typing').focus();
  await page.keyboard.type(' e e ');
  await expect(primary(page)).toHaveAccessibleName('start');
  await page.locator('#typing').evaluate((element) => {
    element.remove();
  });
  await page.locator('body').focus();
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(primary(page)).toHaveAccessibleName('pause');
});

test('the start button slides left as end fades in to its right', async ({ page }) => {
  await openApp(page);
  const before = await primary(page).boundingBox();
  await primary(page).click();
  const during = await page.evaluate(() => document.getAnimations().map((animation) => animation instanceof CSSTransition ? 'transition' : animation instanceof CSSAnimation ? 'css' : 'script'));
  expect(during).toContain('script');
  await settle(page);
  const after = await primary(page).boundingBox();
  const endBox = await end(page).boundingBox();
  expect(after?.x ?? 0).toBeLessThan(before?.x ?? 0);
  expect(endBox?.x ?? 0).toBeGreaterThan((after?.x ?? 0) + (after?.width ?? 0));
  await expect(end(page)).toHaveCSS('opacity', '1');
});

test('end only fades in: it never slides in from elsewhere', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  const motion = await end(page).evaluate((element) =>
    element.getAnimations().map((animation) => {
      const effect = animation.effect;
      return effect instanceof KeyframeEffect ? effect.getKeyframes().map((frame) => Object.keys(frame).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k))) : [];
    }),
  );
  expect(motion.flat(2)).toEqual(['opacity', 'opacity']);
});

test('with reduced motion the seconds cut out with a short crossfade instead of blurring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(5 * SECOND);
  const names = await page.locator('.time--main .time__ones').evaluate((element) => getComputedStyle(element).animationName);
  expect(names).toBe('time-cut-ones');
  await expect(page.locator('.time--main .time__ones')).toHaveCSS('filter', 'none');
});

test('a device clock set back mid-session loses no time', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(5 * MINUTE);
  await page.clock.setSystemTime(Date.UTC(2026, 10, 16, 13, 0, 0));
  await page.clock.runFor(MINUTE);
  expect(await timeText(page)).toBe('00:06');
});

test('a seconds digit that has blurred away stays away: it never starts over at the next ten seconds', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  // Renders at 10 s and 20 s re-pin the blur animations to focused time while they play.
  await page.clock.runFor(25 * SECOND);
  const state = await page.locator('.time--main').evaluate((time) => {
    const ones = time.querySelector('.time__ones');
    const tens = time.querySelector('.time__tens');
    const timeOf = (element: Element | null): number[] =>
      (element?.getAnimations() ?? []).map((animation) => Number(animation.currentTime ?? -1));
    return {
      onesOpacity: ones === null ? '' : getComputedStyle(ones).opacity,
      onesTimes: timeOf(ones),
      tensTimes: timeOf(tens),
    };
  });
  expect(state.onesOpacity).toBe('0');
  for (const time of state.onesTimes) expect(time).toBeGreaterThanOrEqual(10_000);
  // The tens digit is part way through its own window (10 to 60 s), pinned to 20 s and playing on.
  for (const time of state.tensTimes) {
    expect(time).toBeGreaterThanOrEqual(20_000);
    expect(time).toBeLessThan(23_000);
  }
});

test('start morphs into pause over 160 ms with a slight spring', async ({ page }) => {
  await openApp(page);
  await page.locator('.button--primary').click();
  const faces = await page.locator('.button__face--pause').evaluate((face) => {
    const style = getComputedStyle(face);
    return { duration: style.transitionDuration, easing: style.transitionTimingFunction };
  });
  expect(faces.duration.split(', ')[0]).toBe('0.16s');
  // A damped spring drawn through linear(): it passes 1 a little before settling there.
  expect(faces.easing.startsWith('linear(0')).toBe(true);
  const points = [...faces.easing.matchAll(/(-?[\d.]+)(?:\s+[\d.]+%)?/g)].map((match) => Number(match[1]));
  expect(Math.max(...points)).toBeGreaterThan(1);
  expect(Math.max(...points)).toBeLessThan(1.05);
  expect(points.at(-1)).toBe(1);
});
