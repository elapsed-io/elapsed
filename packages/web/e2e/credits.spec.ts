/**
 * The credits page (owner, round 2.11): linked from the settings footer, it lists every third-party work the site
 * uses and its licence, as a static page under the site's own security policy.
 */

import { CREDITS_COPY } from '@stopwatch/core';
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
