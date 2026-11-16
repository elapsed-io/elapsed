/**
 * Plan conformance in a real browser, run between rounds and in CI:
 * Principles > Appealing and fast (no jumping layout) and Private (only the
 * data the inventory lists). The timing checks are in timing.spec.ts.
 */

import { expect, test } from '@playwright/test';

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
  // Going back to the timer deletes it; the next session then starts from the timer.
  await page.locator('body').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.button--primary')).toHaveAccessibleName('start');
  expect((await stored()).session).toEqual([]);
  await page.keyboard.press('Space');
  await expect(page.locator('.button--primary')).toHaveAccessibleName('pause');
  expect(await context.cookies()).toEqual([]);
});
