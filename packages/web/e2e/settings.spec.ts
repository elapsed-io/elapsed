/**
 * Rounds 6 and 7: the settings panel, against its six frames and in use, under the
 * real CSP. Settings apply live, persist, reach other tabs, and stay on the
 * device; fonts load only when needed; notifications and crash reports
 * follow their switches.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { FONT, MINUTE, SECOND, endThroughCountdown, finishResults, openApp, seedSettings, settle } from './helpers.ts';
import { FRAME_FONTS, SETTINGS_FRAME_HEIGHT, settingsFrame } from './fixtures/settings-frames.ts';
import type { Palette, SettingsFrameName } from './fixtures/settings-frames.ts';
import { GRAPHITE, PAPER } from './fixtures/frames.ts';
import { diffPngs, expectLikeFrame } from './pixels.ts';

const PANEL = { x: 840, width: 440 };
const primary = (page: Page) => page.locator('.button--primary');
const panel = (page: Page) => page.locator('.settings');
const row = (page: Page, name: string) => page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press(',');
  await panel(page).waitFor();
}

async function openCategory(page: Page, name: string): Promise<void> {
  if ((await row(page, name).getAttribute('aria-expanded')) !== 'true') await row(page, name).click();
}

function choiceFont(id: string, name = `${id}.name.woff2`): Buffer {
  return readFileSync(fileURLToPath(new URL(`../src/assets/fonts/choices/${id}/${name}`, import.meta.url)));
}

type Clip = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

async function frameReference(browser: Browser, name: SettingsFrameName, palette: Palette, storage?: string, clip?: Clip): Promise<Buffer> {
  const height = SETTINGS_FRAME_HEIGHT[name];
  const reference = await browser.newPage({ viewport: { width: 1280, height } });
  await reference.route('http://frame.test/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/font.woff2')) return route.fulfill({ body: FONT, contentType: 'font/woff2' });
    const preview = /\/preview\/([a-z-]+)\.woff2$/.exec(url)?.[1];
    if (preview !== undefined && Object.values(FRAME_FONTS).includes(preview)) return route.fulfill({ body: choiceFont(preview), contentType: 'font/woff2' });
    const full = /\/full\/([a-z-]+)-(\d+)\.woff2$/.exec(url);
    if (full?.[1] !== undefined && Object.values(FRAME_FONTS).includes(full[1])) return route.fulfill({ body: choiceFont(full[1], `${full[1]}-${full[2] ?? ''}.woff2`), contentType: 'font/woff2' });
    return route.fulfill({ body: settingsFrame(name, palette, storage), contentType: 'text/html' });
  });
  await reference.goto('http://frame.test/');
  await reference.evaluate(() => document.fonts.ready);
  const image = await reference.screenshot({ clip: clip ?? { ...PANEL, y: 0, height } });
  await reference.close();
  return image;
}

/** The custom CSS the advanced frame shows in its editor: five lines, then two empty ones. */
export const FRAME_CSS = '/* your custom css */\n.time {\n  letter-spacing: -0.02em;\n  color: #f2c46b;\n}\n\n';

/**
 * Shows the panel as the frames draw it: after a change (so "saved" shows),
 * with `name` open. The saved check is held at full opacity, and the panel is
 * painted afresh once: tiles re-rastered piecemeal while it opened can differ
 * from a fresh paint by a few levels of anti-aliasing. The advanced frame has
 * custom CSS typed in the editor and the reset-all confirm step open.
 */
async function showLikeFrame(page: Page, name: SettingsFrameName): Promise<void> {
  await openPanel(page);
  await openCategory(page, 'timer');
  await page.getByRole('radio', { name: 'always' }).click();
  await page.getByRole('radio', { name: 'blur away' }).click();
  await openCategory(page, name === 'privacy' ? 'privacy and data' : name);
  if (name === 'appearance') await expect(page.locator('.font-tile--loading')).toHaveCount(0);
  if (name === 'advanced') {
    await page.getByLabel('custom css').fill(FRAME_CSS);
    await page.getByRole('button', { name: 'reset all settings' }).click();
  }
  await page.evaluate(() => document.fonts.ready);
  // The appearance frame's panel runs past its 1040 px (the frame clips its footer's links there); the
  // site's panel would scroll instead, and Chromium draws a scrolling panel's tiles a few levels differently.
  // A window exactly as tall as the panel's content lays it out the same without scrolling, before the fresh
  // paint below; comparisons stay clipped to the frame's height.
  const needed = await panel(page).evaluate((element) => element.scrollHeight);
  if (needed > SETTINGS_FRAME_HEIGHT[name]) {
    await page.setViewportSize({ width: 1280, height: needed });
    await expect(panel(page)).not.toHaveAttribute('data-overflow');
  }
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    const saved = document.querySelector<HTMLElement>('.settings__saved');
    for (const animation of saved?.getAnimations() ?? []) animation.cancel();
    saved?.style.setProperty('opacity', '1');
    // Paint the panel afresh: take it out of the page and put it back.
    const panel = document.querySelector<HTMLElement>('.settings');
    panel?.style.setProperty('display', 'none');
    panel?.getBoundingClientRect();
    panel?.style.removeProperty('display');
  });
  // Let the browser draw at least one new frame (the page's own clock is held, so this waits in real time).
  await page.waitForTimeout(100);
}

test.describe('the panel matches its frames', () => {
  for (const name of ['timer', 'display', 'notifications', 'appearance', 'advanced'] as const) {
    test(`with ${name} open`, async ({ page, browser, browserName }) => {
      await openApp(page, { width: 1280, height: SETTINGS_FRAME_HEIGHT[name] });
      await showLikeFrame(page, name);
      const site = await page.screenshot({ clip: { ...PANEL, y: 0, height: SETTINGS_FRAME_HEIGHT[name] } });
      const reference = await frameReference(browser, name, GRAPHITE);
      const diff = await diffPngs(page, site, reference);
      expectLikeFrame(diff, browserName, () => {
        expect(diff.differing, JSON.stringify(diff)).toBe(0);
      });
    });
  }

  // Tester report: the ring tile showed a filled arc, not the ring's trail. Both display frames draw it as the
  // ring itself: a faint track, a short accent tail fading toward its far end, and the round head.
  for (const [theme, palette] of [
    ['graphite', GRAPHITE],
    ['paper', PAPER],
  ] as const) {
    test(`the ring tile matches the display frame's, in ${theme}`, async ({ page, browser, browserName }) => {
      await openApp(page, { width: 1280, height: SETTINGS_FRAME_HEIGHT.display, settings: { theme } });
      await showLikeFrame(page, 'display');
      const box = await page.getByRole('radio', { name: 'ring' }).boundingBox();
      if (box === null) throw new Error('no ring tile');
      const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
      // The tile draws the track, ten fading arcs and the head, never one solid arc.
      const shapes = await page.getByRole('radio', { name: 'ring' }).evaluate((tile) => ({ arcs: tile.querySelectorAll('path').length, circles: tile.querySelectorAll('circle').length }));
      expect(shapes).toEqual({ arcs: 10, circles: 2 });
      const site = await page.screenshot({ clip });
      const diff = await diffPngs(page, site, await frameReference(browser, 'display', palette, undefined, clip));
      expectLikeFrame(diff, browserName, () => {
        expect(diff.differing, JSON.stringify(diff)).toBe(0);
      });
    });
  }

  test('with privacy and data open, a font file stored', async ({ page, browser, browserName }) => {
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'appearance');
    await page.locator('.font-tiles__file').setInputFiles({ name: 'mine.woff2', mimeType: 'font/woff2', buffer: FONT });
    await expect(page.getByRole('radio', { name: 'your font' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: 'archivo' }).click();
    await page.keyboard.press(',');
    await showLikeFrame(page, 'privacy');
    await expect(page.locator('.setting__value')).toHaveText('your font · 23 KB');
    const site = await page.screenshot({ clip: { ...PANEL, y: 0, height: 800 } });
    const diff = await diffPngs(page, site, await frameReference(browser, 'privacy', GRAPHITE, 'your font · 23 KB'));
    expectLikeFrame(diff, browserName, () => {
      expect(diff.differing, JSON.stringify(diff)).toBe(0);
    });
  });
});

test.describe('opening and closing', () => {
  test('opens from the settings icon and with comma, beside the timer, and closes with its button, Escape and comma', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    const icon = page.locator('.icon-button--settings');
    await icon.click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveAttribute('role', 'dialog');
    // The timer moves into the space beside the panel; the corner icons step aside.
    const box = await page.locator('.mode-root').boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0) / 2).toBeCloseTo(420, 0);
    await expect(page.locator('.corner')).toBeHidden();
    await page.getByRole('button', { name: 'close' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(icon).toBeFocused();
    await openPanel(page);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await openPanel(page);
    await page.keyboard.press(',');
    await expect(panel(page)).toBeHidden();
  });

  test('loads its code only when first opened, and opens over a running session without disturbing it', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
    });
    await openApp(page, { width: 1280, height: 800 });
    expect(scripts.some((path) => path.includes('/assets/panel-'))).toBe(false);
    await primary(page).click();
    await page.clock.runFor(MINUTE);
    await openPanel(page);
    expect(scripts.some((path) => path.includes('/assets/panel-'))).toBe(true);
    // Space on a button in the panel presses that button, not the timer.
    await openCategory(page, 'timer');
    await page.getByRole('radio', { name: 'never' }).focus();
    await page.keyboard.press('Space');
    await expect(primary(page)).toHaveAccessibleName('pause');
  });
});

test.describe('changes', () => {
  test('apply at once, save, show the saved check, survive a reload and reach other tabs', async ({ page, context }) => {
    await openApp(page, { width: 1280, height: 800 });
    const other = await context.newPage();
    await other.goto('/');
    await other.locator('.button--primary').waitFor();
    await openPanel(page);
    await openCategory(page, 'appearance');
    await page.getByRole('radio', { name: 'paper' }).click();
    await expect(page.locator('.settings__saved')).toHaveText('saved');
    const background = (target: Page) => target.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await background(page)).toBe('rgb(246, 245, 242)');
    await expect.poll(() => background(other)).toBe('rgb(246, 245, 242)');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ schema: 1, theme: 'paper' });
    await page.reload();
    await page.locator('.button--primary').waitFor();
    expect(await background(page)).toBe('rgb(246, 245, 242)');
    // Back to every default: nothing is stored.
    await openPanel(page);
    await openCategory(page, 'appearance');
    await page.getByRole('button', { name: 'reset appearance settings' }).click();
    expect(await background(page)).toBe('rgb(14, 15, 17)');
    expect(await page.evaluate(() => localStorage.getItem('settings'))).toBeNull();
  });

  test('theme colors change the derived colours and leave no preset selected', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'appearance');
    const hex = page.getByRole('textbox', { name: 'accent hex code' });
    await hex.fill('#AA3355');
    await hex.press('Enter');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim())).toBe('#aa3355');
    await expect(page.locator('.theme-card[aria-checked="true"]')).toHaveCount(0);
    await hex.fill('not a colour');
    await hex.press('Enter');
    await expect(hex).toHaveValue('#aa3355');
    await page.getByRole('radio', { name: 'graphite' }).click();
    await expect(hex).toHaveValue('#35764e');
  });

  test('search shows only matching settings, in their categories', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await page.getByRole('searchbox', { name: 'search settings' }).fill('clock');
    await expect(page.locator('.settings__row:visible')).toHaveText(['appearance']);
    await expect(page.getByText('clock format')).toBeVisible();
    await expect(page.getByText('theme colors')).toBeHidden();
    await page.getByRole('searchbox', { name: 'search settings' }).fill('zzzz');
    await expect(page.locator('.settings__row:visible')).toHaveCount(0);
    await expect(page.getByText('no settings match')).toBeVisible();
    await page.getByRole('searchbox', { name: 'search settings' }).fill('');
    await expect(page.locator('.settings__row:visible')).toHaveCount(6);
  });

  test('the display mode switches live, and the session records it', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await primary(page).click();
    await page.clock.runFor(MINUTE);
    await openPanel(page);
    await openCategory(page, 'display');
    await page.getByRole('radio', { name: 'ring' }).click();
    await expect(page.locator('.ring')).toBeVisible();
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ring');
    const modes = await page.evaluate(() => (JSON.parse(localStorage.getItem('timer.active') ?? '{}') as { session: { modes: { mode: string }[] } }).session.modes.map((span) => span.mode));
    expect(modes).toEqual(['digits', 'ring']);
  });

  test('seconds can always show, or never show', async ({ page }) => {
    await openApp(page, { settings: { seconds: 'always' } });
    await primary(page).click();
    await page.clock.runFor(2 * MINUTE + 5 * SECOND);
    await settle(page);
    await expect.poll(() => page.locator('.time--main').evaluate((element) => (element as HTMLElement).innerText)).toBe('00:02:05');
    await page.evaluate(() => {
      localStorage.setItem('settings', JSON.stringify({ schema: 1, seconds: 'never' }));
    });
    await page.reload();
    await page.locator('.button--primary').waitFor();
    // The seconds are in the text but not shown.
    await expect.poll(() => page.locator('.time--main').evaluate((element) => (element as HTMLElement).innerText)).toBe('00:02');
  });

  test('time size scales the time and its gap only', async ({ page }) => {
    await openApp(page, { width: 720, height: 450, settings: { timeSize: 150 } });
    const size = await page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontSize);
    expect(size).toBe('156px');
    const button = await primary(page).boundingBox();
    expect(button?.height).toBe(24);
  });

  test('clock format sets clock times', async ({ page }) => {
    await openApp(page, { width: 720, height: 520, settings: { clockFormat: '12h' } });
    await primary(page).click();
    await page.clock.runFor(2 * MINUTE);
    await endThroughCountdown(page);
    await finishResults(page);
    await expect(page.locator('.stat', { hasText: 'started' })).toContainText(/\d{1,2}:\d{2} (am|pm)/);
  });
});

test.describe('the session rules', () => {
  test('a shorter check-in interval applies from the next sign of presence, never as a missed check-in', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await primary(page).click();
    await page.clock.runFor(110 * MINUTE);
    await openPanel(page);
    await openCategory(page, 'timer');
    const slider = page.getByRole('slider', { name: 'check-in every' });
    await slider.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.slider__value').first()).toHaveText('30m');
    await page.keyboard.press('Escape');
    await page.clock.runFor(MINUTE);
    await expect(primary(page)).toHaveAccessibleName('pause');
    await expect(page.locator('.check-in')).not.toHaveClass(/overlay--shown/);
    await page.clock.runFor(9 * MINUTE);
    await expect(page.locator('.check-in')).toHaveClass(/overlay--shown/);
    await page.mouse.click(10, 10);
    await page.clock.runFor(30 * MINUTE);
    await expect(page.locator('.check-in')).toHaveClass(/overlay--shown/);
  });

  test('a 5-minute pause limit ends a longer pause', async ({ page }) => {
    await openApp(page, { width: 720, height: 520, settings: { pauseLimit: 5 * MINUTE } });
    await primary(page).click();
    await page.clock.runFor(2 * MINUTE);
    await primary(page).click();
    await page.clock.runFor(5 * MINUTE + SECOND);
    await page.locator('.results').waitFor();
  });
});

test.describe('fonts', () => {
  test('name previews load when appearance opens; a font downloads only when chosen, from the site itself', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fonts.push(new URL(request.url()).pathname);
    });
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'timer');
    expect(fonts.filter((path) => !path.includes('timer-sans'))).toEqual([]);
    await openCategory(page, 'appearance');
    await expect(page.locator('.font-tile--loading')).toHaveCount(0);
    expect(fonts.filter((path) => path.includes('.name-'))).toHaveLength(12);
    expect(fonts.filter((path) => !path.includes('.name-') && !path.includes('timer-sans'))).toEqual([]);
    await page.getByRole('radio', { name: 'jetbrains mono' }).click();
    await expect.poll(() => page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('elapsed-jetbrains-mono');
    expect(fonts.filter((path) => /\/assets\/jetbrains-mono-/.test(path))).toHaveLength(1);
    // The panel itself stays in the default font.
    expect(await panel(page).evaluate((element) => getComputedStyle(element).fontFamily)).toContain('Timer Sans');
    await page.reload();
    await page.locator('.button--primary').waitFor();
    await expect.poll(() => page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('elapsed-jetbrains-mono');
  });

  test('your own font is checked, kept on the device, listed, and removed by clear device data', async ({ page }) => {
    const uploads: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') uploads.push(request.url());
    });
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'appearance');
    await openCategory(page, 'privacy and data');
    await expect(page.locator('.setting__value')).toHaveText('nothing stored');
    // Looking for a stored file creates no database.
    expect(await page.evaluate(async () => (await indexedDB.databases()).map((info) => info.name))).toEqual([]);
    await openCategory(page, 'appearance');
    const file = page.locator('.font-tiles__file');
    const note = page.locator('.font-tiles ~ .setting__help');
    await file.setInputFiles({ name: 'big.woff2', mimeType: 'font/woff2', buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 1) });
    await expect(note).toHaveText('that file is over 2 MB. it was not loaded.');
    await file.setInputFiles({ name: 'font.woff2', mimeType: 'font/woff2', buffer: Buffer.from('<svg onload=alert(1)>'.padEnd(64, ' ')) });
    await expect(note).toHaveText('that file isn’t a woff2, woff, ttf or otf font. it was not loaded.');
    const broken = Buffer.from(FONT);
    broken.fill(0, 48);
    await file.setInputFiles({ name: 'broken.woff2', mimeType: 'font/woff2', buffer: broken });
    await expect(note).toHaveText('this browser couldn’t read that font. it was not loaded.');
    await file.setInputFiles({ name: 'mine.woff2', mimeType: 'font/woff2', buffer: choiceFont('dm-mono', 'dm-mono-400.woff2') });
    await expect(page.getByRole('radio', { name: 'your font' })).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('elapsed-own');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ font: 'own' });
    // Nothing was sent anywhere, and settings hold only the choice, not the file.
    expect(uploads.filter((url) => !url.endsWith('/api/count'))).toEqual([]);
    expect((await page.evaluate(() => localStorage.getItem('settings')))?.length).toBeLessThan(400);

    await page.reload();
    await page.locator('.button--primary').waitFor();
    await expect.poll(() => page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('elapsed-own');
    await openPanel(page);
    await openCategory(page, 'privacy and data');
    await expect(page.locator('.setting__value')).toHaveText('your font · 13 KB');
    await page.getByRole('button', { name: 'clear device data' }).click();
    await page.getByRole('group', { name: 'clear device data' }).getByRole('button', { name: 'clear', exact: true }).click();
    await expect(page.locator('.setting__value')).toHaveText('nothing stored');
    expect(await page.evaluate(() => localStorage.getItem('settings'))).toBeNull();
    await expect.poll(() => page.locator('.time--main').evaluate((element) => getComputedStyle(element).fontFamily)).not.toContain('elapsed-own');
  });
});

test.describe('privacy and data', () => {
  test('usage counts stop when switched off', async ({ page }) => {
    const counts: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/count')) counts.push(request.url());
    });
    await openApp(page, { width: 1280, height: 800, settings: { usageCounts: false } });
    await primary(page).click();
    await page.clock.runFor(SECOND);
    expect(counts).toEqual([]);
    await openPanel(page);
    await openCategory(page, 'privacy and data');
    await expect(page.getByRole('switch', { name: 'anonymous usage counts' })).toHaveAttribute('aria-checked', 'false');
  });

  test('crash reports are sent only when switched on, scrubbed, to the site itself', async ({ page, browserName }) => {
    const reports: string[] = [];
    await page.route('**/api/crash', async (route) => {
      reports.push(route.request().postData() ?? '');
      await route.fulfill({ status: 204 });
    });
    await openApp(page, { width: 1280, height: 800 });
    // An unhandled rejection in the page; resolves once it has been dispatched, so the site's own listener
    // (added first) has run. (An error event from the test's own script names no file of the site in Firefox
    // and WebKit, and is rightly ignored there as another origin's.)
    const fail = () =>
      page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener('unhandledrejection', () => {
              resolve();
            }, { once: true });
            void Promise.reject(new TypeError('bad value "my private note" at https://evil.example/x?token=1'));
          }),
      );
    await fail();
    expect(reports).toEqual([]);
    await openPanel(page);
    await openCategory(page, 'privacy and data');
    await page.getByRole('switch', { name: 'crash reports' }).click();
    await fail();
    await expect.poll(() => reports.length).toBe(1);
    // The same error again is not sent twice.
    await fail();
    const report = JSON.parse(reports[0] ?? '{}') as Record<string, unknown>;
    expect(Object.keys(report).sort()).toEqual(['browser', 'browserVersion', 'message', 'stack', 'version']);
    expect(report['message']).toBe('TypeError: bad value "…" at [other origin]');
    expect(report['browser']).toBe({ chromium: 'chrome', firefox: 'firefox', webkit: 'safari' }[browserName]);
    expect(JSON.stringify(report)).not.toContain('private');
  });
});

test.describe('notifications', () => {
  /** The browser's permission prompt, answered as `answer` (browsers differ in what a test may grant). */
  async function promptAnswers(page: Page, answer: NotificationPermission): Promise<void> {
    await page.addInitScript((value) => {
      let permission: NotificationPermission = 'default';
      const asked: string[] = [];
      Object.defineProperty(window, '__asked', { value: asked });
      const fake = {
        get permission(): NotificationPermission {
          return permission;
        },
        requestPermission(): Promise<NotificationPermission> {
          asked.push('asked');
          permission = value;
          return Promise.resolve(value);
        },
      };
      Object.defineProperty(window, 'Notification', { value: fake, configurable: true });
    }, answer);
  }
  const asked = (page: Page) => page.evaluate(() => (window as unknown as { __asked: string[] }).__asked.length);

  test('ask for permission only when switched on', async ({ page }) => {
    await promptAnswers(page, 'granted');
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'notifications');
    expect(await asked(page)).toBe(0);
    const checkIns = page.getByRole('switch', { name: 'check-in notifications' });
    await expect(checkIns).toHaveAttribute('aria-checked', 'false');
    await checkIns.click();
    await expect(checkIns).toHaveAttribute('aria-checked', 'true');
    expect(await asked(page)).toBe(1);
    await checkIns.click();
    await expect(checkIns).toHaveAttribute('aria-checked', 'false');
  });

  test('stay off, and say so, if refused', async ({ page }) => {
    await promptAnswers(page, 'denied');
    await openApp(page, { width: 1280, height: 800 });
    await openPanel(page);
    await openCategory(page, 'notifications');
    const pauseLimit = page.getByRole('switch', { name: 'pause limit notifications' });
    await pauseLimit.click();
    await expect(page.getByText('notifications are blocked for this site in the browser’s settings')).toBeVisible();
    await expect(pauseLimit).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('phones', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('each category is its own page', async ({ page }) => {
    await page.goto('/');
    await page.locator('.button--primary').waitFor();
    await page.locator('.icon-button--settings').tap();
    await expect(page.locator('.settings__row:visible')).toHaveCount(6);
    await row(page, 'timer').tap();
    await expect(page.locator('.settings__row:visible')).toHaveText(['timer']);
    await expect(page.getByRole('slider', { name: 'pause limit' })).toBeVisible();
    await page.getByRole('button', { name: 'back to settings' }).tap();
    await expect(page.locator('.settings__row:visible')).toHaveCount(6);
    const box = await panel(page).boundingBox();
    expect(box?.width).toBe(390);
    // Nothing scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });
});

test('nothing in the panel breaks the CSP', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__violations', { value: seen });
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  await seedSettings(page, { font: 'inter', theme: 'sky' });
  await openApp(page, { width: 1280, height: 800 });
  await openPanel(page);
  for (const name of ['timer', 'display', 'notifications', 'privacy and data', 'appearance']) await openCategory(page, name);
  await expect(page.locator('.font-tile--loading')).toHaveCount(0);
  await page.locator('.font-tiles__file').setInputFiles({ name: 'mine.woff2', mimeType: 'font/woff2', buffer: FONT });
  await expect(page.getByRole('radio', { name: 'your font' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations.slice())).toEqual([]);
});
