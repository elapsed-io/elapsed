/**
 * The credits page (owner, round 2.11): linked from the settings footer, it lists every third-party work the site
 * uses and its licence, as a static page under the site's own security policy.
 */

import { CREDITS_COPY, SETTINGS_SCHEMA } from '@stopwatch/core';
import type { Page } from '@playwright/test';
import { expect, test } from './test.ts';
import { openApp } from './helpers.ts';

test('the settings footer links to the credits page, which lists every third-party work and its licence', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press(',');
  await page.locator('.settings').waitFor();
  const link = page.locator('.settings__links a', { hasText: /^credits$/ });
  await expect(link).toHaveAttribute('href', '/credits/');
  // It opens in a new tab, so the timer keeps running in view.
  await expect(link).toHaveAttribute('target', '_blank');

  const violations: string[] = [];
  const credits = await page.context().newPage();
  credits.on('console', (message) => {
    if (message.type() === 'error') violations.push(message.text());
  });
  const response = await credits.goto('/credits/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-security-policy']).toContain("style-src 'self'");
  await expect(credits.locator('h1')).toHaveText('credits');
  const works = await credits.locator('.credit').evaluateAll((items) =>
    items.map((item) => ({ name: item.querySelector('h2')?.textContent ?? '', licence: item.querySelector('a')?.textContent ?? '', href: item.querySelector('a')?.getAttribute('href') ?? '' })),
  );
  expect(works).toHaveLength(CREDITS_COPY.works.length);
  // The three the owner named, each with its licence.
  expect(works).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Archivo', licence: 'SIL Open Font License 1.1' }),
      expect.objectContaining({ name: 'Tabler Icons', licence: 'MIT License' }),
      expect.objectContaining({ name: 'HYG database, version 4.1', licence: 'Creative Commons Attribution-ShareAlike 4.0 International' }),
    ]),
  );
  // Every font the settings offer is credited.
  for (const name of ['Barlow Semi Condensed', 'Saira', 'Inter', 'Space Grotesk', 'Sora', 'Manrope', 'Outfit', 'IBM Plex Sans', 'JetBrains Mono', 'IBM Plex Mono', 'Roboto Mono', 'DM Mono']) {
    expect(works.map((work) => work.name)).toContain(name);
  }
  for (const work of works) expect(work.href).toMatch(/^https:\/\//);
  // Styled from its own stylesheet, in the site's colours and typeface, with nothing refused.
  expect(await credits.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(14, 15, 17)');
  await credits.evaluate(() => document.fonts.ready);
  expect(await credits.evaluate(() => document.fonts.check('13px "Timer Sans"'))).toBe(true);
  expect(violations).toEqual([]);
  await credits.screenshot({ path: test.info().outputPath('credits.png'), fullPage: true });
});

// Round 2.14: the credits page in the person's chosen theme and the site's typeface, laid out like the privacy
// and terms pages.

/** The rgb() a #rrggbb colour computes to. */
const rgb = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
};

/** Opens the credits page with `settings` stored, collecting anything the browser refuses or reports. */
async function openCredits(page: Page, settings: string | null): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  if (settings !== null)
    await page.addInitScript((text) => {
      localStorage.setItem('settings', text);
    }, settings);
  await page.goto('/credits/');
  await page.locator('html[data-scheme]').waitFor({ state: 'attached' });
  return errors;
}

// The themes as the frames draw them (background, text), and which are light.
const THEMES = [
  { id: 'graphite', background: '#0E0F11', text: '#ECEAE4', scheme: 'dark' },
  { id: 'paper', background: '#F6F5F2', text: '#1A1B1E', scheme: 'light' },
  { id: 'deep-sea', background: '#0F2B3B', text: '#DDEDF5', scheme: 'dark' },
  { id: 'forest', background: '#14301F', text: '#E6F0DA', scheme: 'dark' },
  { id: 'oxblood', background: '#3A1418', text: '#F5E4DF', scheme: 'dark' },
  { id: 'plum', background: '#2A1838', text: '#EFE3F6', scheme: 'dark' },
  { id: 'lilac', background: '#E2DAF5', text: '#231A38', scheme: 'light' },
  { id: 'sky', background: '#D3E7F5', text: '#0F2638', scheme: 'light' },
  { id: 'sand', background: '#F3E3C3', text: '#2A1E0C', scheme: 'light' },
  { id: 'mint', background: '#D5F0E3', text: '#0E2A1E', scheme: 'light' },
] as const;

for (const theme of THEMES) {
  test(`in the ${theme.id} theme, the credits page takes its colours`, async ({ page }) => {
    const errors = await openCredits(page, JSON.stringify({ schema: SETTINGS_SCHEMA, theme: theme.id }));
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(rgb(theme.background));
    expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe(rgb(theme.text));
    await expect(page.locator('html')).toHaveAttribute('data-scheme', theme.scheme);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(theme.scheme);
    expect(errors).toEqual([]);
  });
}

test('with colours of the person’s own, the credits page takes them', async ({ page }) => {
  const errors = await openCredits(page, JSON.stringify({ schema: SETTINGS_SCHEMA, theme: 'graphite', colors: { background: '#f0e6d2', foreground: '#2b2118', accent: '#a0522d' } }));
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(240, 230, 210)');
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(43, 33, 24)');
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'light');
  expect(errors).toEqual([]);
});

for (const [name, settings] of [
  ['no settings', null],
  ['damaged settings', '{"schema":4,"theme":'],
  ['an unknown theme', JSON.stringify({ schema: 4, theme: 'neon', colors: { background: 'red' } })],
] as const) {
  test(`with ${name}, the credits page shows the default theme`, async ({ page }) => {
    const errors = await openCredits(page, settings);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(14, 15, 17)');
    expect(errors).toEqual([]);
  });
}

test('laid out like the privacy and terms pages: the name, one column, a light title and the footer links', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await openCredits(page, null);
  await page.evaluate(() => document.fonts.ready);
  const name = page.locator('header a');
  await expect(name).toHaveText('elapsed');
  await expect(name).toHaveAttribute('href', '/');
  expect(await name.evaluate((element) => ({ size: getComputedStyle(element).fontSize, tracking: getComputedStyle(element).letterSpacing }))).toEqual({ size: '13px', tracking: '2.08px' });
  // A 560 px column of text with 24 px either side, as the legal pages' stylesheet has it.
  const column = await page.locator('main').boundingBox();
  expect(column?.width).toBe(560 + 2 * 24);
  expect((column?.x ?? 0) + (column?.width ?? 0) / 2).toBe(640);
  expect(await page.locator('h1').evaluate((element) => ({ size: getComputedStyle(element).fontSize, weight: getComputedStyle(element).fontWeight }))).toEqual({ size: '44px', weight: '300' });
  // The site's typeface (Firefox writes the family without quotes).
  expect(await page.locator('h1').evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/^"?Timer Sans"?, system-ui, sans-serif$/);
  expect(await page.evaluate(() => document.fonts.check('44px "Timer Sans"'))).toBe(true);
  expect(await page.locator('main').evaluate((element) => ({ size: getComputedStyle(element).fontSize, lineHeight: getComputedStyle(element).lineHeight }))).toEqual({ size: '15px', lineHeight: '24px' });
  expect(await page.locator('.credit h2').first().evaluate((element) => ({ size: getComputedStyle(element).fontSize, weight: getComputedStyle(element).fontWeight }))).toEqual({ size: '18px', weight: '500' });
  // The settings footer's links, this page marked as the one shown.
  const links = page.locator('nav.links a');
  await expect(links).toHaveText(['privacy', 'terms', 'credits']);
  await expect(links.filter({ hasText: 'credits' })).toHaveAttribute('aria-current', 'page');
  expect(await links.first().evaluate((element) => getComputedStyle(element).fontSize)).toBe('11px');
  // On a phone, one column the width of the screen, and nothing scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await page.locator('main').boundingBox())?.width).toBe(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('credits-legal.png'), fullPage: true });
});
