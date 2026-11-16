import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { CONFIG } from '@stopwatch/core';
import { coreFiles } from '../scripts/size-budget.ts';
import { diffPngs } from './pixels.ts';
import type { PixelDiff } from './pixels.ts';

export const FONT = readFileSync(fileURLToPath(new URL('../src/assets/fonts/timer-sans.woff2', import.meta.url)));

/** 2026-11-16 14:00:00 UTC. */
export const T0 = Date.UTC(2026, 10, 16, 14, 0, 0);
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

/** When the fake clock stops running on its own; tests then move it with runFor. */
export const T_READY = T0 + 30_000;

/**
 * Stores settings before the site's scripts run, as if chosen earlier, unless
 * settings are already stored (so a reload keeps what the test changed).
 */
export async function seedSettings(page: Page, settings: Readonly<Record<string, unknown>>): Promise<void> {
  await page.addInitScript((text) => {
    if (localStorage.getItem('settings') === null) localStorage.setItem('settings', text);
  }, JSON.stringify({ schema: 1, ...settings }));
}

/**
 * Opens the site with a controllable clock (Date, performance.now and timers),
 * then holds the clock at T_READY so every later moment is exact. `mode`
 * chooses the display mode through stored settings.
 */
export async function openApp(
  page: Page,
  options: { mode?: string; width?: number; height?: number; settings?: Readonly<Record<string, unknown>> } = {},
): Promise<void> {
  await page.setViewportSize({ width: options.width ?? 720, height: options.height ?? 450 });
  if (options.mode !== undefined || options.settings !== undefined) await seedSettings(page, { ...options.settings, ...(options.mode === undefined ? {} : { mode: options.mode }) });
  await page.clock.install({ time: T0 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.button--primary').waitFor();
  await page.clock.pauseAt(T_READY);
}

/**
 * Lets every interface transition (200 ms crossfades and slides) finish in real time. The timeline's and the
 * ring's glides, which run a minute at a time and hold while paused, are motion with time, not transitions:
 * tests freeze them.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const running = document
      .getAnimations()
      .filter((animation) => !(animation instanceof CSSAnimation) && animation.playState === 'running')
      .filter((animation) => !(animation.effect instanceof KeyframeEffect && animation.effect.target?.matches('.timeline__glide, .ring__rotor') === true));
    await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
  });
}

/**
 * Freezes every animation on the page at an exact moment, so a screenshot shows that moment whatever the
 * real time. Playwright's clock moves timers but not animations, so each animation's own time is set, once
 * it is ready (a pending animation would otherwise take its own start time afterwards):
 * - `css`: CSS animations (the seconds blur-away, pinned to focused time) at this many milliseconds;
 * - `at`: animations of elements matching a selector at that many milliseconds (the countdown's fill);
 * - every other animation (interface motion, transitions) at its end.
 * Each is then held paused, which is static: nothing moves between this and the screenshot.
 */
export async function freezeAnimations(page: Page, moments: { readonly css?: number; readonly at?: Readonly<Record<string, number>> } = {}): Promise<void> {
  await page.evaluate(
    async ({ css, at }) => {
      const animations = document.getAnimations();
      await Promise.all(animations.map((animation) => animation.ready.catch(() => undefined)));
      for (const animation of animations) {
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        const selector = target === null ? undefined : Object.keys(at).find((key) => target.matches(key));
        animation.pause();
        if (selector !== undefined) animation.currentTime = at[selector] ?? 0;
        else if (css !== null && animation instanceof CSSAnimation) animation.currentTime = css;
        else {
          try {
            animation.finish();
          } catch {
            // An endless animation has no end: it stays paused where it is.
          }
        }
      }
    },
    { css: moments.css ?? null, at: moments.at ?? {} },
  );
  // Let the browser draw the held moment (the page's own clock is held, so this waits in real time).
  await page.waitForTimeout(100);
}

/** Holds every CSS animation at a moment of focused time, so a screenshot shows exactly that moment. */
export async function holdAnimationsAt(page: Page, focusedMs: number): Promise<void> {
  await freezeAnimations(page, { css: focusedMs });
}

/**
 * Draws a frame's markup as a reference image. Its "Archivo" is the site's default font, or `font`: a page
 * with its own cut of that font is compared with the frame drawn in that cut, so only layout and colour differ.
 */
export async function screenshotReference(browser: Browser, markup: string, viewport = { width: 720, height: 450 }, font: Buffer = FONT): Promise<Buffer> {
  const reference = await browser.newPage({ viewport });
  await reference.route('http://frame.test/**', (route) => {
    const isFont = route.request().url().endsWith('/font.woff2');
    return route.fulfill({ body: isFont ? font : markup, contentType: isFont ? 'font/woff2' : 'text/html' });
  });
  await reference.goto('http://frame.test/');
  await reference.evaluate(() => document.fonts.ready);
  const image = await reference.screenshot();
  await reference.close();
  return image;
}

export async function compareWithReference(page: Page, browser: Browser, markup: string): Promise<PixelDiff> {
  const site = await page.screenshot();
  const reference = await screenshotReference(browser, markup, page.viewportSize() ?? undefined);
  const scratch = await browser.newPage();
  const diff = await diffPngs(scratch, site, reference);
  await scratch.close();
  return diff;
}

/** The end button of the timer's own controls (the countdown has an "end now" button of the same style). */
export const TIMER_END = '.screen > .controls .button--end';

/**
 * Ends the session through the countdown: end, then end now once its 300 ms
 * guard has passed (the countdown runs on the browser's own animation clock).
 */
/**
 * Waits until end now accepts a press: it ignores its first 300 ms, counted on the countdown's own animation
 * (shell/ending.ts), which a slow browser starts a little after the countdown appears.
 */
export async function untilEndNowAccepts(page: Page): Promise<void> {
  await page.locator('.ending').waitFor();
  await expect
    .poll(() => page.locator('.ending').evaluate((ending) => Math.max(0, ...ending.getAnimations({ subtree: true }).map((animation) => Number(animation.currentTime ?? 0)))))
    .toBeGreaterThanOrEqual(CONFIG.session.endNowGuard);
}

export async function endThroughCountdown(page: Page): Promise<void> {
  await page.locator(TIMER_END).click();
  await untilEndNowAccepts(page);
  await page.getByRole('button', { name: 'end now' }).click();
  await page.locator('.results').waitFor();
}

/** Finishes every running animation (the tabulating fade, the results fade-in, the replay), as if their time had passed. */
export async function finishResults(page: Page): Promise<void> {
  // Drawn and timed: every animation of the sequence exists.
  await page.locator('.results[data-ready]').waitFor();
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round += 1) {
      const running = document
        .getAnimations()
        .filter((animation) => !(animation instanceof CSSAnimation))
        .filter((animation) => !(animation.effect instanceof KeyframeEffect && animation.effect.target?.matches('.timeline__glide, .ring__rotor') === true));
      for (const animation of running) animation.finish();
      // Let finish handlers (which cancel spent animations and remove masks) run. The page's timers
      // may be held by the test clock, so only promises are awaited.
      await Promise.allSettled(running.map((animation) => animation.finished));
      await Promise.resolve();
    }
  });
}

/**
 * What the first visit loads, from the build the tests run against (the same
 * reckoning as the size check): the page, its scripts and their static
 * imports, its stylesheets and the default font, as paths.
 */
export function corePaths(): string[] {
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  return coreFiles(dist).map((file) => (file.path === 'index.html' ? '/' : `/${file.path}`));
}
