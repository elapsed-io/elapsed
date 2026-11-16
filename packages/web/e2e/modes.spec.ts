/** Display modes through the contract, chosen in settings, and lazy loading. */

import { expect, test } from '@playwright/test';
import { MINUTE, SECOND, openApp, settle } from './helpers.ts';

test('loads ring and timeline only when asked for', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await openApp(page, { mode: 'ring' });
  await expect(page.locator('.ring')).toBeVisible();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'ring');
  expect(scripts.some((path) => path.includes('/assets/ring-'))).toBe(true);
  expect(scripts.some((path) => path.includes('/assets/timeline-'))).toBe(false);
});

for (const value of ['Ring', 'analog', 'ocean', '../ring', '', 42]) {
  test(`shows digits for a stored mode of ${JSON.stringify(value)}`, async ({ page }) => {
    await openApp(page, { settings: { mode: value } });
    await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
    await expect(page.locator('.ring, .timeline')).toHaveCount(0);
  });
}

test('no longer reads a mode from the address', async ({ page }) => {
  await page.goto('/?mode=ring');
  await page.locator('.button--primary').waitFor();
  await expect(page.locator('.screen')).toHaveAttribute('data-mode', 'digits');
});

test('the ring turns once a minute, and its tail grows in behind the head, whole after about nine minutes', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  const rotor = page.locator('.ring__rotor');
  const angles = () => rotor.evaluate((element) => [element.style.getPropertyValue('--ring-angle'), element.style.getPropertyValue('--ring-tail')]);
  expect(await angles()).toEqual(['0deg', '0deg']);
  await page.locator('.button--primary').click();
  await page.clock.runFor(59 * SECOND);
  expect(await angles()).toEqual(['0deg', '0deg']);
  await page.clock.runFor(SECOND);
  expect(await angles()).toEqual(['6deg', '6deg']);
  await page.clock.runFor(4 * MINUTE);
  expect(await angles()).toEqual(['30deg', '30deg']);
  await page.clock.runFor(5 * MINUTE);
  expect(await angles()).toEqual(['60deg', '55deg']);
  // Past 12 o'clock it keeps turning forward, never back.
  await page.clock.runFor(55 * MINUTE);
  expect(await angles()).toEqual(['390deg', '55deg']);
  // Turned by a transform, never redrawn.
  expect(await rotor.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
});

test('the timeline moves in whole-pixel steps once a minute and draws nothing before the start', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  const offsets = () => page.locator('.timeline__strip').evaluateAll((strips) => strips.map((strip) => strip.getAttribute('transform')));
  expect(await offsets()).toEqual(['translate(240 0)', 'translate(240 0)', 'translate(240 0)']);
  await page.locator('.button--primary').click();
  await page.clock.runFor(59 * SECOND);
  expect((await offsets())[0]).toBe('translate(240 0)');
  await page.clock.runFor(SECOND);
  expect(await offsets()).toEqual(['translate(230 0)', 'translate(230 0)', 'translate(230 0)']);
  // The strip starts at the session's start: nothing at negative positions.
  const leftmost = await page.locator('.timeline__strip rect, .timeline__label').evaluateAll((shapes) => Math.min(...shapes.map((shape) => Number(shape.getAttribute('x')))));
  expect(leftmost).toBe(0);
  expect(await page.locator('.timeline__svg').getAttribute('shape-rendering')).toBe('crispEdges');
});

for (const mode of ['ring', 'timeline', 'digits']) {
  test(`paused in ${mode}, the whole display blurs and the buttons stay sharp`, async ({ page }) => {
    await openApp(page, { mode });
    await page.locator('.button--primary').click();
    await page.clock.runFor(2 * MINUTE);
    await page.locator('.button--primary').click();
    await settle(page);
    const body = page.locator('.time-stack__body');
    expect(await body.evaluate((element) => getComputedStyle(element).filter), mode).toBe('blur(10px)');
    expect(await body.evaluate((element) => getComputedStyle(element).opacity), mode).toBe('0.4');
    // The graphics are inside the blurred body; the pause length and buttons are not.
    if (mode !== 'digits') expect(await body.locator(mode === 'ring' ? '.ring__rotor' : '.timeline__track').count(), mode).toBe(1);
    expect(await page.locator('.time--paused-for').evaluate((element) => element.closest('.time-stack__body'))).toBeNull();
    expect(await page.locator('.screen > .controls').evaluate((element) => getComputedStyle(element).filter), mode).toBe('none');
  });
}

test('modes record the mode a session started in', async ({ page }) => {
  await openApp(page, { mode: 'timeline' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(SECOND);
  await expect(page.locator('.timeline__svg')).toBeVisible();
  await expect(page.locator('.timeline .time--main')).toBeVisible();
});

test('modes hold their motion while paused', async ({ page }) => {
  await openApp(page, { mode: 'ring' });
  await page.locator('.button--primary').click();
  await page.clock.runFor(3 * MINUTE);
  await page.locator('.button--primary').click();
  const angle = () => page.locator('.ring__rotor').evaluate((element) => element.style.getPropertyValue('--ring-angle'));
  expect(await angle()).toBe('18deg');
  await page.clock.runFor(10 * MINUTE);
  expect(await angle()).toBe('18deg');
});
