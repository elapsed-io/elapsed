/**
 * Release 1 hardening: performance over a long session (plan, round 8;
 * Infrastructure > Performance requirements). A simulated two-hour session
 * on the test's clock: one scheduler and never more than one pending timer;
 * in a hidden tab nothing is drawn, and the only wake-up is the heartbeat
 * every 30 s, which also updates the tab title; on return the display catches
 * up at once; and memory and the page's size stay flat.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, T0 } from './helpers.ts';

/** Counts timers and wake-ups, and lets the test hide and show the tab. Runs after the test clock is installed. */
async function instrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    const active = new Set<number>();
    const wakes: number[] = [];
    let most = 0;
    const set = window.setTimeout.bind(window);
    const clear = window.clearTimeout.bind(window);
    const wrapped = (callback: () => void, delay?: number): number => {
      const id = set(() => {
        active.delete(id);
        wakes.push(Date.now());
        callback();
      }, delay);
      active.add(id);
      most = Math.max(most, active.size);
      return id;
    };
    window.setTimeout = wrapped as unknown as typeof window.setTimeout;
    window.clearTimeout = ((id: number) => {
      active.delete(id);
      clear(id);
    }) as typeof window.clearTimeout;
    let hidden = false;
    Object.defineProperty(document, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible'), configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
    scope['__perf'] = {
      wakes,
      pending: () => active.size,
      most: () => most,
      hide: (value: boolean) => {
        hidden = value;
        document.dispatchEvent(new Event('visibilitychange'));
      },
    };
  });
}

interface Perf {
  readonly wakes: number[];
  pending(): number;
  most(): number;
  hide(value: boolean): void;
}

const wakes = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __perf: Perf }).__perf.wakes.length);
const most = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __perf: Perf }).__perf.most());
const pending = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __perf: Perf }).__perf.pending());
const hide = (page: Page, hidden: boolean): Promise<void> =>
  page.evaluate((value) => {
    (window as unknown as { __perf: Perf }).__perf.hide(value);
  }, hidden);

test.describe('wakes', () => {
  // The suite's pointer moves (e2e/test.ts) would wake the focus view's wait every few seconds, and the heartbeat
  // joins nearby wakes: this test counts wakes, so it leaves the page untouched, as a person away from it would.
  test.use({ awake: false });

  test('a two-hour session: one timer at a time, nothing drawn while hidden, the display caught up on return', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 });
    await page.clock.install({ time: T0 });
    await instrument(page);
    await page.goto('/');
    await page.locator('.button--primary').click();
    await page.clock.runFor(5 * MINUTE);

    // Hidden for 110 minutes: count what wakes and what is drawn.
    await page.evaluate(() => {
      const scope = window as unknown as { __drawn: number };
      scope.__drawn = 0;
      new MutationObserver((records) => {
        scope.__drawn += records.length;
      }).observe(document.querySelector('.mode-root') ?? document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    });
    const before = await wakes(page);
    await hide(page, true);
    const titles: string[] = [];
    for (let minute = 0; minute < 110; minute += 1) {
      await page.clock.runFor(MINUTE);
      titles.push(await page.title());
    }
    // The only wake is the heartbeat, every 30 s (plan, Performance requirements > One scheduler), which also
    // updates the title: two a minute, never closer together.
    const times = await page.evaluate((from) => (window as unknown as { __perf: Perf }).__perf.wakes.slice(from), before);
    expect(times.length).toBeLessThanOrEqual(110 * 2 + 1);
    expect(times.length).toBeGreaterThanOrEqual(110 * 2 - 1);
    const gaps = times.slice(1).map((time, index) => time - (times[index] ?? 0));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(29_000);
    expect(await page.evaluate(() => (window as unknown as { __drawn: number }).__drawn)).toBe(0);
    // The title kept up: it is what a background tab shows.
    expect(titles.at(-1)).toBe('01:55 · elapsed');
    expect(await most(page)).toBe(1);

    // Seen again: the display shows the right time at once.
    await hide(page, false);
    await expect(page.locator('.time--main')).toHaveAttribute('aria-label', '1 hour 55 minutes focused');
    await page.clock.runFor(10 * SECOND);
    expect(await pending(page)).toBe(1);
  });
});

test('memory and the page stay flat over two hours', async ({ page, browserName }) => {
  // The heap is measured through the Chrome DevTools Protocol, which only Chromium has.
  test.skip(browserName !== 'chromium', 'heap measurement needs the Chrome DevTools Protocol');
  await page.setViewportSize({ width: 720, height: 450 });
  await page.clock.install({ time: T0 });
  await page.goto('/');
  await page.locator('.button--primary').click();
  const cdp = await page.context().newCDPSession(page);
  const measure = async (): Promise<{ heap: number; nodes: number }> => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    const nodes = await page.evaluate(() => document.getElementsByTagName('*').length);
    return { heap: usedSize, nodes };
  };
  await page.clock.runFor(10 * MINUTE);
  const early = await measure();
  for (let step = 0; step < 11; step += 1) await page.clock.runFor(10 * MINUTE);
  const late = await measure();
  expect(late.nodes).toBe(early.nodes);
  // Allow for the engine's own bookkeeping; a leak per wake would grow by megabytes over 2 hours.
  expect(late.heap - early.heap).toBeLessThan(512 * 1024);
});
