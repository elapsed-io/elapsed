/**
 * The test modes behind the flag only (plan, Display modes > Interstellar; owner, 2026-11-24; src/test-flag.ts): a
 * visit opened with `?test=modes` (or the older `?test=interstellar`) adds ocean depth, height, the tree and
 * interstellar to the mode tiles for that visit, until the tab is closed. Without the flag they appear nowhere and
 * nothing of them is downloaded; there is no settings switch, and nothing about the flag is stored. A test mode
 * chosen falls back to digits on a visit without the flag, the choice kept for the next flagged visit.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEST_MODES_COPY } from '@stopwatch/core';
import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { FLAGGED, openApp } from './helpers.ts';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

async function openCategory(page: Page, name: string): Promise<void> {
  if (!(await page.locator('.settings').isVisible())) await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const row = page.locator('.settings__row', { hasText: new RegExp(`^${name}$`) });
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
}

const STANDARD_TILES = ['digits', 'ring', 'timeline', 'analog'] as const;
const TEST_TILES = ['ocean depth', 'height', 'tree', 'interstellar'] as const;
const tile = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });
/** Each tile's name, in order (its preview, hidden from assistive technology, left out: digits' draws "00:00"). */
const tileNames = (page: Page): Promise<string[]> =>
  page.locator('.mode-tile').evaluateAll((tiles) => tiles.map((element) => [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? '').join('').trim()));

async function expectStandardTilesOnly(page: Page): Promise<void> {
  await openCategory(page, 'display');
  expect(await tileNames(page)).toEqual([...STANDARD_TILES]);
  await expect(page.locator('.settings')).not.toContainText(TEST_MODES_COPY.line);
  await expect(page.locator('.mode-options[data-options]')).toHaveCount(0);
}

async function expectAllTiles(page: Page): Promise<void> {
  await openCategory(page, 'display');
  expect(await tileNames(page)).toEqual([...STANDARD_TILES, ...TEST_TILES]);
  await expect(page.locator('.settings')).toContainText(TEST_MODES_COPY.line);
}

interface ManifestChunk {
  readonly file: string;
  readonly src?: string;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly css?: readonly string[];
  readonly assets?: readonly string[];
}

/**
 * The modules only a flagged visit loads: the test modes' registration and their part of the settings panel, and
 * picture-in-picture (round 2.15: behind the flag until its release).
 */
const FLAGGED_SOURCES = ['src/modes/test-modes.ts', 'src/settings/test-modes.ts', 'src/pip/pip.ts'];

/**
 * Every file of the build that only a flagged visit can fetch: what the flagged-only modules load, now or later (the
 * test modes, their pieces, art, styles, results views and settings tiles), less what the site loads without them.
 */
function testModeFiles(): Set<string> {
  const manifest = JSON.parse(readFileSync(`${DIST}.vite/manifest.json`, 'utf8')) as Record<string, ManifestChunk>;
  const closure = (starts: readonly string[], stop: ReadonlySet<string>): Set<string> => {
    const files = new Set<string>();
    const seen = new Set<string>();
    const pending = [...starts];
    while (pending.length > 0) {
      const key = pending.pop();
      if (key === undefined || seen.has(key) || stop.has(key)) continue;
      seen.add(key);
      const chunk = manifest[key];
      if (chunk === undefined) continue;
      for (const file of [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]) files.add(`/${file}`);
      pending.push(...(chunk.imports ?? []), ...(chunk.dynamicImports ?? []));
    }
    return files;
  };
  for (const source of FLAGGED_SOURCES) if (manifest[source] === undefined) throw new Error(`${source} is not its own chunk`);
  const site = closure(['index.html'], new Set(FLAGGED_SOURCES));
  const flagged = closure(FLAGGED_SOURCES, new Set());
  return new Set([...flagged].filter((file) => !site.has(file)));
}

/** Everything this browser keeps for the site: local and session storage (keys and values) and cookies. */
async function stored(page: Page): Promise<{ local: Record<string, string>; session: Record<string, string>; cookies: string }> {
  return page.evaluate(() => ({
    local: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key) ?? ''])),
    session: Object.fromEntries(Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key) ?? ''])),
    cookies: document.cookie,
  }));
}

/** A visit's usual path: settings, every category, a search, a session started, paused and ended to its results. */
async function visitEverything(page: Page): Promise<void> {
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  for (const name of ['timer', 'display', 'appearance', 'notifications', 'privacy and data', 'advanced']) await openCategory(page, name);
  await page.getByRole('searchbox').fill('ocean');
  await page.getByRole('searchbox').fill('');
  await page.keyboard.press('Escape');
  await page.locator('.settings').waitFor({ state: 'hidden' });
  await page.keyboard.press('Space');
  await page.clock.runFor(2 * 60_000);
  await page.keyboard.press('Space');
  await page.keyboard.press('e');
  await page.locator('.results').waitFor();
}

test('a visit without the flag shows only the four standard modes, downloads no test-mode file and stores nothing about the flag', async ({ page }) => {
  const fetched = new Set<string>();
  page.on('request', (request) => fetched.add(new URL(request.url()).pathname));
  // In a browser that offers picture-in-picture's window, so its code too is shown never to load without the flag.
  await openApp(page, { width: 1280, height: 800, pip: true });
  await expectStandardTilesOnly(page);
  await openCategory(page, 'advanced');
  await expect(page.getByRole('switch', { name: 'test modes' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await visitEverything(page);

  const testOnly = testModeFiles();
  // The flagged-only files exist (the test modes and their tiles), and none was fetched.
  expect(testOnly.size).toBeGreaterThan(10);
  expect([...fetched].filter((path) => testOnly.has(path))).toEqual([]);
  // Nor any of the test modes' words: the scripts fetched carry none of their names, tiles' line or options.
  const scripts = [...fetched].filter((path) => path.endsWith('.js'));
  for (const path of scripts) {
    const text = readFileSync(`${DIST}${path.slice(1)}`, 'utf8');
    for (const words of [TEST_MODES_COPY.line, TEST_MODES_COPY.names.ocean, TEST_MODES_COPY.oceanLife.help, TEST_MODES_COPY.modeOptions.tree]) expect(text.includes(words), `${path} holds "${words}"`).toBe(false);
  }

  const kept = await stored(page);
  expect(Object.keys(kept.local)).not.toContain('test-modes');
  expect(JSON.stringify(kept)).not.toMatch(/test/);
});

test('a flagged visit shows all eight modes with the line under them, and stores nothing more about it than a visit without the flag', async ({ browser }) => {
  const visit = async (flagged: boolean): Promise<Awaited<ReturnType<typeof stored>>> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openApp(page, { width: 1280, height: 800, flagged });
    if (flagged) await expectAllTiles(page);
    else await expectStandardTilesOnly(page);
    await page.keyboard.press('Escape');
    await visitEverything(page);
    const kept = await stored(page);
    await context.close();
    return kept;
  };
  const unflagged = await visit(false);
  const flagged = await visit(true);
  expect(Object.keys(flagged.local).sort()).toEqual(Object.keys(unflagged.local).sort());
  expect(Object.keys(flagged.session).sort()).toEqual(Object.keys(unflagged.session).sort());
  expect(flagged.cookies).toBe(unflagged.cookies);
  expect(JSON.stringify(flagged)).not.toMatch(/test/);
});

test('the flag lasts for the visit: a reload keeps it, a new tab without it shows four modes, and the choice is kept for the next flagged visit', async ({ page, context }) => {
  await openApp(page, { width: 1280, height: 800, flagged: true });
  await openCategory(page, 'display');
  await tile(page, 'ocean depth').click();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ocean');
  await page.keyboard.press('Escape');

  // The address keeps the flag, so a reload stays flagged.
  await page.reload();
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  expect(new URL(page.url()).search).toBe('?test=modes');
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ocean');
  await expectAllTiles(page);

  // A new tab opened without the flag: the four standard modes, digits shown, the choice kept.
  const other = await context.newPage();
  await other.setViewportSize({ width: 1280, height: 800 });
  await other.goto('/');
  await other.locator('html[data-ready]').waitFor({ state: 'attached' });
  await expect(other.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  await expectStandardTilesOnly(other);
  await expect(tile(other, 'digits')).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await other.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ mode: 'ocean' });

  // Closing the flagged tab ends its visit; the next tab without the flag still shows four.
  await page.close();
  const after = await context.newPage();
  await after.setViewportSize({ width: 1280, height: 800 });
  await after.goto('/');
  await after.locator('html[data-ready]').waitFor({ state: 'attached' });
  await expect(after.locator('.screen')).toHaveAttribute('data-mode', 'digits');
  await expectStandardTilesOnly(after);

  // The next flagged visit shows the choice again.
  await after.goto(FLAGGED);
  await after.locator('html[data-ready]').waitFor({ state: 'attached' });
  await expect(after.locator('.screen')).toHaveAttribute('data-mode', 'ocean');
});

test('?test=interstellar flags a visit too; any other test value does nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?test=interstellar');
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  await expectAllTiles(page);
  await page.goto('/?test=calendar');
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  await expectStandardTilesOnly(page);
});

test('the test-modes switch an earlier version stored is removed on load, flagged or not', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded') === null) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('test-modes', '{"schema":1,"offered":true,"on":true}');
    }
  });
  await openApp(page, { width: 1280, height: 800 });
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBeNull();
  // On, it no longer shows the test modes: only the flag does.
  await expectStandardTilesOnly(page);
  await page.evaluate(() => {
    localStorage.setItem('test-modes', '{"schema":1,"offered":true,"on":false}');
  });
  await page.goto(FLAGGED);
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
  expect(await page.evaluate(() => localStorage.getItem('test-modes'))).toBeNull();
});

for (const chosen of ['ocean', 'height', 'tree', 'interstellar']) {
  test(`${chosen} chosen shows digits on a visit without the flag, the choice kept`, async ({ page }) => {
    await page.addInitScript((mode) => {
      if (localStorage.getItem('settings') === null) localStorage.setItem('settings', JSON.stringify({ schema: 1, mode }));
    }, chosen);
    await openApp(page, { flagged: false });
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('settings'))) ?? '{}')).toMatchObject({ mode: chosen });
  });
}

test('a stored perpetual calendar, now removed, reads as digits', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('settings') === null) localStorage.setItem('settings', '{"schema":1,"mode":"calendar"}');
  });
  await openApp(page);
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});

test.describe('a test mode downloaded on a flagged visit', () => {
  test.use({ serviceWorkers: 'allow' });

  test('stays on the device but is not listed on a visit without the flag', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.addInitScript(() => {
      if (localStorage.getItem('settings') === null) localStorage.setItem('settings', '{"schema":3,"mode":"ocean"}');
    });
    await page.goto(FLAGGED);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Shown again once the worker controls the page, so the mode's files go into its own cache.
    await page.reload();
    await page.locator('.screen[data-mode="ocean"]').waitFor();
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((name) => name.endsWith('-mode-ocean')).length)).toBe(1);
    await openCategory(page, 'display');
    await expect(page.locator('.downloads__row', { hasText: TEST_MODES_COPY.names.ocean })).toHaveCount(1);

    await page.goto('/');
    await page.locator('html[data-ready]').waitFor({ state: 'attached' });
    await openCategory(page, 'display');
    await expect(page.locator('.downloads__row', { hasText: TEST_MODES_COPY.names.ocean })).toHaveCount(0);
    expect(await page.evaluate(async () => (await caches.keys()).filter((name) => name.endsWith('-mode-ocean')).length)).toBe(1);
  });
});
