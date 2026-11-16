import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from '@playwright/test';
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
 * Opens the site with a controllable clock (Date, performance.now and timers),
 * then holds the clock at T_READY so every later moment is exact.
 */
export async function openApp(page: Page, options: { mode?: string; width?: number; height?: number } = {}): Promise<void> {
  await page.setViewportSize({ width: options.width ?? 720, height: options.height ?? 450 });
  await page.clock.install({ time: T0 });
  await page.goto(options.mode === undefined ? '/' : `/?mode=${encodeURIComponent(options.mode)}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.button--primary').waitFor();
  await page.clock.pauseAt(T_READY);
}

/** Lets every interface transition (200 ms crossfades and slides) finish in real time. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const running = document.getAnimations().filter((animation) => !(animation instanceof CSSAnimation));
    await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
  });
}

/** Holds every CSS animation at a moment of focused time, so a screenshot shows exactly that moment. */
export async function holdAnimationsAt(page: Page, focusedMs: number): Promise<void> {
  await page.evaluate((at) => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation) {
        animation.pause();
        animation.currentTime = at;
      }
    }
  }, focusedMs);
}

/** Renders reference HTML outside the site's CSP and screenshots it. */
export async function screenshotReference(browser: Browser, markup: string, viewport = { width: 720, height: 450 }): Promise<Buffer> {
  const reference = await browser.newPage({ viewport });
  await reference.route('http://frame.test/**', (route) => {
    const isFont = route.request().url().endsWith('/font.woff2');
    return route.fulfill({ body: isFont ? FONT : markup, contentType: isFont ? 'font/woff2' : 'text/html' });
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
export async function endThroughCountdown(page: Page): Promise<void> {
  await page.locator(TIMER_END).click();
  await page.locator('.ending').waitFor();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'end now' }).click();
  await page.locator('.results').waitFor();
}

/** Finishes every running animation (the tabulating fade, the results fade-in, the replay), as if their time had passed. */
export async function finishResults(page: Page): Promise<void> {
  await page.locator('.results .action').first().waitFor();
  await page.evaluate(async () => {
    for (let round = 0; round < 3; round += 1) {
      const running = document.getAnimations().filter((animation) => !(animation instanceof CSSAnimation));
      for (const animation of running) animation.finish();
      // Let finish handlers (which cancel spent animations and remove masks) run. The page's timers
      // may be held by the test clock, so only promises are awaited.
      await Promise.allSettled(running.map((animation) => animation.finished));
      await Promise.resolve();
    }
  });
}
