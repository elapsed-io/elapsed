/**
 * Timing (plan, Principles: "controls respond within 100 ms"; Performance:
 * "measured on a slow phone"). These tests run alone, after every other test
 * in their browser (playwright.config.ts: the "-timing" projects, one worker),
 * so nothing else competes for the processor; each starts with a warm-up and
 * is judged on the median, since one slow click among many says more about
 * the machine than the site. The first-tap test is the exception: the first
 * taps are what it measures.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { seedSettings } from './helpers.ts';

/** Clicks the primary button and measures script time and time to the next painted frame. */
function clickTimed(page: Page): Promise<{ handled: number; painted: number }> {
  return page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('.button--primary');
    if (button === null) throw new Error('no primary button');
    const start = performance.now();
    button.click();
    const handled = performance.now() - start;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    return { handled, painted: performance.now() - start };
  });
}

/** Ends the open session through the countdown and goes back to the idle timer (not measured). */
async function endAndReturn(page: Page): Promise<void> {
  await page.locator('body').focus();
  await page.keyboard.press('e');
  await page.locator('.ending').waitFor();
  await page.waitForTimeout(350);
  await page.keyboard.press('e');
  await page.locator('.results').waitFor();
  await page.getByRole('button', { name: 'back to the timer' }).click();
  await page.locator('.results').waitFor({ state: 'hidden' });
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
};

test('controls respond within 100 ms, from click to the next painted frame (median after a warm-up)', async ({ page, browserName }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const measured: Record<'start' | 'pause' | 'resume', { handled: number; painted: number }[]> = { start: [], pause: [], resume: [] };
  // One session to warm up, then five measured: start, pause and resume in each.
  for (let round = 0; round < 6; round += 1) {
    const start = await clickTimed(page);
    const pause = await clickTimed(page);
    const resume = await clickTimed(page);
    if (round > 0) {
      measured.start.push(start);
      measured.pause.push(pause);
      measured.resume.push(resume);
    }
    await endAndReturn(page);
  }
  const report = Object.entries(measured)
    .map(([control, times]) => `${control}: ${times.map(({ handled, painted }) => `${handled.toFixed(0)}/${painted.toFixed(0)}`).join(' ')}`)
    .join('; ');
  test.info().annotations.push({ type: 'script/painted ms', description: report });
  for (const [control, times] of Object.entries(measured)) {
    expect(median(times.map(({ handled }) => handled)), `${control} script: ${report}`).toBeLessThan(100);
    // Playwright's WebKit draws in software, at the Desktop Safari profile's twice the pixels, on a CI
    // machine without a GPU; Safari's painted time is measured on real devices (decision 234).
    if (browserName !== 'webkit') expect(median(times.map(({ painted }) => painted)), `${control} painted: ${report}`).toBeLessThan(100);
  }
});

test('on a processor four times slower (a low-end phone), the first taps still respond within 100 ms', async ({ page, browserName }) => {
  // The processor is slowed through the Chrome DevTools Protocol, which only Chromium has.
  test.skip(browserName !== 'chromium', 'CPU throttling needs the Chrome DevTools Protocol');
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Start, pause, resume, pause: the first of each does one-time work (the time zone is read at load).
  const timings = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('.button--primary');
    if (button === null) throw new Error('no primary button');
    const results: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const start = performance.now();
      button.click();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      results.push(performance.now() - start);
    }
    return results;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  for (const ms of timings) expect(ms, timings.map((t) => t.toFixed(1)).join(', ')).toBeLessThan(100);
});



test('no task blocks the main thread for 50 ms while using the controls', async ({ page }) => {
  await page.addInitScript(() => {
    const tasks: number[] = [];
    Object.defineProperty(window, '__longTasks', { value: tasks });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  await seedSettings(page, { mode: 'timeline' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    (window as unknown as { __longTasks: number[] }).__longTasks.length = 0;
  });
  for (const key of ['Space', 'Space', 'Space', 'e']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }
  const tasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);
  expect(tasks).toEqual([]);
});

