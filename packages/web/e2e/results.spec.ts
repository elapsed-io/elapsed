/**
 * Round 5: the ending countdown, the results screen and its replays, compared
 * with their frames; back to the timer, share, reload, reduced motion, small windows and
 * sessions that end on their own.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BRAND, CONFIG, createSession, serializeActiveState, startState } from '@stopwatch/core';
import { PAPER, endingFrame, inPalette, resultsRingFrame, resultsStripFrame } from './fixtures/frames.ts';
import type { ResultsData } from './fixtures/frames.ts';
import { MINUTE, SECOND, T0, TIMER_END, compareWithReference, endThroughCountdown, finishResults, freezeAnimations, openApp, settle, untilEndNowAccepts } from './helpers.ts';
import { expectLikeFrame } from './pixels.ts';

// Clock times as in the frames: a 24-hour region, in UTC.
test.use({ locale: 'en-GB', timezoneId: 'UTC' });

const primary = (page: Page) => page.locator('.button--primary');

/**
 * The frames' sample session, played through the site: started at 14:02,
 * 92 min of focus, a 10 min pause, 48 min, an 8 min pause, then 27 min 40 s.
 */
async function playSampleSession(page: Page, mode?: string, settings?: Readonly<Record<string, unknown>>): Promise<void> {
  await openApp(page, { width: 720, height: 520, ...(mode === undefined ? {} : { mode }), ...(settings === undefined ? {} : { settings }) });
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
  // 17:00 would crowd the end label, so the strip leaves it out.
  hours: [
    { text: '15:00', minute: 58 },
    { text: '16:00', minute: 118 },
  ],
};

test('the ending countdown matches its frame, with no corner icons', async ({ page, browser, browserName }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(MINUTE);
  await page.locator(TIMER_END).click();
  await page.locator('.ending').waitFor();
  await page.mouse.move(0, 0);
  // Freeze the bar half full, 190 of 380 px at 2.5 s, once its animation exists: frozen as static style, so
  // the screenshot cannot catch the compositor's bar at another moment (the countdown runs on the browser's
  // animation clock, which Playwright's clock does not move).
  const fill = page.locator('.ending__fill');
  await expect.poll(() => fill.evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
  await freezeAnimations(page, { at: { '.ending__fill': 2500 } });
  await expect(page.locator('.corner')).toBeHidden();
  const diff = await compareWithReference(page, browser, endingFrame(190));
  // The moving bar is drawn on its own layer, which shifts anti-aliasing at its edge.
  expectLikeFrame(diff, browserName, () => {
    expect(diff.visible, JSON.stringify(diff)).toBeLessThanOrEqual(20);
  });
});

test('results for digits match the "results: digits and timeline" frame exactly', async ({ page, browser, browserName }) => {
  await playSampleSession(page);
  await expect(page.locator('.strip__label').filter({ hasText: '17:00' })).toBeHidden();
  const diff = await compareWithReference(page, browser, resultsStripFrame(SAMPLE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('results in the paper theme match the "results, paper theme" frame exactly', async ({ page, browser, browserName }) => {
  await playSampleSession(page, undefined, { theme: 'paper' });
  const diff = await compareWithReference(page, browser, inPalette(PAPER, () => resultsStripFrame(SAMPLE)));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

test('results for ring match the "results: analog and ring" frame exactly', async ({ page, browser, browserName }) => {
  await playSampleSession(page, 'ring');
  const diff = await compareWithReference(page, browser, resultsRingFrame(SAMPLE));
  expectLikeFrame(diff, browserName, () => {
    expect(diff).toMatchObject({ differing: 0 });
  });
});

/** The results screen's own animations: what each moves, for how long, on which curve, and when it starts. */
function resultsMotion(page: Page): Promise<{ moves: string; duration: number; easing: string; start: number }[]> {
  return page.locator('.results').evaluate((results) =>
    results.getAnimations().map((animation) => {
      const effect = animation.effect as KeyframeEffect;
      const moves = Object.keys(effect.getKeyframes()[0] ?? {})
        .filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))
        .sort()
        .join(' ');
      return { moves, duration: Number(effect.getTiming().duration), easing: String(effect.getTiming().easing), start: Number(animation.startTime) };
    }),
  );
}

const FAST = 'cubic-bezier(0.16, 1, 0.3, 1)';

for (const [mode, duration] of [
  ['digits', 1400],
  ['ring', 2000],
  ['timeline', 2000],
] as const) {
  test(`${mode} replays for its own ${String(duration / 1000)} s on the fast ease-out, after a quicker fade-in`, async ({ page }) => {
    await openApp(page, { width: 720, height: 520, mode });
    await primary(page).click();
    await page.clock.runFor(20 * MINUTE);
    await endThroughCountdown(page);
    await page.locator('.results[data-ready]').waitFor();
    const motion = await resultsMotion(page);
    const appear = motion.find((animation) => animation.moves === 'opacity transform');
    const replay = motion.find((animation) => animation.moves === '--replay-progress');
    // Results fade in over 0.3 s from 0.3 s, rising 6 px; the replay starts at 0.5 s.
    expect(appear).toMatchObject({ duration: CONFIG.motion.resultsFadeIn, easing: FAST });
    expect(replay).toMatchObject({ duration, easing: FAST });
    // Firefox reports start times coarsened by a few hundredths of a millisecond.
    expect((replay?.start ?? 0) - (appear?.start ?? 0)).toBeCloseTo(CONFIG.motion.replayDelay - CONFIG.motion.resultsFadeInDelay, 0);
  });
}

test('a session over 2 hours replays longer: 8 hours of ring, 1 s more', async ({ page }) => {
  const HOUR = 60 * MINUTE;
  const session = createSession({ id: '5b8e2c1d-4a6f-4e9b-8c3d-2e1f0a9b8c7d', mode: 'ring', at: T0 - 8 * HOUR, timeZone: 'UTC' });
  await page.goto('/sw-control.json');
  await page.evaluate((text) => {
    localStorage.setItem('timer.active', text);
  }, serializeActiveState({ ...startState(session), presenceAt: T0 - 10 * MINUTE }));
  await openApp(page, { width: 720, height: 520, mode: 'ring' });
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  const replay = (await resultsMotion(page)).find((animation) => animation.moves === '--replay-progress');
  // 2 s for ring, 0.5 s × log2(8 ÷ 2) more (the session ran a few seconds past 8 hours).
  expect(replay?.duration).toBeCloseTo(3000, -1);
});

test('timeline replays as the focus strip too', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  await primary(page).click();
  await page.clock.runFor(20 * MINUTE);
  await endThroughCountdown(page);
  await expect(page.locator('.results .strip')).toBeVisible();
});

test('the session ends where end was pressed; cancel loses nothing', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(10 * MINUTE);
  await page.locator(TIMER_END).click();
  // The fake clock moves on while the countdown shows; cancel keeps that time.
  await page.clock.runFor(4 * SECOND);
  await page.getByRole('button', { name: 'cancel' }).click();
  await page.clock.runFor(MINUTE - 4 * SECOND);
  await page.locator(TIMER_END).click();
  await page.clock.runFor(4 * SECOND);
  await untilEndNowAccepts(page);
  await page.getByRole('button', { name: 'end now' }).click();
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:11:00');
});

test('end now ignores a press in its first 300 ms', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(MINUTE);
  await page.locator(TIMER_END).dblclick();
  await expect(page.locator('.ending')).toBeVisible();
  await expect(page.locator('.results')).toHaveCount(0);
});

/** Holds the replay at `share` of its duration, and reads the progress and what is drawn from it. */
async function holdReplay(page: Page, share: number): Promise<{ progress: number; count: number; minuteHand: number | null; reveals: number[]; minutes: number | null }> {
  return page.evaluate((at) => {
    const results = document.querySelector('.results');
    if (results === null) throw new Error('no results');
    const replays = results.getAnimations().filter((animation) => {
      const effect = animation.effect;
      return effect instanceof KeyframeEffect && effect.getKeyframes().some((frame) => '--replay-progress' in frame);
    });
    if (replays.length !== 1) throw new Error(`expected one replay animation, found ${String(replays.length)}`);
    const replay = replays[0];
    if (replay === undefined) throw new Error('no replay');
    replay.pause();
    replay.currentTime = Number(replay.effect?.getTiming().duration) * at;
    const progress = Number(getComputedStyle(results).getPropertyValue('--replay-progress'));
    const hand = document.querySelector('.rings__hand:last-of-type');
    const matrix = hand === null ? null : new DOMMatrix(getComputedStyle(hand).transform);
    const rings = document.querySelector<HTMLElement>('.rings');
    return {
      progress,
      // The count is drawn by CSS counters from this value (results.css), which innerText cannot see.
      count: Number(getComputedStyle(document.querySelector('.results__time') ?? results).getPropertyValue('--results-focused')),
      minuteHand: matrix === null ? null : (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
      // Serialised as a length, possibly inside calc(): "calc(0.78px)".
      reveals: [...document.querySelectorAll('.rings__reveal')].map((circle) => Number(/-?\d*\.?\d+/.exec(getComputedStyle(circle).strokeDashoffset)?.[0])),
      minutes: rings === null ? null : Number(rings.style.getPropertyValue('--replay-minutes')),
    };
  }, share);
}

test('the headline counts up with the replay, pauses where the session paused, and lands on the total', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(20 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(10 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(22 * MINUTE + 7 * SECOND);
  await endThroughCountdown(page);
  const time = page.locator('.results__time');
  await page.locator('.results[data-ready]').waitFor();
  await expect(time).toHaveClass(/results__time--counting/);
  // Within the pause (minutes 20 to 30 of 52:07), the count holds at 20 minutes.
  const total = 52 * 60 + 7;
  for (const share of [0.1, 0.25, 0.45, 0.6, 0.9]) {
    const { progress, count } = await holdReplay(page, share);
    const elapsed = progress * total;
    const focused = Math.floor(Math.min(elapsed, 20 * 60) + Math.max(0, elapsed - 30 * 60));
    expect(count, String(share)).toBe(focused);
  }
  await finishResults(page);
  await expect(time).not.toHaveClass(/results__time--counting/);
  expect(await time.innerText()).toBe('00:42:07');
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:42:07');
});

test('the ring replay is one progress value: the arcs are revealed exactly behind the minute hand', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  await primary(page).click();
  await page.clock.runFor(84 * MINUTE);
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  for (const share of [0.05, 0.3, 0.5, 0.8]) {
    const { progress, minuteHand, reveals, minutes } = await holdReplay(page, share);
    expect(minutes).toBeCloseTo(84, 3);
    const elapsed = progress * (minutes ?? 0);
    // The minute hand at elapsed × 6°; each hour's ring revealed exactly that far into its hour, and no further.
    const expectedHand = ((elapsed * 6 + 180) % 360) - 180;
    expect(minuteHand ?? Number.NaN, String(share)).toBeCloseTo(expectedHand, 1);
    reveals.forEach((offset, hour) => {
      const shown = Math.min(1, Math.max(0, (elapsed - hour * 60) / 60));
      expect(1 - offset, `${String(share)} hour ${String(hour)}`).toBeCloseTo(shown, 3);
    });
  }
});

for (const how of ['click', 'Space'] as const) {
  test(`back to the timer (${how}) shows the idle timer, starts nothing, and the finished session leaves tab storage`, async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(3 * MINUTE);
    await endThroughCountdown(page);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['timer.finished']);
    const back = page.getByRole('button', { name: 'back to the timer' });
    await expect(back).toBeFocused();
    if (how === 'click') await back.click();
    else await page.keyboard.press('Space');
    await expect(page.locator('.results')).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('start');
    await expect(primary(page)).toBeFocused();
    expect(await page.evaluate(() => [Object.keys(sessionStorage), localStorage.getItem('timer.active')])).toEqual([[], null]);
    // A reload shows the timer, not the old results; the next session starts from there.
    await page.reload();
    await expect(page.locator('.results')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(primary(page)).toHaveAccessibleName('pause');
  });
}

test('the settings icon opens the panel over the results, and closing it leaves the results as they were', async ({ page }) => {
  await openApp(page, { width: 1280, height: 800 });
  await primary(page).click();
  await page.clock.runFor(42 * MINUTE + 7 * SECOND);
  await endThroughCountdown(page);
  await finishResults(page);
  const before = await page.locator('.results').innerText();
  await page.locator('.icon-button--settings').click();
  await expect(page.locator('.settings')).toBeVisible();
  await expect(page.locator('.results')).toBeVisible();
  await page.getByRole('button', { name: 'close' }).click();
  await expect(page.locator('.settings')).toBeHidden();
  await expect(page.locator('.icon-button--settings')).toBeFocused();
  await expect(page.locator('.results')).toBeVisible();
  expect(await page.locator('.results').innerText()).toBe(before);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:42:07');
  // The comma shortcut opens it over the results too.
  await page.keyboard.press(',');
  await expect(page.locator('.settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.results')).toBeVisible();
});

test('a reload shows the results again, in their final state, without the replay', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(25 * MINUTE);
  await endThroughCountdown(page);
  await page.reload();
  await page.locator('.results[data-ready]').waitFor();
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:25:00');
  const running = await page.locator('.results').evaluate((element) => element.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
  await expect(page.locator('.ending')).toBeHidden();
});

test('a session shorter than a minute still gets its results', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(20 * SECOND);
  await endThroughCountdown(page);
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:00:20');
});

test.describe('share', () => {
  test('copies the line on a computer and shows a check for 2 seconds', async ({ page, context, browserName }) => {
    // Only Chromium lets a test grant clipboard access and read the clipboard back; elsewhere the copy
    // is real too, and the test reads what the site gave the clipboard.
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      const written: string[] = [];
      (window as unknown as { __written: string[] }).__written = written;
      const clipboard = navigator.clipboard;
      const write = clipboard.writeText.bind(clipboard);
      clipboard.writeText = (text: string) => {
        written.push(text);
        return write(text);
      };
    });
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(2 * 60 * MINUTE - 13 * MINUTE + 5 * SECOND);
    await endThroughCountdown(page);
    await finishResults(page);
    await page.getByRole('button', { name: 'share' }).click();
    await expect(page.locator('[role="status"]')).toHaveText('copied');
    await expect(page.locator('.action__check')).toHaveCSS('opacity', '1');
    const line = `i studied for 1h 47m on ${BRAND.name} http://localhost:4173/`;
    expect(await page.evaluate(() => (window as unknown as { __written: string[] }).__written)).toEqual([line]);
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(line);
  });

  test('when the browser refuses to copy, shows a small cross for 2 seconds and says so', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () => Promise.reject(new DOMException('refused', 'NotAllowedError'));
    });
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(45 * MINUTE);
    await endThroughCountdown(page);
    await finishResults(page);
    await page.getByRole('button', { name: 'share' }).click();
    await expect(page.locator('[role="status"]')).toHaveText('couldn’t copy');
    await expect(page.locator('.action__cross')).toHaveCSS('opacity', '1');
    await expect(page.locator('.action__check')).toHaveCSS('opacity', '0');
    // Gone after its 2 seconds (the browser's own animation clock).
    await expect(page.locator('.action__cross')).toHaveCSS('opacity', '0', { timeout: 4000 });
  });

  test('opens the share sheet on a touch device', async ({ page }) => {
    await page.addInitScript(() => {
      const shared: unknown[] = [];
      (window as unknown as { __shared: unknown[] }).__shared = shared;
      Object.defineProperty(navigator, 'share', { value: (data: unknown) => Promise.resolve(void shared.push(data)) });
      const real = window.matchMedia.bind(window);
      // The main pointer is touch.
      window.matchMedia = (query: string): MediaQueryList => {
        const list = real(query);
        return query === '(pointer: coarse)' ? (Object.create(list, { matches: { value: true } }) as MediaQueryList) : list;
      };
    });
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(45 * SECOND);
    await endThroughCountdown(page);
    await finishResults(page);
    await page.getByRole('button', { name: 'share' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared))
      .toEqual([{ text: `i studied for 45s on ${BRAND.name}`, url: 'http://localhost:4173/' }]);
  });
});

test('with reduced motion there is no replay: the final state crossfades in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(30 * MINUTE);
  await endThroughCountdown(page);
  await expect(page.locator('.results__time')).not.toHaveClass(/results__time--counting/);
  const replaying = await page.locator('.results__graphic').evaluate((element) => element.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length);
  expect(replaying).toBe(0);
  await expect(page.locator('.strip__bar').first()).toBeVisible();
});

test('on a phone the headline scales, the strip fits and the stats wrap into rows of three', async ({ page }) => {
  await openApp(page, { width: 390, height: 844 });
  await primary(page).click();
  await page.clock.runFor(70 * MINUTE);
  await endThroughCountdown(page);
  await finishResults(page);
  const layout = await page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const stats = [...document.querySelectorAll('.stat')].map((element) => Math.round(element.getBoundingClientRect().top));
    return {
      headline: Number.parseFloat(getComputedStyle(document.querySelector('.results__time') ?? document.body).fontSize),
      label: Number.parseFloat(getComputedStyle(document.querySelector('.stat__label') ?? document.body).fontSize),
      strip: box('.strip'),
      rows: new Set(stats).size,
      scrollWidth: document.documentElement.scrollWidth,
      widths: [window.innerWidth, document.documentElement.clientWidth, window.visualViewport?.width ?? 0],
    };
  });
  expect(layout.headline, JSON.stringify(layout)).toBeCloseTo(60 * (390 / 720), 1);
  expect(layout.label).toBe(11);
  expect(layout.strip?.left).toBeGreaterThanOrEqual(16);
  expect(layout.strip?.right).toBeLessThanOrEqual(390 - 16);
  expect(layout.rows).toBe(2);
  expect(layout.scrollWidth).toBe(390);
});

test('a pause past the limit skips the countdown and shows the results, in every open tab', async ({ page, context }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(6 * MINUTE);
  await primary(page).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('[role="status"]').waitFor({ state: 'attached' });
  await page.clock.runFor(31 * MINUTE);
  // Both tabs replay 31 minutes of one-second wakes first, which is slow when tests run in parallel.
  for (const tab of [page, other]) {
    await expect(tab.getByRole('button', { name: 'back to the timer' })).toBeVisible({ timeout: 15_000 });
    await expect(tab.getByRole('button', { name: 'cancel' })).toBeHidden();
  }
  await finishResults(page);
  await expect(page.locator('.results .visually-hidden')).toHaveText('00:06:00');
});

test('end now never shows the results before the tabulating screen has held and faded', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(25 * SECOND);
  // Watch every change to the page and note any moment the results could be seen early.
  await page.evaluate(() => {
    const early: string[] = [];
    (window as unknown as { __early: string[] }).__early = early;
    new MutationObserver(() => {
      const results = document.querySelector('.results');
      if (!(results instanceof HTMLElement) || results.hidden) return;
      const style = getComputedStyle(results);
      if (style.visibility !== 'hidden' && Number(style.opacity) > 0) early.push(results.hasAttribute('data-ready') ? 'ready' : 'not ready');
    }).observe(document.body, { subtree: true, attributes: true, childList: true });
  });
  await endThroughCountdown(page);
  await page.locator('.results[data-ready]').waitFor();
  // Seen only once timed, and then only by its fade-in, which starts 1 s after the bar filled.
  expect(await page.evaluate(() => (window as unknown as { __early: string[] }).__early)).toEqual([]);
  const opacity = await page.locator('.results').evaluate((element) => getComputedStyle(element).opacity);
  expect(Number(opacity)).toBeLessThan(1);
});
