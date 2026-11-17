/**
 * The perpetual calendar test mode (owner, changes 4): a test of the recipe system after a perpetual-calendar
 * watch. Its hands show focused time; its complications run a perpetual calendar a day a focused minute, from
 * Monday 1 January 2024 (a leap year): the date through months of their own lengths, the weekday, the month, the
 * leap year and the real moon of the date shown.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { LUNATION_DAYS, createSession, moonAge, serializeActiveState, startState } from '@stopwatch/core';
import { MINUTE, SECOND, T0, T_READY, openApp, settle } from './helpers.ts';

test.use({ locale: 'en-GB', timezoneId: 'UTC' });

/** Opens the site with a perpetual-calendar session `focusMs` in when it is ready. */
async function restoreAt(page: Page, focusMs: number, settings?: Readonly<Record<string, unknown>>): Promise<void> {
  const session = createSession({ id: '7d1c3e5a-9b2f-4c6d-8e0a-1b3c5d7e9f2a', mode: 'calendar', at: T_READY - focusMs, timeZone: 'UTC' });
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * SECOND }));
  await openApp(page, { mode: 'calendar', ...(settings === undefined ? {} : { settings }) });
}

/** Each calendar hand's angle (its rotate() in degrees), by its part. */
async function parts(page: Page): Promise<Record<string, number>> {
  return page.locator('.analog__hand[data-part]').evaluateAll((hands) =>
    Object.fromEntries(hands.map((hand) => [(hand as HTMLElement).dataset['part'] ?? '', Number(/rotate\(([-\d.e]+)deg\)/.exec((hand as HTMLElement).style.transform)?.[1] ?? Number.NaN)])),
  );
}

const close = (actual: number, expected: number): void => {
  // The browser writes angles back to a few decimals.
  expect(Math.abs(actual - expected)).toBeLessThan(1e-3);
};

test('its tile shows only when asked for with ?test=calendar', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  const openDisplay = async (): Promise<void> => {
    await page.keyboard.press(',');
    await page.locator('.settings').waitFor();
    const display = page.locator('.settings__row', { hasText: /^display$/ });
    if ((await display.getAttribute('aria-expanded')) !== 'true') await display.click();
  };
  await openDisplay();
  await expect(page.getByRole('radio', { name: 'perpetual calendar' })).toHaveCount(0);
  await page.goto('/?test=calendar');
  await page.locator('.button--primary').waitFor();
  await openDisplay();
  await page.getByRole('radio', { name: 'perpetual calendar' }).click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'calendar');
});

test('its calendar steps a day a focused minute through months of their own lengths, and its moon is the date’s', async ({ page }) => {
  // 59 focused minutes: Thursday 29 February 2024, a leap year.
  await restoreAt(page, 59 * MINUTE + 30 * SECOND);
  let at = await parts(page);
  close(at['date'] ?? Number.NaN, (28 / 31) * 360);
  close(at['weekday'] ?? Number.NaN, (3 / 7) * 360);
  close(at['month'] ?? Number.NaN, (1 / 12) * 360);
  close(at['leap-year'] ?? Number.NaN, (3 / 4) * 360);
  // The next day is 1 March, a Friday: the date hand jumps back to 1.
  await page.clock.runFor(MINUTE);
  at = await parts(page);
  close(at['date'] ?? Number.NaN, 0);
  close(at['weekday'] ?? Number.NaN, (4 / 7) * 360);
  close(at['month'] ?? Number.NaN, (2 / 12) * 360);
  // The moon disc turns half a turn a lunation, gliding with the session, as the moon of the date shown.
  const glide = await page.locator('.dial__moon-disc').evaluate((disc) => {
    const [animation] = disc.getAnimations();
    const frames = (animation?.effect as KeyframeEffect | undefined)?.getKeyframes() ?? [];
    return frames.map((frame) => Number(/rotate\(([-\d.e]+)deg\)/.exec(String(frame['transform']))?.[1] ?? Number.NaN));
  });
  close(glide[0] ?? Number.NaN, (moonAge(60) / LUNATION_DAYS / 2) * 360);
  close(glide[1] ?? Number.NaN, (moonAge(61) / LUNATION_DAYS / 2) * 360);
});

test('its hands show focused time: hours and minutes glide, and the seconds hand sweeps a turn a minute', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 15 * SECOND);
  const hands = await page.locator('.analog__hand:not([data-part])').evaluateAll((elements) =>
    elements.map((element) => {
      const [animation] = element.getAnimations();
      const frames = (animation?.effect as KeyframeEffect | undefined)?.getKeyframes() ?? [];
      const turn = frames.map((frame) => Number(/rotate\(([-\d.e]+)deg\)/.exec(String(frame['transform']))?.[1] ?? Number.NaN));
      return { from: turn[0] ?? Number.NaN, by: (turn[1] ?? Number.NaN) - (turn[0] ?? Number.NaN), duration: Number(animation?.effect?.getTiming().duration) };
    }),
  );
  // Slowest underneath: the hours hand (a turn in 12 hours), the minute hand (an hour), the seconds hand (a minute).
  expect(hands.map(({ by }) => Math.round(by * 1000) / 1000)).toEqual([0.5, 6, 360]);
  expect(hands.map(({ from }) => Math.round(from * 1000) / 1000)).toEqual([42, 504, 30240]);
  expect(new Set(hands.map(({ duration }) => duration))).toEqual(new Set([MINUTE]));
});

test('with low power, every hand stands at the minute', async ({ page }) => {
  await restoreAt(page, 84 * MINUTE + 15 * SECOND, { lowPower: true });
  await settle(page);
  const running = await page.locator('.analog').evaluate((face) => face.getAnimations({ subtree: true }).length);
  expect(running).toBe(0);
  await expect(page.locator('.analog')).toHaveClass(/analog--still/);
});
