/**
 * The two Release 2 timer switches that ship with the launch (round 2.15; owner, answer 38): check-ins, which can be
 * switched off (the plan's warning under it), and keep screen awake ("only while elapsed is the active tab"), a
 * screen wake lock while the page is seen.
 */

import { BRAND } from '@stopwatch/core';
import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, finishResults, openApp, openSettingsOn } from './helpers.ts';

const HOUR = 60 * MINUTE;
const primary = (page: Page) => page.locator('.button--primary');
const checkIn = (page: Page) => page.locator('.check-in');
const toggleNamed = (page: Page, name: string) => page.getByRole('switch', { name });

/** Opens the timer settings, flips a switch and closes settings again. */
async function flip(page: Page, name: string): Promise<void> {
  await openSettingsOn(page, 'timer');
  await toggleNamed(page, name).click();
  await page.keyboard.press('Escape');
  await page.locator('.settings').waitFor({ state: 'hidden' });
}

test.describe('check-ins', () => {
  test('are on by default, with the plan’s warning under the switch', async ({ page }) => {
    await openApp(page, { width: 1280, height: 900 });
    await openSettingsOn(page, 'timer');
    await expect(toggleNamed(page, 'check-ins')).toHaveAttribute('aria-checked', 'true');
    const row = page.locator('[data-setting="checkIns"]');
    await expect(row.locator('.setting__help')).toHaveText('check-ins remind you that your session is still running. sessions without them still count toward your history, but not toward competitions.');
    // The warning is read with the switch.
    await expect(toggleNamed(page, 'check-ins')).toHaveAccessibleDescription('check-ins remind you that your session is still running. sessions without them still count toward your history, but not toward competitions.');
    // The Release 2 timer frame's order (plan version 14): check-in every in a darkened box under check-ins.
    await expect(page.locator('.settings__body:visible .setting__label')).toHaveText(['check-ins', 'check-in every', 'pause before ending', 'keep screen awake', 'clock format', 'shortcuts']);
    await expect(page.locator('.settings__body:visible .settings-box')).toHaveCount(1);
    await expect(page.locator('.settings__body:visible .settings-box [data-setting="checkInInterval"]')).toHaveCount(1);
    await expect(page.locator('[data-setting="pauseLimit"] .setting__help')).toHaveCount(0);
    await expect(page.locator('[data-setting="keepAwake"] .setting__help')).toHaveText('while elapsed is the active tab');
  });

  test('switched off, none falls due however long a session runs, and pause before ending still ends a long pause', async ({ page }) => {
    await openApp(page, { settings: { checkIns: false } });
    await primary(page).click();
    await page.clock.runFor(5 * HOUR);
    await expect(checkIn(page)).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('pause');
    expect(await page.title()).toBe(`05:00 · ${BRAND.name}`);
    await primary(page).click();
    await page.clock.runFor(30 * MINUTE - SECOND);
    await expect(primary(page)).toHaveAccessibleName('resume');
    await page.clock.runFor(SECOND);
    await expect(page.getByRole('button', { name: 'back to the timer' })).toBeVisible();
    await finishResults(page);
    await expect(page.locator('.results .visually-hidden')).toHaveText('05:00:00');
  });

  test('switched off during a session, the next never comes; on again, they count from that moment', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await primary(page).click();
    await page.clock.runFor(HOUR);
    await flip(page, 'check-ins');
    await page.clock.runFor(3 * HOUR);
    await expect(checkIn(page)).toBeHidden();
    // Back on four hours in: never a check-in already due, nor one missed; the next comes two hours on.
    await flip(page, 'check-ins');
    await page.clock.runFor(2 * HOUR - SECOND);
    await expect(checkIn(page)).toBeHidden();
    await page.clock.runFor(SECOND);
    await expect(checkIn(page)).toBeVisible();
    expect(await page.title()).toBe(`check in · 06:00 · ${BRAND.name}`);
  });
});

/** A wake lock the test can watch: every request and release, and whether the page holds one. */
async function watchWakeLock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: string[] = [];
    let held: { released: boolean } | null = null;
    const api = {
      request: (type: string) => {
        log.push(`request ${type} ${document.visibilityState}`);
        const listeners: (() => void)[] = [];
        const sentinel = {
          released: false,
          release: () => {
            if (!sentinel.released) log.push('release');
            sentinel.released = true;
            for (const listener of listeners) listener();
            return Promise.resolve();
          },
          addEventListener: (_type: string, listener: () => void) => {
            listeners.push(listener);
          },
        };
        held = sentinel;
        return Promise.resolve(sentinel);
      },
    };
    Object.defineProperty(Navigator.prototype, 'wakeLock', { get: () => api, configurable: true });
    // The tab's visibility, as the test sets it.
    let hidden = false;
    Object.defineProperty(document, 'visibilityState', { get: () => (hidden ? 'hidden' : 'visible'), configurable: true });
    Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
    (window as unknown as { __wake: unknown }).__wake = {
      log,
      held: () => held !== null && !held.released,
      hide: (value: boolean) => {
        hidden = value;
        document.dispatchEvent(new Event('visibilitychange'));
      },
    };
  });
}

interface Wake {
  readonly log: string[];
  held(): boolean;
  hide(value: boolean): void;
}
const wakeLog = (page: Page) => page.evaluate(() => (window as unknown as { __wake: Wake }).__wake.log);
const wakeHeld = (page: Page) => page.evaluate(() => (window as unknown as { __wake: Wake }).__wake.held());
const hideTab = (page: Page, hidden: boolean) =>
  page.evaluate((value) => {
    (window as unknown as { __wake: Wake }).__wake.hide(value);
  }, hidden);

test.describe('keep screen awake', () => {
  test('is on by default with its line, and holds the screen awake only while the tab is seen', async ({ page }) => {
    await watchWakeLock(page);
    await openApp(page, { width: 1280, height: 900 });
    await expect.poll(() => wakeHeld(page)).toBe(true);
    expect(await wakeLog(page)).toEqual(['request screen visible']);
    // Hidden, it lets go; seen again, it asks again.
    await hideTab(page, true);
    await expect.poll(() => wakeHeld(page)).toBe(false);
    await hideTab(page, false);
    await expect.poll(() => wakeHeld(page)).toBe(true);
    expect(await wakeLog(page)).toEqual(['request screen visible', 'release', 'request screen visible']);

    await openSettingsOn(page, 'timer');
    await expect(toggleNamed(page, 'keep screen awake')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-setting="keepAwake"] .setting__help')).toHaveText(`while ${BRAND.name} is the active tab`);
    // Off: let go at once, and never asked for again, seen or not.
    await toggleNamed(page, 'keep screen awake').click();
    await expect.poll(() => wakeHeld(page)).toBe(false);
    await hideTab(page, true);
    await hideTab(page, false);
    expect(await wakeLog(page)).toEqual(['request screen visible', 'release', 'request screen visible', 'release']);
    // And it stays off after a reload.
    await page.reload();
    await page.locator('html[data-ready]').waitFor({ state: 'attached' });
    expect(await wakeLog(page)).toEqual([]);
  });

  test('is allowed by the site’s Permissions-Policy, which names only camera, microphone and geolocation', async ({ page, browserName }) => {
    const response = await page.goto('/');
    const policy = response?.headers()['permissions-policy'] ?? '';
    expect(policy).toBe('camera=(), microphone=(), geolocation=()');
    expect(policy).not.toContain('screen-wake-lock');
    if (browserName === 'chromium') {
      // Chromium reports what the policy allows this document.
      const allowed = await page.evaluate(() => (document as unknown as { featurePolicy?: { allowsFeature(name: string): boolean } }).featurePolicy?.allowsFeature('screen-wake-lock'));
      expect(allowed).toBe(true);
    }
  });

  test('with the browser’s own wake lock, or none, nothing is reported and the timer runs as ever', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(MINUTE);
    await expect(primary(page)).toHaveAccessibleName('pause');
    expect(errors).toEqual([]);
  });
});
