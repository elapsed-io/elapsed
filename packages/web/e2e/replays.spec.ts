/**
 * Results replays never stall (plan, Product principles; round 2.8): replays that draw time (the focus strip, the
 * rings, the profile charts) sweep evenly through the whole session, pauses drawn as blanks; the tree's, which
 * draws growth, and interstellar's, which draws distance, advance by focused time only. Each replay here is of a session with a pause in its middle, and is
 * stepped through its own time a frame at a time, its drawn extent read at each: it never goes back, and wherever
 * the replay moves on, the drawing never stands still for more than one frame.
 */

import { expect, test } from './test.ts';
import type { Page } from '@playwright/test';
import { MINUTE, openApp, untilEndNowAccepts } from './helpers.ts';

/** How far each replay has drawn, read from the page: one number that grows as the replay runs. */
const EXTENTS = {
  // The strip's and the chart's reveal slide in from the left (translateX from −100 % to 0).
  strip: '.strip__reveal',
  profile: '.profile__reveal',
  // The rings' minute hand sweeps the session (its turn, unwound past each whole turn).
  rings: '.rings__hand:last-of-type',
  // The tree grows (its scale).
  tree: '.tree__grow',
  // Interstellar's route lengthens with every focused minute (its stretch along the heading, as the camera pulls back).
  route: '.space-map__drawing line',
} as const;

const MODES = [
  ['digits', 'strip'],
  ['timeline', 'strip'],
  ['ring', 'rings'],
  ['analog', 'rings'],
  ['ocean', 'profile'],
  ['height', 'profile'],
  ['tree', 'tree'],
  ['interstellar', 'route'],
] as const;

/**
 * Twenty minutes of focus, a ten-minute pause, twenty more, on the test clock; then the clock runs in real time
 * from end now on, so the results and their replay play as they would.
 */
async function sessionWithPause(page: Page): Promise<void> {
  await page.locator('.button--primary').click();
  await page.clock.runFor(20 * MINUTE);
  await page.keyboard.press('Space');
  await page.clock.runFor(10 * MINUTE);
  await page.keyboard.press('Space');
  await page.clock.runFor(20 * MINUTE);
  await page.keyboard.press('e');
  await untilEndNowAccepts(page);
  await page.clock.resume();
  await page.getByRole('button', { name: 'end now' }).click();
}

interface Sample {
  /** The replay's progress (0 to 1) at this moment of its own time. */
  readonly progress: number;
  readonly extent: number;
}

/**
 * Steps the replay through its own time a frame (1/60 s) at a time, from its start to its end, and reads its
 * progress and its drawn extent at each step. Stepping the replay's clock, not waiting for the browser's frames,
 * measures the replay itself: a busy browser may draw fewer frames, which is not the replay standing still.
 */
async function stepReplay(page: Page, selector: string, kind: keyof typeof EXTENTS): Promise<Sample[]> {
  return page.evaluate(
    ({ selector, kind }) => {
      const results = document.querySelector('.results');
      const progress = results
        ?.getAnimations()
        .find((animation) => animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some((frame) => '--replay-progress' in frame));
      if (results === null || progress === undefined) return [];
      progress.pause();
      const duration = Number(progress.effect?.getTiming().duration ?? 0);
      const samples: Sample[] = [];
      let turn = 0;
      let last: number | null = null;
      const read = (): number | null => {
        const element = document.querySelector(selector);
        if (element === null) return null;
        const transform = getComputedStyle(element).transform;
        const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
        if (kind === 'tree') return matrix.a;
        // Stretched along the heading only: the linear part's trace is the stretch plus one.
        if (kind === 'route') return matrix.a + matrix.d;
        if (kind !== 'rings') return matrix.e;
        // Unwound: a hand never turns half a turn in one frame.
        const angle = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
        turn = last === null ? angle : turn + ((((angle - last) % 360) + 540) % 360) - 180;
        last = angle;
        return turn;
      };
      for (let time = 0; time <= duration; time += 1000 / 60) {
        progress.currentTime = time;
        const extent = read();
        if (extent !== null) samples.push({ progress: Number(getComputedStyle(results).getPropertyValue('--replay-progress')), extent });
      }
      return samples;
    },
    { selector, kind },
  );
}

for (const [mode, kind] of MODES) {
  test(`the ${mode} replay never goes back and never stalls for more than a frame, through a pause`, async ({ page }) => {
    await openApp(page, { mode, height: 520 });
    await sessionWithPause(page);
    await page.locator('.results[data-ready]').waitFor();
    const samples = await stepReplay(page, `.results ${EXTENTS[kind]}`, kind);
    expect(samples.length, 'the replay was read').toBeGreaterThan(30);
    const steps = samples.slice(1).map((sample, index) => ({ moved: sample.progress - (samples[index]?.progress ?? 0), drawn: sample.extent - (samples[index]?.extent ?? 0) }));
    // Never back (the strip and the chart slide toward 0 from the left, the hand and the tree grow).
    expect(Math.min(...steps.map(({ drawn }) => drawn)), JSON.stringify(samples)).toBeGreaterThanOrEqual(-1e-6);
    // Wherever the replay moves on (more than its curve's last settling), the drawing moves too: never still for
    // two frames in a row.
    const still = steps.map(({ moved, drawn }) => moved > 1e-4 && Math.abs(drawn) <= 1e-6);
    const stalls = still.map((now, index) => (now && still[index + 1] === true ? index : -1)).filter((index) => index >= 0);
    expect(stalls, JSON.stringify(samples)).toEqual([]);
  });
}
