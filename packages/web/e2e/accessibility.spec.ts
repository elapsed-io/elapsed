/**
 * Release 1 hardening: accessibility against WCAG 2.2 AA (plan, Release 1,
 * round 8). Automated rules from axe-core on every screen and settings
 * category, plus what rules cannot see: keyboard order and focus, the focus
 * trap, shortcuts while typing, the time on request, 44 px tap targets,
 * reflow at 320 px and at 200 % zoom, and reduced motion.
 *
 * axe runs with the page's CSP bypassed (its own script is injected); every
 * other suite runs under the real CSP.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, SECOND, endThroughCountdown, finishResults, openApp, settle } from './helpers.ts';

const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const primary = (page: Page) => page.locator('.screen > .controls .button--primary');

interface Finding {
  readonly id: string;
  readonly impact: string | null | undefined;
  readonly targets: readonly string[];
}

/** The WCAG 2.2 A and AA violations axe finds on the page as it is now. */
async function violations(page: Page): Promise<Finding[]> {
  await page.evaluate(AXE);
  await page.evaluate((tags) => {
    const scope = window as unknown as {
      axe: { run: (context: Document, options: object) => Promise<{ violations: { id: string; impact?: string | null; nodes: { target: string[] }[] }[] }> };
      __axe?: Finding[];
    };
    void scope.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] }).then((result) => {
      scope.__axe = result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, targets: violation.nodes.map((node) => node.target.join(' ')) }));
    });
  }, TAGS);
  // axe waits on timers, and the page's clock is the test's: move it on in small steps until axe is done.
  for (let step = 0; step < 400; step += 1) {
    const found = await page.evaluate(() => (window as unknown as { __axe?: Finding[] }).__axe);
    if (found !== undefined) {
      await page.evaluate(() => {
        delete (window as unknown as { __axe?: Finding[] }).__axe;
      });
      return found;
    }
    await page.clock.runFor(20);
  }
  throw new Error('axe did not finish');
}

test.describe('WCAG 2.2 AA rules (axe-core)', () => {
  test.use({ bypassCSP: true });

  test('the scan finds a planted fault (a control check, so a clean scan means something)', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.append(document.createElement('span'));
      document.body.append(button);
    });
    expect((await violations(page)).map((finding) => finding.id)).toContain('button-name');
  });

  // The four standard modes, as Release 2 ships them (analog since round 2.16's pass).
  for (const mode of ['digits', 'ring', 'timeline', 'analog']) {
    test(`the timer in ${mode}: idle, running, paused, a check-in waiting`, async ({ page }) => {
      await openApp(page, { mode });
      await settle(page);
      expect(await violations(page), 'idle').toEqual([]);
      await primary(page).click();
      await page.clock.runFor(84 * MINUTE);
      await settle(page);
      expect(await violations(page), 'running').toEqual([]);
      await primary(page).click();
      await page.clock.runFor(4 * MINUTE);
      await settle(page);
      expect(await violations(page), 'paused').toEqual([]);
      await primary(page).click();
      await page.clock.runFor(2 * 60 * MINUTE);
      await settle(page);
      expect(await violations(page), 'check-in').toEqual([]);
    });
  }

  for (const theme of ['graphite', 'paper', 'sky', 'plum']) {
    test(`the ending countdown and the results in ${theme}`, async ({ page }) => {
      await openApp(page, { settings: { theme, mode: theme === 'sky' ? 'ring' : 'digits' } });
      await primary(page).click();
      await page.clock.runFor(42 * MINUTE);
      await page.locator('.screen > .controls .button--end').click();
      await page.locator('.ending').waitFor();
      expect(await violations(page), 'ending').toEqual([]);
      await page.getByRole('button', { name: 'end now' }).click({ delay: 400 });
      await finishResults(page);
      await settle(page);
      expect(await violations(page), 'results').toEqual([]);
    });
  }

  // Round 2.16: the idle screen with each tip (the fullscreen tip before a first session, the seconds tip after).
  for (const [tip, notices] of [
    ['fullscreen', null],
    ['seconds', '{"schema":2,"dismissed":[],"firstSession":true}'],
  ] as const) {
    test(`the idle screen with the ${tip} tip`, async ({ page }) => {
      await page.addInitScript((record) => {
        localStorage.removeItem('notices');
        if (record !== null) localStorage.setItem('notices', record);
        // A page that can go fullscreen, as on a computer, whatever the test browser says.
        Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => true, configurable: true });
      }, notices);
      await openApp(page, { settings: { theme: 'paper' } });
      await expect(page.locator('.pill')).toContainText(tip === 'fullscreen' ? 'fullscreen hides your other tabs' : 'seconds can fade out');
      await settle(page);
      expect(await violations(page)).toEqual([]);
    });
  }

  // Round 2.16: the site's plain pages, served by the app, in a dark and a light theme.
  for (const path of ['/privacy', '/terms', '/credits/']) {
    for (const theme of ['graphite', 'sand']) {
      test(`${path} in ${theme}`, async ({ page }) => {
        await page.addInitScript((chosen) => {
          localStorage.setItem('settings', JSON.stringify({ schema: 4, theme: chosen }));
        }, theme);
        await page.clock.install();
        await page.goto(path);
        await page.locator('html[data-scheme]').waitFor({ state: 'attached' });
        expect(await violations(page)).toEqual([]);
      });
    }
  }

  for (const width of [1280, 390]) {
    test(`every settings category, ${String(width)} px wide`, async ({ page }) => {
      await openApp(page, { width, height: 900, settings: { theme: 'mint' } });
      await page.keyboard.press(',');
      await page.locator('.settings').waitFor();
      for (const name of ['timer', 'display', 'appearance', 'notifications', 'privacy and data', 'advanced']) {
        const row = page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });
        if (width < 720 && (await page.getByRole('button', { name: 'back to settings' }).isVisible())) await page.getByRole('button', { name: 'back to settings' }).click();
        if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
        if (name === 'advanced') await page.locator('.css-editor').waitFor();
        if (name === 'appearance') await expect(page.locator('.font-tile--loading')).toHaveCount(0);
        await settle(page);
        expect(await violations(page), name).toEqual([]);
      }
    });
  }
});

test.describe('keyboard', () => {
  test('every control on the timer is reachable in a logical order, with a visible focus ring', async ({ page }) => {
    await openApp(page);
    const order: string[] = [];
    for (let step = 0; step < 3; step += 1) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? ''));
      const ring = await page.evaluate(() => {
        const element = document.activeElement;
        if (element === null) return null;
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
      expect(ring?.style).toBe('solid');
      expect(ring?.width).toBe('2px');
      // The foreground colour: text contrast against the background in every theme.
      expect(ring?.color).toBe('rgb(236, 234, 228)');
    }
    // The settings icon, the time (read on request), then start. The account icon is not a control in Release 1.
    expect(order).toEqual(['settings', '0 seconds focused', 'start']);
  });

  test('the settings panel keeps focus inside and closes with Escape, returning focus', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await page.keyboard.press(',');
    const panel = page.locator('.settings');
    await panel.waitFor();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    for (let step = 0; step < 60; step += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.querySelector('.settings')?.contains(document.activeElement) ?? false), String(step)).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.querySelector('.settings')?.contains(document.activeElement) ?? false)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('.icon-button--settings')).toBeFocused();
  });

  test('shortcuts never fire while typing in the search box or a hex field', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await page.keyboard.press(',');
    await page.getByRole('searchbox', { name: 'search settings' }).fill('');
    await page.getByRole('searchbox', { name: 'search settings' }).pressSequentially(', e x');
    await expect(page.locator('.settings')).toBeVisible();
    await expect(primary(page)).toHaveAccessibleName('start');
    await page.getByRole('searchbox', { name: 'search settings' }).fill('');
    await page.locator('.settings__row', { hasText: /^appearance$/ }).click();
    await page.getByRole('textbox', { name: 'accent hex code' }).pressSequentially(' e,');
    await expect(page.locator('.settings')).toBeVisible();
    await expect(primary(page)).toHaveAccessibleName('start');
  });
});

test.describe('screen readers', () => {
  test('the time is read on request in words, never announced; paused, the pause length is read instead', async ({ page }) => {
    // What is read follows what is shown; with seconds blurring away (a choice), the ones digit goes after 10 s.
    await openApp(page, { settings: { hideSeconds: 'blur-away' } });
    const time = page.locator('.time--main');
    await expect(time).toHaveAttribute('role', 'timer');
    await expect(time).toHaveAttribute('aria-label', '0 seconds focused');
    await primary(page).click();
    await page.clock.runFor(8 * SECOND);
    await expect(time).toHaveAttribute('aria-label', '8 seconds focused');
    // It speaks what is shown: from 10 s the ones digit has blurred away.
    await page.clock.runFor(34 * SECOND);
    await expect(time).toHaveAttribute('aria-label', '40 seconds focused');
    await page.clock.runFor(83 * MINUTE + 18 * SECOND);
    await expect(time).toHaveAttribute('aria-label', '1 hour 24 minutes focused');
    // A timer's label is read when asked for: role timer is never a live announcement.
    expect(await time.getAttribute('aria-live')).toBeNull();
    await primary(page).click();
    await page.clock.runFor(4 * MINUTE + 12 * SECOND);
    await expect(page.locator('.time--paused-for')).toHaveAttribute('aria-label', 'paused for 4 minutes 12 seconds. 1 hour 24 minutes focused');
    await expect(page.locator('.time-stack__body')).toHaveAttribute('aria-hidden', '');
    expect(await time.getAttribute('tabindex')).toBe('-1');
  });
});

/** Every visible control's hit area: its box, grown by an invisible ::before tap area when it has one. */
async function hitAreas(page: Page): Promise<{ name: string; width: number; height: number }[]> {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll<HTMLElement>('button, a[href], input:not([type="file"]), textarea, select, [role="radio"], [role="switch"], [tabindex="0"]')];
    return controls
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' && element.closest('[hidden], [aria-hidden="true"]') === null)
      .map((element) => {
        const box = element.getBoundingClientRect();
        const before = getComputedStyle(element, '::before');
        const tap = before.content !== 'none' && before.position === 'absolute' ? { width: Number.parseFloat(before.width), height: Number.parseFloat(before.height) } : { width: 0, height: 0 };
        const name = element.getAttribute('aria-label') ?? element.textContent.trim();
        return { name: `${element.tagName.toLowerCase()} ${name}`.slice(0, 60), width: Math.max(box.width, tap.width), height: Math.max(box.height, tap.height) };
      });
  });
}

test.describe('touch', () => {
  // Playwright cannot emulate a mobile viewport in Firefox; there it is a touch screen only.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: async ({ browserName }, use) => use(browserName !== 'firefox') });

  test('every tap target on the timer, the results and in settings is at least 44 px', async ({ page }) => {
    await openApp(page, { width: 390, height: 844 });
    const small = (areas: { name: string; width: number; height: number }[]) => areas.filter((area) => area.width < 43.5 || area.height < 43.5);
    expect(small(await hitAreas(page)), 'timer').toEqual([]);
    await page.locator('.icon-button--settings').tap();
    await page.locator('.settings').waitFor();
    expect(small(await hitAreas(page)), 'settings list').toEqual([]);
    for (const name of ['timer', 'display', 'appearance', 'notifications', 'privacy and data', 'advanced']) {
      await page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) }).tap();
      if (name === 'advanced') await page.locator('.css-editor').waitFor();
      expect(small(await hitAreas(page)), name).toEqual([]);
      await page.getByRole('button', { name: 'back to settings' }).tap();
    }
    await page.getByRole('button', { name: 'close' }).tap();
    await primary(page).tap();
    await page.clock.runFor(3 * MINUTE);
    await endThroughCountdown(page);
    expect(small(await hitAreas(page)), 'results').toEqual([]);
  });
});

test.describe('reflow', () => {
  for (const [label, width, height] of [
    ['320 px wide', 320, 640],
    ['200 % zoom of a 1280 × 800 window', 640, 400],
  ] as const) {
    test(`at ${label}, nothing scrolls sideways or is cut off`, async ({ page }) => {
      await openApp(page, { width, height });
      const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const clipped = () =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('.time--main, .screen > .controls .button, .icon-button--settings')]
            .filter((element) => element.getClientRects().length > 0)
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return box.left < 0 || box.right > window.innerWidth;
            })
            .map((element) => element.className),
        );
      expect(await sideways(), 'idle').toBeLessThanOrEqual(0);
      expect(await clipped(), 'idle').toEqual([]);
      await primary(page).click();
      await page.clock.runFor(83 * MINUTE);
      expect(await sideways(), 'running').toBeLessThanOrEqual(0);
      await page.keyboard.press(',');
      await page.locator('.settings').waitFor();
      for (const name of ['timer', 'appearance', 'advanced']) {
        if (await page.getByRole('button', { name: 'back to settings' }).isVisible()) await page.getByRole('button', { name: 'back to settings' }).click();
        await page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) }).click();
        if (name === 'advanced') await page.locator('.css-editor').waitFor();
        expect(await sideways(), name).toBeLessThanOrEqual(0);
        expect(await page.locator('.settings').evaluate((panel) => panel.scrollWidth - panel.clientWidth), name).toBeLessThanOrEqual(0);
      }
      await page.keyboard.press('Escape');
      await endThroughCountdown(page);
      expect(await sideways(), 'results').toBeLessThanOrEqual(0);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'dark', reducedMotion: 'reduce' });

  test('nothing blurs or turns in motion: the seconds cut out, the pause crossfades, the ring steps', async ({ page }) => {
    await openApp(page, { mode: 'ring' });
    await primary(page).click();
    await page.clock.runFor(2 * MINUTE);
    const transitions = await page.evaluate(() => ({
      rotor: getComputedStyle(document.querySelector('.ring__rotor') ?? document.body).transitionProperty,
      rotorDuration: getComputedStyle(document.querySelector('.ring__rotor') ?? document.body).transitionDuration,
      body: getComputedStyle(document.querySelector('.time-stack__body') ?? document.body).transitionProperty,
    }));
    expect(transitions.rotor === 'none' || transitions.rotorDuration === '0s').toBe(true);
    expect(transitions.body).toBe('opacity');
    // The blur-away uses the cut keyframes, which change only opacity and position.
    const names = await page.evaluate(() => document.getAnimations().map((animation) => (animation instanceof CSSAnimation ? animation.animationName : '')).filter((name) => name !== ''));
    expect(names.some((name) => name.includes('blur'))).toBe(false);
  });
});
