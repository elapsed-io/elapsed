/**
 * Mode switching (plan-release-2, round 2.10, the four fixes): a mode that needs loading loads in the background
 * while the current one stays on screen, then they swap on one frame; the session's controls always win over a
 * load; a switched-away mode goes completely; switches among the core modes land on the frame of the choice; and
 * ocean depth and height keep the theme's background while they are in testing.
 */

import { expect, test } from './test.ts';
import type { CDPSession, Page } from '@playwright/test';
import { MINUTE, SECOND, TIMER_END, openApp, settle, switchTestModesOn, untilEndNowAccepts } from './helpers.ts';

const tile = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });

async function openDisplaySettings(page: Page): Promise<void> {
  if (!(await page.locator('.settings').isVisible())) await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const row = page.locator('.settings__row', { hasText: /^display$/ });
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
}

/** Holds a downloaded mode's code back until `release` is called, as a slow network would. */
async function holdDownload(page: Page, pattern: RegExp): Promise<() => void> {
  let release = (): void => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    await released;
    await route.continue();
  });
  return release;
}

test('ending a session while interstellar loads: end wins, the display never changes mid-end, and the chosen mode shows once back', async ({ page }) => {
  await switchTestModesOn(page);
  await openApp(page, { width: 1280, height: 800 });
  await page.locator('.button--primary').click();
  await page.clock.runFor(2 * MINUTE);
  const release = await holdDownload(page, /\/assets\/interstellar-[\w-]+\.js$/);
  await openDisplaySettings(page);
  await tile(page, 'interstellar').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.settings')).toBeHidden();
  // Still loading: digits stays on screen, nothing staged yet; the session already records the choice.
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  await expect(page.locator('.mode-root')).toHaveCount(1);
  // End during the load: the countdown takes the screen at once, and the load stops.
  await page.locator(TIMER_END).click();
  await untilEndNowAccepts(page);
  release();
  await page.getByRole('button', { name: 'end now' }).click();
  await page.locator('.results').waitFor();
  // Nothing of the cancelled load stayed: one mode root, no stage, digits underneath.
  await expect(page.locator('.mode-stage')).toHaveCount(0);
  await expect(page.locator('.mode-root')).toHaveCount(1);
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  // The results are the session's, replayed in the mode it showed longest: digits.
  await expect(page.locator('.results')).toHaveAttribute('data-replay', 'digits');
  // Back on the timer, the chosen mode shows, whole.
  await page.keyboard.press('Space');
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'interstellar');
  await expect(page.locator('.mode-root .sky')).toHaveCount(1);
  await expect(page.locator('.mode-stage')).toHaveCount(0);
});

test('pausing while a mode loads: the pause applies at once, and the chosen mode still arrives', async ({ page }) => {
  await switchTestModesOn(page);
  await openApp(page, { width: 1280, height: 800 });
  await page.locator('.button--primary').click();
  await page.clock.runFor(MINUTE);
  const release = await holdDownload(page, /\/assets\/tree-[\w-]{8}\.js$/);
  await openDisplaySettings(page);
  await tile(page, 'tree').click();
  await page.keyboard.press('Escape');
  await page.locator('.button--primary').click();
  await expect(page.locator('.button--primary')).toHaveAccessibleName('resume');
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  release();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'tree');
  await expect(page.locator('.mode-root .tree')).toHaveCount(1);
  // Still paused: the load never touched the session.
  await expect(page.locator('.button--primary')).toHaveAccessibleName('resume');
});

test('a switch among digits, ring and timeline lands on the frame of the choice, with no download', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { width: 1280, height: 800 });
  await openDisplaySettings(page);
  const before = scripts.length;
  for (const [name, mode, drawn] of [
    ['ring', 'ring', '.ring'],
    ['timeline', 'timeline', '.timeline'],
    ['digits', 'digits', '.time-stack'],
  ] as const) {
    // The click and the screen's change in one task: no frame passes between them.
    const same = await page.evaluate(
      ({ label, id, selector }) => {
        // A tile is its preview, then its name.
        const radio = [...document.querySelectorAll<HTMLElement>('.mode-tile')].find((element) => element.lastChild?.textContent?.trim() === label);
        if (radio === undefined) throw new Error(`no ${label} tile`);
        radio.click();
        // The next task: by then the click's own task, and the promises it settled, are done, and no frame has
        // been drawn since the click; the swap must already have happened.
        return new Promise<boolean>((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => {
            channel.port1.close();
            const shown = document.querySelector('.screen')?.getAttribute('data-mode');
            resolve(shown === id && document.querySelector(`.mode-root ${selector}`) !== null && document.querySelector('.mode-stage') === null);
          };
          channel.port2.postMessage(null);
        });
      },
      { label: name, id: mode, selector: drawn },
    );
    expect(same, name).toBe(true);
    await expect(page.locator('.mode-stage')).toHaveCount(0);
  }
  expect(scripts.slice(before)).toEqual([]);
});

for (const mode of ['ocean depth', 'height'] as const) {
  test(`${mode} keeps the theme's background at all times while in testing: no flash, no environment colours`, async ({ page }) => {
    await switchTestModesOn(page);
    await openApp(page, { width: 1280, height: 800 });
    const theme = await page.locator('.screen').evaluate((screen) => getComputedStyle(screen).backgroundColor);
    const foreground = await page.locator('.time--main').first().evaluate((time) => getComputedStyle(time).color);
    // Every change from the choice on: the screen's own background, and nothing drawn over it as an environment.
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { seen: string[] }).seen = seen;
      const screen = document.querySelector('.screen');
      const note = (): void => {
        if (screen !== null) seen.push(`${getComputedStyle(screen).backgroundColor}|${String(document.querySelectorAll('.environment').length)}`);
      };
      note();
      if (screen !== null) new MutationObserver(note).observe(screen, { subtree: true, childList: true, attributes: true });
    });
    await openDisplaySettings(page);
    await tile(page, mode).click();
    await page.keyboard.press('Escape');
    const id = mode === 'ocean depth' ? 'ocean' : 'height';
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', id);
    await page.locator('.button--primary').click();
    await page.clock.runFor(30 * MINUTE);
    await page.keyboard.press('Space');
    await page.clock.runFor(10 * SECOND);
    await settle(page);
    const seen = await page.evaluate(() => [...new Set((window as unknown as { seen: string[] }).seen)]);
    expect(seen).toEqual([`${theme}|0`]);
    await expect(page.locator('.environment')).toHaveCount(0);
    expect(await page.locator('.contrast__lit .time--main, .mode-root > .time-stack .time--main').first().evaluate((time) => getComputedStyle(time).color)).toBe(foreground);
  });
}

/**
 * Round 2.11, bug 5: started, ocean depth and height show the theme's background, the theme's colours for the time
 * and the buttons, and their depth or altitude caption updating as the session runs, in the shared layout; in a
 * dark theme and a light one.
 */
for (const [id, caption] of [
  ['ocean', /^([\d,]+) m · (sunlight|twilight|midnight|abyssal|hadal) zone$/],
  ['height', /^([\d,]+) m · [a-z ]+$/],
] as const) {
  for (const theme of ['graphite', 'paper'] as const) {
    test(`${id}, started in ${theme}: the theme's background and colours, with its caption updating as the session runs`, async ({ page, browser }) => {
      // The theme's own look, from digits in a browser context of its own (settings are stored per origin).
      const reference = await browser.newContext();
      const digits = await reference.newPage();
      await openApp(digits, { settings: { theme } });
      const expected = await digits.evaluate(() => ({
        background: getComputedStyle(document.querySelector('.screen') ?? document.body).backgroundColor,
        time: getComputedStyle(document.querySelector('.time--main') ?? document.body).color,
        start: getComputedStyle(document.querySelector('.button--primary') ?? document.body).backgroundColor,
      }));
      await reference.close();
      await openApp(page, { mode: id, settings: { theme } });
      await settle(page);
      const read = (): Promise<{ background: string; time: string; caption: string; shown: boolean; look: string; environments: number }> =>
        page.evaluate(() => {
          const element = document.querySelector('.recipe__caption');
          return {
            background: getComputedStyle(document.querySelector('.screen') ?? document.body).backgroundColor,
            time: getComputedStyle(document.querySelector('.mode-root .time--main') ?? document.body).color,
            caption: element?.textContent ?? '',
            shown: element !== null && getComputedStyle(element).visibility === 'visible' && getComputedStyle(element).opacity === '1',
            look: element === null ? '' : `${getComputedStyle(element).visibility} ${getComputedStyle(element).opacity} ${element.className}`,
            environments: document.querySelectorAll('.environment').length,
          };
        });
      expect(await page.locator('.button--primary').evaluate((button) => getComputedStyle(button).backgroundColor)).toBe(expected.start);
      await page.locator('.button--primary').click();
      const metres: number[] = [];
      for (const minutes of [1, 9, 30]) {
        await page.clock.runFor(minutes * MINUTE);
        await settle(page);
        const now = await read();
        expect(now.background).toBe(expected.background);
        expect(now.time).toBe(expected.time);
        expect(now.environments).toBe(0);
        expect(now.shown, JSON.stringify(now)).toBe(true);
        const match = caption.exec(now.caption);
        expect(match, now.caption).not.toBeNull();
        metres.push(Number((match?.[1] ?? '').replace(/,/g, '')));
      }
      // The caption follows the session: deeper or higher at every look.
      expect(metres[0]).toBeGreaterThan(0);
      expect(metres[1]).toBeGreaterThan(metres[0] ?? 0);
      expect(metres[2]).toBeGreaterThan(metres[1] ?? 0);
    });
  }
}

test('every mode follows the same mount and teardown contract: switched away, nothing of it is left', async ({ page, browserName }) => {
  await switchTestModesOn(page);
  await openApp(page, { width: 1280, height: 800 });
  await openDisplaySettings(page);
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
  /** The window's and the document's own listeners (Chromium alone can list them). */
  const listeners = async (): Promise<number> => {
    if (cdp === null) return 0;
    let count = 0;
    for (const expression of ['window', 'document']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression });
      if (result.objectId === undefined) continue;
      count += (await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId })).listeners.length;
    }
    return count;
  };
  const state = async (): Promise<{ readonly elements: number; readonly animations: number; readonly roots: number; readonly listeners: number; readonly style: string }> => ({
    ...(await page.evaluate(() => ({
      // Everything but the corner icons, whose dark copies for the contrast switch the site makes once and keeps.
      elements: document.querySelectorAll('.screen *').length - document.querySelectorAll('.screen > .corner *').length,
      // The screen's own (the settings panel's "saved" mark is the panel's).
      animations: document.getAnimations().filter((animation) => !(animation instanceof CSSTransition) && animation.effect instanceof KeyframeEffect && animation.effect.target?.closest('.screen') != null).length,
      roots: document.querySelectorAll('.mode-root, .mode-stage, .environment').length,
      style: document.querySelector('.mode-root')?.getAttribute('style') ?? '',
    }))),
    listeners: await listeners(),
  });
  await settle(page);
  const digits = await state();
  for (const [name, id] of [
    ['ring', 'ring'],
    ['timeline', 'timeline'],
    ['analog', 'analog'],
    ['ocean depth', 'ocean'],
    ['height', 'height'],
    ['tree', 'tree'],
    ['interstellar', 'interstellar'],
  ] as const) {
    await tile(page, name).click();
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', id);
    await expect(page.locator('.mode-stage')).toHaveCount(0);
    await tile(page, 'digits').click();
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    await expect(page.locator('.environment--leaving')).toHaveCount(0);
    await settle(page);
    expect(await state(), name).toEqual(digits);
  }
});

test.describe('performance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'long tasks and the heap are measured through Chromium alone');

  /** The heap in use after a full collection, in bytes. */
  async function heapAfterCollection(cdp: CDPSession): Promise<number> {
    for (let round = 0; round < 3; round += 1) await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    return usedSize;
  }

  test('switching among the test modes 20 times quickly never blocks the main thread past 50 ms, and memory returns to its baseline', async ({ page }) => {
    await switchTestModesOn(page);
    await openApp(page, { width: 1280, height: 800 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.enable');
    await page.evaluate(() => {
      const long: number[] = [];
      (window as unknown as { long: number[] }).long = long;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) long.push(entry.duration);
      }).observe({ type: 'longtask' });
    });
    await openDisplaySettings(page);
    const cycle = ['ocean depth', 'height', 'tree', 'interstellar', 'digits'] as const;
    const idOf = (name: string): string => (name === 'ocean depth' ? 'ocean' : name);
    // Once through, so every mode's code and art is fetched: what stays after is the site's cache, not a leak.
    for (const name of cycle) {
      await tile(page, name).click();
      await expect(page.locator('.screen')).toHaveAttribute('data-mode', idOf(name));
    }
    await settle(page);
    const baseline = await heapAfterCollection(cdp);
    await page.evaluate(() => {
      (window as unknown as { long: number[] }).long.length = 0;
    });
    // Twenty quick switches, each before the last has shown, ending on digits.
    for (let index = 0; index < 20; index += 1) await tile(page, cycle[index % 5] ?? 'digits').click({ delay: 0 });
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    await expect(page.locator('.mode-stage')).toHaveCount(0);
    await settle(page);
    // Every switched-away mode is gone: one root, no environment left behind, nothing of theirs still running.
    await expect(page.locator('.mode-root')).toHaveCount(1);
    await expect(page.locator('.environment')).toHaveCount(0);
    expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length)).toBe(0);
    const long = await page.evaluate(() => (window as unknown as { long: number[] }).long);
    expect(long, 'tasks longer than 50 ms').toEqual([]);
    const after = await heapAfterCollection(cdp);
    // Within 5 % (or 1 MB, whichever is more) of the baseline.
    expect(after, `heap ${String(after)} against ${String(baseline)}`).toBeLessThanOrEqual(baseline + Math.max(1024 * 1024, baseline * 0.05));
  });
});
