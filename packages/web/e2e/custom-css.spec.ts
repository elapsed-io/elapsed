/**
 * Round 7: custom CSS and the advanced category, under the real CSP. Custom
 * CSS is cleaned when saved, applies only to the timer view, never loads
 * anything, and safe mode undoes it; the malicious-CSS corpus is fully
 * neutralised. The settings file, reset all and clear device data behave as
 * the advanced frame and the owner's changes describe.
 */

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FONT, openApp, seedSettings } from './helpers.ts';
import { LOCKOUT_CSS, MALICIOUS_CSS } from './fixtures/malicious-css.ts';

const panel = (page: Page) => page.locator('.settings');
const row = (page: Page, name: string) => page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });
const editor = (page: Page) => page.getByLabel('custom css');
const timeColor = (page: Page) => page.locator('.time--main').evaluate((element) => getComputedStyle(element).color);

async function openAdvanced(page: Page): Promise<void> {
  if (!(await panel(page).isVisible())) {
    await page.keyboard.press(',');
    await panel(page).waitFor();
  }
  if ((await row(page, 'advanced').getAttribute('aria-expanded')) !== 'true') await row(page, 'advanced').click();
  await page.locator('.css-editor').waitFor();
}

async function saveCss(page: Page, css: string): Promise<void> {
  await editor(page).fill(css);
  await page.getByRole('button', { name: 'save', exact: true }).click();
}

function storedCss(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const text = localStorage.getItem('custom-css');
    return text === null ? null : (JSON.parse(text) as { css: string }).css;
  });
}

/** Stores custom CSS before the site's scripts run, as if saved earlier, bypassing the checker. */
async function seedCustomCss(page: Page, css: string): Promise<void> {
  await page.addInitScript((text) => {
    if (localStorage.getItem('custom-css') === null) localStorage.setItem('custom-css', text);
  }, JSON.stringify({ schema: 1, css }));
}

/** Records CSP violations from the first moment the document exists. */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.defineProperty(window, '__violations', { value: seen });
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __violations: string[] }).__violations.slice());
}

interface Leaks {
  /** Requests for /leak/… that reached the network (answered here), and other origins' requests that completed. */
  readonly sent: string[];
  /** Every request for another origin, even one the CSP then blocked. */
  readonly attempted: string[];
}

/** Answers and records every request for /leak/…, and records any request for another origin. */
async function watchLeaks(page: Page, origin: string): Promise<Leaks> {
  const leaks: Leaks = { sent: [], attempted: [] };
  const elsewhere = (url: string): boolean => !url.startsWith(origin) && !url.startsWith('data:');
  await page.route('**/leak/**', (route) => {
    leaks.sent.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 404, body: '' });
  });
  page.on('request', (request) => {
    if (elsewhere(request.url())) leaks.attempted.push(request.url());
  });
  page.on('requestfinished', (request) => {
    if (elsewhere(request.url())) leaks.sent.push(request.url());
  });
  return leaks;
}

/**
 * Waits until every image and font the page's styles asked for has been asked
 * for: the styles are computed and drawn (the page's own clock is held, so
 * this waits in real time).
 */
async function letStylesLoad(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Reading each element's style makes the browser resolve it, and start any load it names.
    const styles = Array.from(document.querySelectorAll('*'), (element) => getComputedStyle(element).backgroundImage);
    await document.fonts.ready;
    return styles.length;
  });
  await page.waitForTimeout(150);
}

/** Whether the settings panel is the topmost thing at its centre, and drawn. */
function panelOnTop(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.querySelector('.settings');
    if (element === null) return false;
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 60);
    const style = getComputedStyle(element);
    return hit !== null && element.contains(hit) && style.display !== 'none' && style.visibility === 'visible';
  });
}

test.describe('custom CSS', () => {
  test('applies to the timer view only, when saved, and stays on this device across reloads and tabs', async ({ page, context }) => {
    const uploads: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET' && !request.url().endsWith('/api/count')) uploads.push(request.url());
    });
    await openApp(page, { width: 1280, height: 800 });
    const other = await context.newPage();
    await other.goto('/');
    await other.locator('.button--primary').waitFor();

    await openAdvanced(page);
    const before = await timeColor(page);
    await editor(page).fill('.time { color: rgb(242, 196, 107) } .settings, .setting__label { color: rgb(255, 0, 0) }');
    // Typing alone changes nothing.
    expect(await timeColor(page)).toBe(before);
    await page.getByRole('button', { name: 'save', exact: true }).click();
    await expect.poll(() => timeColor(page)).toBe('rgb(242, 196, 107)');
    // Scoped to the timer view: the same rule cannot reach the panel.
    expect(await page.locator('.settings__title').evaluate((element) => getComputedStyle(element).color)).not.toBe('rgb(255, 0, 0)');
    // Kept on its own, apart from the choices; nothing was sent anywhere.
    expect(await storedCss(page)).toBe('.time { color: rgb(242, 196, 107) } .settings, .setting__label { color: rgb(255, 0, 0) }');
    expect(await page.evaluate(() => localStorage.getItem('settings'))).toBeNull();
    expect(uploads).toEqual([]);
    // As a constructed stylesheet in the user layer, never a <style> element.
    expect(await page.evaluate(() => document.querySelectorAll('style').length)).toBe(0);
    await expect.poll(() => other.locator('.time--main').evaluate((element) => getComputedStyle(element).color)).toBe('rgb(242, 196, 107)');

    await page.reload();
    await page.locator('.button--primary').waitFor();
    expect(await timeColor(page)).toBe('rgb(242, 196, 107)');
    await openAdvanced(page);
    await expect(editor(page)).toHaveValue('.time { color: rgb(242, 196, 107) } .settings, .setting__label { color: rgb(255, 0, 0) }');

    // Saving an empty editor removes it.
    await saveCss(page, '');
    await expect.poll(() => timeColor(page)).toBe(before);
    expect(await storedCss(page)).toBeNull();
  });

  test('is cleaned when saved: what is not allowed is removed, the rest kept and shown', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    // Kept exactly as typed, comments and all, when nothing needs removing.
    const clean = '/* mine */\n.time {\n  color: rgb(1, 2, 3);\n}\n';
    await saveCss(page, clean);
    await expect(editor(page)).toHaveValue(clean);
    await expect(page.locator('.css-editor-slot ~ .setting__row .setting__help')).toHaveText('cleaned when saved: @import, @font-face and outside links are removed. stays on this device.');
    await saveCss(page, '@import url(/leak/x.css);\n.time { color: rgb(4, 5, 6); background: url(/leak/y.png) }');
    await expect(editor(page)).toHaveValue('.time { color: rgb(4, 5, 6); }');
    expect(await storedCss(page)).toBe('.time { color: rgb(4, 5, 6); }');
    await expect(page.locator('.css-editor-slot ~ .setting__row .setting__help')).toHaveText(
      'cleaned when saved: what isn’t allowed was removed, and the rest is kept. stays on this device.',
    );
    await expect.poll(() => timeColor(page)).toBe('rgb(4, 5, 6)');
  });

  test('over 50 KB is refused, not cut, and nothing changes', async ({ page }) => {
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    await saveCss(page, `.time { color: red }\n/* ${'x'.repeat(50 * 1024)} */`);
    await expect(page.locator('.css-editor-slot ~ .setting__row .setting__help')).toHaveText('that is over 50 KB. it was not saved.');
    expect(await storedCss(page)).toBe('.time { color: rgb(7, 8, 9) }');
    expect(await timeColor(page)).toBe('rgb(7, 8, 9)');
  });

  test('the editor and its checker load only when advanced opens, with one font file', async ({ page }) => {
    const files: string[] = [];
    page.on('request', (request) => {
      files.push(new URL(request.url()).pathname);
    });
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    // Stored CSS applies without the checker.
    expect(await timeColor(page)).toBe('rgb(7, 8, 9)');
    await page.keyboard.press(',');
    await panel(page).waitFor();
    expect(files.filter((path) => /css-editor|ibm-plex-mono/.test(path))).toEqual([]);
    await openAdvanced(page);
    await page.evaluate(() => document.fonts.ready);
    expect(files.filter((path) => path.includes('css-editor'))).toHaveLength(1);
    expect(files.filter((path) => path.includes('ibm-plex-mono'))).toEqual([expect.stringMatching(/\/assets\/ibm-plex-mono-400-[\w-]+\.woff2$/)]);
    await expect.poll(() => page.locator('.css-editor').evaluate((element) => getComputedStyle(element).fontFamily)).toContain('elapsed-ibm-plex-mono');
  });

  test('typing in the editor is only typing: no shortcuts', async ({ page }) => {
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    await editor(page).click();
    await page.keyboard.type('.time, e { } ');
    await expect(editor(page)).toHaveValue('.time, e { } ');
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('.button--primary')).toHaveAccessibleName('start');
    // Line numbers follow the text, and comments are drawn muted.
    await page.keyboard.type('\n/* a */\n');
    await expect(page.locator('.css-editor__gutter > div')).toHaveText(['1', '2', '3']);
    await expect(page.locator('.css-editor__comment')).toHaveText(['/* a */']);
  });

  test('lockout: hidden controls still leave the comma key, and safe mode undoes it', async ({ page }) => {
    await seedCustomCss(page, LOCKOUT_CSS);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.locator('.button--primary').waitFor({ state: 'attached' });
    await expect(page.locator('.icon-button--settings')).toBeHidden();
    await openAdvanced(page);
    expect(await panelOnTop(page)).toBe(true);
    await page.getByRole('button', { name: 'restart in safe mode' }).click();
    await page.waitForURL((url) => url.search === '');
    await page.locator('.button--primary').waitFor();
    await expect(page.locator('.icon-button--settings')).toBeVisible();
    // Still stored, and shown in the editor to fix.
    expect(await storedCss(page)).toBe(LOCKOUT_CSS);
    await openAdvanced(page);
    await expect(editor(page)).toHaveValue(LOCKOUT_CSS);
  });
});

test.describe('safe mode', () => {
  test('?safe loads once without custom CSS, then the address is plain again', async ({ page }) => {
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await page.goto('/?safe');
    await page.locator('.button--primary').waitFor();
    expect(await timeColor(page)).not.toBe('rgb(7, 8, 9)');
    expect(new URL(page.url()).search).toBe('');
    await page.reload();
    await page.locator('.button--primary').waitFor();
    expect(await timeColor(page)).toBe('rgb(7, 8, 9)');
  });

  test('keeps a running session, and saving custom CSS in safe mode applies it', async ({ page }) => {
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    await page.keyboard.press('Space');
    await expect(page.locator('.button--primary')).toHaveAccessibleName('pause');
    await openAdvanced(page);
    await page.getByRole('button', { name: 'restart in safe mode' }).click();
    await page.waitForURL((url) => url.search === '');
    await page.locator('.button--primary').waitFor();
    await expect(page.locator('.button--primary')).toHaveAccessibleName('pause');
    expect(await timeColor(page)).not.toBe('rgb(7, 8, 9)');
    await openAdvanced(page);
    await page.getByRole('button', { name: 'save', exact: true }).click();
    await expect.poll(() => timeColor(page)).toBe('rgb(7, 8, 9)');
  });
});

test.describe('the malicious-CSS corpus', () => {
  test('every entry is neutralised when saved: no request, no CSP violation, nothing kept that loads, the panel on top', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const origin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const violations = await watchViolations(page);
    const leaks = await watchLeaks(page, origin);
    await page.addInitScript(() => {
      window.alert = () => {
        document.documentElement.dataset['alerted'] = '';
      };
    });
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    for (const entry of MALICIOUS_CSS) {
      await saveCss(page, entry.css);
      await letStylesLoad(page);
      const stored = (await storedCss(page)) ?? '';
      expect(stored, entry.name).not.toMatch(/url\(\s*(?!["']?data:image\/(png|jpeg|gif|webp|avif)[;,])/i);
      expect(stored, entry.name).not.toMatch(/@(import|font-face|namespace|property|counter-style|page|font-feature-values)\b/i);
      expect(stored, entry.name).not.toMatch(/image-set|cross-fade|\bimage\(|\bsrc\(|expression\(|behavior|-moz-binding/i);
      expect(leaks.sent, entry.name).toEqual([]);
      expect(leaks.attempted, entry.name).toEqual([]);
      expect(await violations(), entry.name).toEqual([]);
      expect(await panelOnTop(page), entry.name).toBe(true);
      await expect(page.getByRole('button', { name: 'save', exact: true }), entry.name).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.dataset['alerted'])).toBeUndefined();
    expect(await page.title()).not.toBe('pwned');
  });

  test('without the checker, the CSP still stops other sites, which is why the checker guards the site itself', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? 'http://localhost:4173').origin;
    const violations = await watchViolations(page);
    const leaks = await watchLeaks(page, origin);
    // Written straight into storage, as a tampered device might hold it.
    await seedCustomCss(page, '.screen { background-image: url(https://evil.example/a.png), url(/leak/control.png) }');
    await openApp(page, { width: 1280, height: 800 });
    await letStylesLoad(page);
    expect(await violations()).toEqual([expect.stringMatching(/^img-src: https:\/\/evil\.example\/a\.png/)]);
    // Same-origin images are allowed by the CSP: this request is what the checker prevents.
    expect(leaks.sent).toEqual(['/leak/control.png']);
  });

  test('stored CSS cannot leave the timer view, even written straight into storage', async ({ page }) => {
    await seedCustomCss(page, '} } } .settings { display: none !important } @layer user { @scope (.screen) { .time { color: rgb(1, 2, 3) }');
    await openApp(page, { width: 1280, height: 800 });
    await page.keyboard.press(',');
    await panel(page).waitFor();
    expect(await panelOnTop(page)).toBe(true);
  });
});

test.describe('the settings file', () => {
  test('exports every choice and the custom CSS, not fonts', async ({ page }) => {
    await seedSettings(page, { theme: 'sky', font: 'own' });
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'export', exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('elapsed-settings.json');
    const contents = JSON.parse(readFileSync(await file.path(), 'utf8')) as Record<string, unknown>;
    expect(contents).toMatchObject({ app: 'elapsed', kind: 'settings', version: 1, customCss: '.time { color: rgb(7, 8, 9) }' });
    expect(contents['settings']).toMatchObject({ theme: 'sky', font: 'own', seconds: 'blur-away' });
    expect(JSON.stringify(contents)).not.toContain('woff');
  });

  test('imports choices and cleaned custom CSS, keeping the font in use when the file names one this device lacks', async ({ page }) => {
    const leaks: string[] = [];
    await page.route('**/leak/**', (route) => {
      leaks.push(route.request().url());
      return route.fulfill({ status: 404, body: '' });
    });
    await seedSettings(page, { font: 'dm-mono' });
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    const file = page.locator('input.settings__file');
    const note = page.locator('.setting__actions ~ .setting__help, .setting:has(.setting__actions) .setting__help');
    await file.setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"other"}') });
    await expect(note).toHaveText('that isn’t an elapsed settings file. nothing was changed.');
    await file.setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.alloc(256 * 1024 + 1, 32) });
    await expect(note).toHaveText('that file is over 256 KB. nothing was changed.');
    expect(await page.evaluate(() => localStorage.getItem('settings'))).toContain('dm-mono');

    const imported = {
      app: 'elapsed',
      kind: 'settings',
      version: 1,
      settings: { theme: 'sky', font: 'own', seconds: 'always', timeSize: 999 },
      customCss: '@import url(/leak/import.css); .time { color: rgb(9, 8, 7) }',
    };
    await file.setInputFiles({ name: 'elapsed-settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    await expect.poll(() => storedCss(page)).toBe('.time { color: rgb(9, 8, 7); }');
    await expect(editor(page)).toHaveValue('.time { color: rgb(9, 8, 7); }');
    await expect(note).toHaveText('your choices and custom css in one file. fonts and images stay on this device.');
    const settings = JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}') as Record<string, unknown>;
    // An invalid value takes its default; a font file never travels, so the font in use stays.
    expect(settings).toMatchObject({ theme: 'sky', seconds: 'always', timeSize: 100, font: 'dm-mono' });
    await expect.poll(() => timeColor(page)).toBe('rgb(9, 8, 7)');
    await page.waitForTimeout(100);
    expect(leaks).toEqual([]);
  });
});

test.describe('destructive actions ask first', () => {
  test('reset all settings: cancel keeps everything; confirming restores every choice and keeps custom CSS and fonts', async ({ page }) => {
    await seedSettings(page, { theme: 'sky', seconds: 'always' });
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    await page.keyboard.press(',');
    await panel(page).waitFor();
    await row(page, 'appearance').click();
    await page.locator('.font-tiles__file').setInputFiles({ name: 'mine.woff2', mimeType: 'font/woff2', buffer: FONT });
    await expect(page.getByRole('radio', { name: 'your font' })).toHaveAttribute('aria-checked', 'true');
    await openAdvanced(page);

    const ask = page.getByRole('button', { name: 'reset all settings' });
    const step = page.getByRole('group', { name: 'reset all settings' });
    await ask.click();
    await expect(step).toBeVisible();
    await expect(step).toContainText('put every setting back to its default? your custom css, fonts and images are kept.');
    await expect(step.getByRole('button', { name: 'cancel' })).toBeFocused();
    await step.getByRole('button', { name: 'cancel' }).click();
    await expect(step).toBeHidden();
    await expect(ask).toBeFocused();
    // Escape also steps back, without closing the panel.
    await ask.click();
    await page.keyboard.press('Escape');
    await expect(step).toBeHidden();
    await expect(panel(page)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('settings'))).toContain('sky');

    await ask.click();
    await step.getByRole('button', { name: 'reset all', exact: true }).click();
    await expect(step).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('settings'))).toBeNull();
    expect(await storedCss(page)).toBe('.time { color: rgb(7, 8, 9) }');
    expect(await timeColor(page)).toBe('rgb(7, 8, 9)');
    await row(page, 'appearance').click();
    await expect(page.getByRole('radio', { name: 'your font' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('radio', { name: 'archivo' })).toHaveAttribute('aria-checked', 'true');
  });

  test('clear device data says it removes custom CSS, fonts and images, and does', async ({ page }) => {
    await seedSettings(page, { theme: 'sky' });
    await seedCustomCss(page, '.time { color: rgb(7, 8, 9) }');
    await openApp(page, { width: 1280, height: 800 });
    await openAdvanced(page);
    await row(page, 'privacy and data').click();
    const step = page.getByRole('group', { name: 'clear device data' });
    await page.getByRole('button', { name: 'clear device data' }).click();
    await expect(step).toContainText('remove everything stored in this browser, including your custom css, fonts and images?');
    await step.getByRole('button', { name: 'cancel' }).click();
    expect(await storedCss(page)).toBe('.time { color: rgb(7, 8, 9) }');
    await page.getByRole('button', { name: 'clear device data' }).click();
    await step.getByRole('button', { name: 'clear', exact: true }).click();
    await expect.poll(() => storedCss(page)).toBeNull();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key === 'settings' || key === 'custom-css'))).toEqual([]);
    await expect.poll(() => timeColor(page)).not.toBe('rgb(7, 8, 9)');
    await row(page, 'advanced').click();
    await expect(editor(page)).toHaveValue('');
  });
});

test('nothing in the advanced category breaks the CSP', async ({ page }) => {
  const violations = await watchViolations(page);
  await seedCustomCss(page, `.screen { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==") }`);
  await openApp(page, { width: 1280, height: 800 });
  await openAdvanced(page);
  await saveCss(page, '.time { color: rgb(1, 2, 3) } @keyframes k { from { opacity: .5 } } .controls { animation: k 1s }');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'export', exact: true }).click();
  await download;
  await letStylesLoad(page);
  expect(await violations()).toEqual([]);
});
