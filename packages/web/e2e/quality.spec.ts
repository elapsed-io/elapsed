/**
 * Plan conformance in a real browser, run between rounds and in CI:
 * Principles > Appealing and fast ("controls respond within 100 ms", no
 * jumping layout) and Private (only the data the inventory lists).
 */

import { expect, test } from '@playwright/test';

test('controls respond within 100 ms, from click to the next painted frame', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const timings = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('.button--primary');
    if (button === null) throw new Error('no primary button');
    const results: number[] = [];
    for (let i = 0; i < 6; i += 1) {
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
  for (const ms of timings) expect(ms).toBeLessThan(100);
});

test('nothing shifts the layout unexpectedly, on load or while using the controls', async ({ page }) => {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    Object.defineProperty(window, '__shifts', { value: shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        // The controls row re-centres when the user presses a control; that answers their input and slides
        // smoothly, so like the Cumulative Layout Shift metric this counts only shifts nobody asked for.
        if (!entry.hadRecentInput) shifts.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const key of ['Space', 'Space', 'Space', 'e']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250);
  }
  const shifts = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts);
  expect(shifts.reduce((sum, value) => sum + value, 0)).toBe(0);
});

test('no task blocks the main thread for 50 ms while using the controls', async ({ page }) => {
  await page.addInitScript(() => {
    const tasks: number[] = [];
    Object.defineProperty(window, '__longTasks', { value: tasks });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.goto('/?mode=timeline');
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

test('stores only the open session, then the finished one in tab storage, and sets no cookies', async ({ page, context }) => {
  const stored = () =>
    page.evaluate(async () => ({
      local: Object.keys(localStorage).sort(),
      session: Object.keys(sessionStorage).sort(),
      databases: (await indexedDB.databases()).map((database) => database.name),
      caches: await caches.keys(),
    }));
  await page.goto('/');
  await page.locator('.button--primary').waitFor();
  expect(await stored()).toEqual({ local: [], session: [], databases: [], caches: [] });
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  expect(await stored()).toEqual({ local: ['timer.active', 'timer.heartbeat'], session: [], databases: [], caches: [] });
  await page.keyboard.press('e');
  await page.waitForTimeout(350);
  await page.keyboard.press('e');
  await page.locator('.results').waitFor();
  // The finished session moves to this tab's storage (plan, Guest storage).
  expect(await stored()).toEqual({ local: [], session: ['timer.finished'], databases: [], caches: [] });
  // A new session deletes it.
  await page.locator('body').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.button--primary')).toHaveAccessibleName('pause');
  expect((await stored()).session).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});
