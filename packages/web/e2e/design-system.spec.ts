/**
 * One design system (plan-release-2, round 2.11; plan v11, Design system): one screen layout and one layer order
 * for every mode.
 *
 * - The shared layout: the time, the gap under it and the buttons sit in exactly the same place and size in every
 *   mode that shows the time on its own (digits, ocean depth, height, interstellar), idle and running; only the
 *   mode's own layers differ. The standard modes that draw a figure share its sizes (round 2.13; plan, Design
 *   system): the dial is 260 px across in ring and analog, the time inside ring and timeline is 48 px, the compact
 *   timeline's track is 360 px wide and 14 px below its time, and every mode's main block sits in the same
 *   centred slot with the buttons 26 px below it, idle, running and paused. The buttons are the shared buttons,
 *   the same size in every mode.
 * - The layer order: the mode's background and art, then the time and buttons, then pause, check-in and other
 *   dialogs, then notices, then settings. Nothing from a mode may cover a dialog: with every element made
 *   hit-testable, so hit testing follows the paint order, the topmost element over each part of a dialog is the
 *   dialog's own, in every mode.
 */

import { createSession, serializeActiveState, startState } from '@stopwatch/core';
import type { Page } from '@playwright/test';
import { expect, test } from './test.ts';
import { MINUTE, SECOND, T0, T_READY, openApp, settle } from './helpers.ts';

/** Every display mode. */
const MODES = ['digits', 'ring', 'timeline', 'analog', 'ocean', 'height', 'tree', 'interstellar'] as const;
/** The modes that show the time on its own, in the shared layout. */
const TIME_MODES = ['digits', 'ocean', 'height', 'interstellar'] as const;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Layout {
  readonly time: Box;
  readonly gap: number;
  readonly buttons: readonly Box[];
}

async function layout(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const box = (element: Element | null): { x: number; y: number; width: number; height: number } => {
      const rect = element?.getBoundingClientRect();
      if (rect === undefined) throw new Error('missing element');
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const time = box(document.querySelector('.mode-root .time--main'));
    const controls = box(document.querySelector('.controls'));
    return {
      time,
      gap: controls.y - (time.y + time.height),
      buttons: [...document.querySelectorAll('.controls .button')].filter((button) => button.getClientRects().length > 0).map((button) => box(button)),
    };
  });
}

function expectSame(actual: Layout, expected: Layout, what: string): void {
  const near = (a: number, b: number, name: string): void => {
    expect(Math.abs(a - b), `${what}: ${name} ${String(a)} against ${String(b)}`).toBeLessThanOrEqual(0.5);
  };
  for (const key of ['x', 'y', 'width', 'height'] as const) near(actual.time[key], expected.time[key], `time ${key}`);
  near(actual.gap, expected.gap, 'gap between the time and the buttons');
  expect(actual.buttons.length, `${what}: buttons`).toBe(expected.buttons.length);
  actual.buttons.forEach((button, index) => {
    const reference = expected.buttons[index];
    if (reference === undefined) return;
    for (const key of ['x', 'y', 'width', 'height'] as const) near(button[key], reference[key], `button ${String(index + 1)} ${key}`);
  });
}

test.describe('the shared layout', () => {
  for (const [width, height] of [
    [1280, 800],
    [720, 450],
    [390, 844],
  ] as const) {
    test(`the time, the gap and the buttons are identical in every time mode, idle and running (${String(width)}×${String(height)})`, async ({ browser }) => {
      const measure = async (mode: string): Promise<{ idle: Layout; running: Layout }> => {
        const context = await browser.newContext();
        const own = await context.newPage();
        await openApp(own, { mode, width, height });
        await settle(own);
        const idle = await layout(own);
        await own.locator('.button--primary').click();
        await own.clock.runFor(2 * SECOND);
        await settle(own);
        const running = await layout(own);
        await context.close();
        return { idle, running };
      };
      const digits = await measure('digits');
      // Idle and running share one layout (the start button and the pause and end buttons differ only in number).
      expectSame({ ...digits.running, buttons: digits.idle.buttons }, { ...digits.idle }, 'digits, running against idle');
      for (const mode of TIME_MODES.slice(1)) {
        const measured = await measure(mode);
        expectSame(measured.idle, digits.idle, `${mode}, idle`);
        expectSame(measured.running, digits.running, `${mode}, running`);
      }
    });
  }

  test('the buttons are the shared buttons, the same size in every mode', async ({ browser }) => {
    const sizes: Record<string, readonly { width: number; height: number }[]> = {};
    for (const mode of MODES) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openApp(page, { mode, width: 1280, height: 800 });
      await settle(page);
      await page.locator('.button--primary').click();
      await page.clock.runFor(2 * SECOND);
      await settle(page);
      sizes[mode] = (await layout(page)).buttons.map(({ width, height }) => ({ width, height }));
      await context.close();
    }
    for (const mode of MODES) {
      expect(sizes[mode]?.length, mode).toBe(sizes['digits']?.length);
      sizes[mode]?.forEach((size, index) => {
        const reference = sizes['digits']?.[index];
        expect(Math.abs(size.width - (reference?.width ?? 0)), `${mode}: button ${String(index + 1)} width`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(size.height - (reference?.height ?? 0)), `${mode}: button ${String(index + 1)} height`).toBeLessThanOrEqual(0.5);
      });
    }
  });
});

/** The figure modes' main blocks, by mode. */
const BLOCKS = { ring: '.ring', timeline: '.timeline', analog: '.analog-stack' } as const;

interface Slot {
  readonly block: Box;
  readonly gap: number;
  readonly centre: number;
  readonly middle: number;
  readonly above: number;
  readonly below: number;
}

/** The main block's box, its gap to the buttons, and where the block and buttons sit together on the screen. */
async function slot(page: Page, selector: string): Promise<Slot> {
  return page.evaluate((selector) => {
    const block = document.querySelector(`.mode-root ${selector}`)?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.controls .button')].filter((button) => button.getClientRects().length > 0).map((button) => button.getBoundingClientRect());
    const first = buttons[0];
    if (block === undefined || first === undefined) throw new Error('missing element');
    const bottom = Math.max(...buttons.map((button) => button.bottom));
    return {
      block: { x: block.x, y: block.y, width: block.width, height: block.height },
      gap: first.top - block.bottom,
      centre: block.x + block.width / 2,
      middle: innerWidth / 2,
      above: block.top,
      below: innerHeight - bottom,
    };
  }, selector);
}

test.describe('the standard modes share one slot (round 2.13)', () => {
  for (const [mode, selector] of Object.entries(BLOCKS)) {
    test(`${mode}: its block centred with the buttons 26 px below it, idle, running and paused`, async ({ page }) => {
      await openApp(page, { mode });
      const check = async (state: string): Promise<void> => {
        await settle(page);
        const measured = await slot(page, selector);
        const what = `${mode}, ${state}: ${JSON.stringify(measured)}`;
        expect(Math.abs(measured.gap - 26), what).toBeLessThanOrEqual(0.5);
        expect(Math.abs(measured.centre - measured.middle), what).toBeLessThanOrEqual(0.5);
        expect(Math.abs(measured.above - measured.below), what).toBeLessThanOrEqual(1);
      };
      await check('idle');
      await page.locator('.button--primary').click();
      await page.clock.runFor(2 * SECOND);
      await check('running');
      await page.locator('.button--primary').click();
      await check('paused');
    });
  }

  test('ring: the dial 260 px across, the time inside it 48 px', async ({ page }) => {
    await openApp(page, { mode: 'ring' });
    await settle(page);
    expect(await page.locator('.mode-root .ring').evaluate((ring) => ring.getBoundingClientRect().width)).toBeCloseTo(260, 1);
    expect(await page.locator('.mode-root .ring__track').evaluate((track) => track.getBoundingClientRect().width)).toBeCloseTo(260, 1);
    expect(await page.locator('.mode-root .time--main').evaluate((time) => getComputedStyle(time).fontSize)).toBe('48px');
  });

  test('analog: the case 260 px across, the shared dial', async ({ page }) => {
    await openApp(page, { mode: 'analog' });
    await settle(page);
    // The case: the drawing's largest circle.
    const caseWidth = await page.locator('.mode-root .analog-stack svg').first().evaluate((drawing) => Math.max(...[...drawing.querySelectorAll('circle')].map((circle) => circle.getBoundingClientRect().width)));
    expect(caseWidth).toBeCloseTo(260, 1);
  });

  test('timeline: the time 48 px, the compact track 360 px wide and 14 px below it', async ({ page }) => {
    await openApp(page, { mode: 'timeline' });
    await settle(page);
    expect(await page.locator('.mode-root .time--main').evaluate((time) => getComputedStyle(time).fontSize)).toBe('48px');
    const time = await page.locator('.mode-root .time--main').evaluate((element) => element.getBoundingClientRect().toJSON() as Box);
    const track = await page.locator('.mode-root .timeline__track').evaluate((element) => element.getBoundingClientRect().toJSON() as Box);
    expect(track.width).toBeCloseTo(360, 1);
    expect(track.y - (time.y + time.height)).toBeCloseTo(14, 0);
  });
});

/**
 * The elements over a grid of points across `selector`'s box, topmost first, with every element hit-testable:
 * each point's topmost element must be inside `owner`. Returns the points where it is not, described.
 */
async function covered(page: Page, selector: string, owner: string): Promise<string[]> {
  return page.evaluate(
    ({ selector, owner }) => {
      const style = document.createElement('style');
      style.textContent = '* { pointer-events: auto !important; }';
      document.head.append(style);
      const describe = (element: Element): string => `${element.tagName.toLowerCase()}.${(element.getAttribute('class') ?? '').trim().replace(/\s+/g, '.')}`;
      const found: string[] = [];
      for (const target of document.querySelectorAll(selector)) {
        const rect = target.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        for (let column = 1; column <= 5; column += 1) {
          for (let row = 1; row <= 3; row += 1) {
            const x = rect.x + (rect.width * column) / 6;
            const y = rect.y + (rect.height * row) / 4;
            const top = document.elementFromPoint(x, y);
            if (top === null || top.closest(owner) === null) found.push(`(${String(Math.round(x))}, ${String(Math.round(y))}): ${top === null ? 'nothing' : describe(top)} over ${selector}`);
          }
        }
      }
      style.remove();
      return found;
    },
    { selector, owner },
  );
}

/**
 * Held (paused or checking in), the display is frosted wherever the mode draws art behind it: that art is blurred
 * like the time, so no star or creature shows crisp through the dialog (round 2.11, bug 2). Over the theme's plain
 * background there is nothing to blur, and the frost is not drawn (decision 391).
 */
async function expectFrosted(page: Page): Promise<void> {
  const frost = page.locator('.mode-root .time-stack__frost').first();
  await expect(frost).toHaveClass(/time-stack__frost--on/);
  const look = await frost.evaluate((element) => {
    const style = getComputedStyle(element);
    const art = element.closest('.mode-root')?.querySelector(':scope > :is(.environment, .mode-art)') !== null;
    return { art, display: style.display, visibility: style.visibility, opacity: style.opacity, filter: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') };
  });
  if (!look.art) {
    expect(look.display).toBe('none');
    return;
  }
  expect(look.display).not.toBe('none');
  expect(look.visibility).toBe('visible');
  expect(look.opacity).toBe('1');
  expect(look.filter).toMatch(/^blur\(/);
}

test.describe('one layer order', () => {
  for (const mode of MODES) {
    test(`${mode}: no mode layer sits above check-in, pause or settings`, async ({ browser }) => {
      // Check-in: a session started over two hours ago, its check-in on screen.
      {
        const context = await browser.newContext();
        const page = await context.newPage();
        const session = createSession({ id: '7d1e3a5c-2b4f-4c6d-8e0a-1b3c5d7e9f20', mode, at: T_READY - 130 * MINUTE, timeZone: 'UTC' });
        await page.goto('/sw-control.json');
        await page.evaluate((text) => {
          localStorage.setItem('timer.active', text);
        }, serializeActiveState({ ...startState(session), presenceAt: T0 - 121 * MINUTE }));
        await openApp(page, { mode });
        await settle(page);
        await expect(page.locator('.check-in__text').first()).toBeVisible();
        expect(await covered(page, '.check-in__text', '.check-in')).toEqual([]);
        await expectFrosted(page);
        await context.close();
      }
      // Pause, then settings over the paused screen.
      const context = await browser.newContext();
      const page = await context.newPage();
      await openApp(page, { mode });
      await page.locator('.button--primary').click();
      await page.clock.runFor(10 * MINUTE);
      // The focus view has hidden the buttons by now: the keyboard pauses.
      await page.keyboard.press('Space');
      await page.clock.runFor(5 * SECOND);
      await settle(page);
      await expect(page.locator('.paused__label').first()).toBeVisible();
      expect(await covered(page, '.time--paused-for', '.paused')).toEqual([]);
      await expectFrosted(page);
      expect(await covered(page, '.controls .button', '.controls')).toEqual([]);
      await page.keyboard.press(',');
      await page.locator('.settings').waitFor();
      await settle(page);
      expect(await covered(page, '.settings', '.settings')).toEqual([]);
      await context.close();
    });
  }
});
