/**
 * Round 4: the session survives refresh and a closed tab, the abandonment
 * rules (check-ins, missed check-ins, the pause limit, the session maximum),
 * stored data read back as untrusted input, tabs sharing one session, and
 * anonymous usage counts.
 */

import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Request } from '@playwright/test';
import { BRAND, createSession, resumeSession, pauseSession, serializeActiveState, startState } from '@stopwatch/core';
import type { ActiveState } from '@stopwatch/core';
import { MINUTE, SECOND, T0, T_READY, openApp, settle } from './helpers.ts';

const NAME = BRAND.name;
const HOUR = 60 * MINUTE;
const ID = '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f';

// Clock times on the paused screen follow the region; pin it so the text is exact.
test.use({ locale: 'en-US', timezoneId: 'UTC' });

const primary = (page: Page) => page.locator('.button--primary');
const checkIn = (page: Page) => page.locator('.check-in');
const paused = (page: Page) => page.locator('.paused');
const missed = (page: Page) => page.locator('.paused__missed');
const notice = (page: Page) => page.locator('.notice');

async function shownTime(page: Page, selector = '.time--main'): Promise<string> {
  return page.locator(selector).evaluate((element) => {
    const parts: string[] = [];
    const walk = (node: Node): void => {
      if (node instanceof HTMLElement && (getComputedStyle(node).display === 'none' || node.matches('.paused__label, .paused__missed'))) return;
      if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent ?? '');
      node.childNodes.forEach(walk);
    };
    walk(element);
    return parts.join('');
  });
}

async function storedKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage).sort());
}

/** Opens the site again in a new tab, `away` after the closed tab's last moment, with the clock held. */
async function reopenLater(context: BrowserContext, away: number): Promise<Page> {
  const later = await context.newPage();
  await later.setViewportSize({ width: 720, height: 450 });
  await later.clock.setSystemTime(T_READY + 10 * MINUTE + away);
  await later.goto('/');
  await later.locator('.button--primary').waitFor();
  return later;
}

/** Puts a saved session on the device before the site loads, as an earlier visit would have. */
async function seed(page: Page, entries: Readonly<Record<string, string>>): Promise<void> {
  // A same-origin page that runs no site script.
  await page.goto('/sw-control.json');
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, entries);
}

test.describe('a session survives', () => {
  test('a refresh, with no time lost', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(10 * MINUTE);
    expect(await storedKeys(page)).toEqual(['timer.active', 'timer.heartbeat']);
    await page.reload();
    await primary(page).waitFor();
    await expect(primary(page)).toHaveAccessibleName('pause');
    expect(await shownTime(page)).toBe('00:10');
    await page.clock.runFor(5 * MINUTE);
    expect(await shownTime(page)).toBe('00:15');
    expect(await page.title()).toBe(`00:15 · ${NAME}`);
  });

  test('a paused session survives a refresh still paused', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(3 * MINUTE);
    await primary(page).click();
    await page.clock.runFor(2 * MINUTE);
    await page.reload();
    await primary(page).waitFor();
    await expect(primary(page)).toHaveAccessibleName('resume');
    expect(await shownTime(page, '.time--paused-for')).toBe('00:02:00');
  });

  test('a tab closed for hours: the check-in it missed paused the session where it appeared', async ({ page, context }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(10 * MINUTE);
    await page.close();

    // Reopened five hours later: the check-in fell due at 16:00:30 and went unanswered for an hour.
    const later = await reopenLater(context, 5 * HOUR);
    await expect(primary(later)).toHaveAccessibleName('resume');
    await expect(paused(later)).toBeVisible();
    await expect(missed(later)).toHaveText('a check-in went unanswered at 4:00 pm');
    expect(await shownTime(later)).toBe('02:00');
    expect(await later.title()).toBe(`paused for 03:10 · ${NAME}`);

    // Resume continues the same session from the check-in.
    await primary(later).click();
    await later.clock.runFor(MINUTE);
    expect(await shownTime(later)).toBe('02:01');
    await expect(missed(later)).toBeHidden();
  });
});

test.describe('check-ins', () => {
  test('appear after two hours, are announced, and any key answers without doing anything else', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    // Focus stays on the pause button, so Space would press it if it were not consumed.
    await expect(primary(page)).toBeFocused();
    await page.clock.runFor(2 * HOUR - SECOND);
    await expect(checkIn(page)).toBeHidden();
    await page.clock.runFor(SECOND);
    await expect(checkIn(page)).toBeVisible();
    await expect(checkIn(page)).toHaveText('press any key if you’re still here');
    await expect(page.locator('[role="status"]')).toHaveText('press any key if you’re still here');
    expect(await page.title()).toBe(`check in · 02:00 · ${NAME}`);
    expect(await page.locator('.time--main').getAttribute('aria-hidden')).toBe('true');

    await page.keyboard.press('Space');
    await expect(checkIn(page)).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('pause');
    expect(await page.title()).toBe(`02:00 · ${NAME}`);
    // The next one falls due two hours after the answer.
    await page.clock.runFor(2 * HOUR - SECOND);
    await expect(checkIn(page)).toBeHidden();
    await page.clock.runFor(SECOND);
    await expect(checkIn(page)).toBeVisible();
  });

  test('a click on pause answers and pauses', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(2 * HOUR + 5 * MINUTE);
    await expect(checkIn(page)).toBeVisible();
    await primary(page).click();
    await settle(page);
    await expect(checkIn(page)).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('resume');
    await expect(missed(page)).toBeHidden();
    expect(await shownTime(page)).toBe('02:05');
  });

  test('a tap anywhere answers', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(2 * HOUR);
    await page.mouse.click(40, 400);
    await expect(checkIn(page)).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('pause');
  });

  test('unanswered for an hour, pause the session where it appeared, ignoring the pause limit', async ({ page }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(3 * HOUR + 10 * MINUTE);
    await expect(primary(page)).toHaveAccessibleName('resume');
    await expect(missed(page)).toHaveText('a check-in went unanswered at 4:00 pm');
    await expect(page.locator('[role="status"]')).toHaveText('a check-in went unanswered at 4:00 pm');
    expect(await shownTime(page)).toBe('02:00');
    expect(await shownTime(page, '.time--paused-for')).toBe('01:10:00');
    // Past the 30-minute pause limit, the session still waits.
    await page.clock.runFor(40 * MINUTE);
    await expect(primary(page)).toHaveAccessibleName('resume');
  });

  test('missed and left for 12 hours, the session ends', async ({ page, context }) => {
    await openApp(page);
    await primary(page).click();
    await page.clock.runFor(10 * MINUTE);
    await page.close();
    // The check-in fell due at 16:00:30; twelve hours after it, the session ended.
    const later = await reopenLater(context, 14 * HOUR);
    await expect(primary(later)).toHaveAccessibleName('start');
    expect(await storedKeys(later)).toEqual([]);
  });
});

test('a pause longer than the limit ends the session', async ({ page }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(5 * MINUTE);
  await primary(page).click();
  await page.clock.runFor(30 * MINUTE - SECOND);
  await expect(primary(page)).toHaveAccessibleName('resume');
  await page.clock.runFor(SECOND);
  await settle(page);
  await expect(primary(page)).toHaveAccessibleName('start');
  expect(await page.title()).toBe(NAME);
  expect(await storedKeys(page)).toEqual([]);
});

test.describe('the session maximum', () => {
  /** A session one minute short of 16 hours of focus, with recent signs of presence. */
  function nearlyMaximum(): ActiveState {
    let session = createSession({ id: ID, mode: 'digits', at: T0 - 16 * HOUR - 10 * MINUTE, timeZone: 'UTC' });
    session = pauseSession(session, T0 - 16 * HOUR);
    session = resumeSession(session, T0 - 15 * HOUR - 49 * MINUTE);
    // 10 minutes, then the running stretch: 16 hours of focus at T0 + 60 s, 30 s after the clock is held.
    return { ...startState(session), presenceAt: T0 - 30 * MINUTE };
  }

  test('ends the session at exactly 16 hours and explains it; view results returns to idle', async ({ page }) => {
    const state = nearlyMaximum();
    await seed(page, { 'timer.active': serializeActiveState(state), 'timer.heartbeat': String(T0 - 10 * SECOND) });
    await openApp(page);
    await expect(primary(page)).toHaveAccessibleName('pause');
    await page.clock.runFor(MINUTE);
    await expect(notice(page)).toBeVisible();
    await expect(page.locator('.notice__heading')).toHaveText('16-hour session max reached');
    await expect(page.locator('.notice__time')).toHaveText('16:00:00');
    await expect(page.locator('.notice__body')).toHaveText(
      'a single session can hold up to 16 hours of focus. this one has ended and been saved; start a new one whenever you’re ready.',
    );
    await expect(page.locator('.mode-root')).toBeHidden();
    await expect(page.locator('.screen > .controls')).toBeHidden();
    await expect(page.locator('[role="status"]')).toContainText('16-hour session max reached');
    expect(await storedKeys(page)).toEqual([]);

    await page.getByRole('button', { name: 'view results' }).click();
    await expect(notice(page)).toBeHidden();
    await expect(primary(page)).toHaveAccessibleName('start');
    expect(await shownTime(page)).toBe('00:00:00');
  });

  test('from the keyboard, the notice’s button has focus, and a new session can start right away', async ({ page }) => {
    await seed(page, { 'timer.active': serializeActiveState(nearlyMaximum()), 'timer.heartbeat': String(T0) });
    await openApp(page);
    await page.clock.runFor(MINUTE);
    await expect(notice(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'view results' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(notice(page)).toBeHidden();
    await expect(primary(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(primary(page)).toHaveAccessibleName('pause');
  });
});

test.describe('stored data is untrusted', () => {
  for (const [label, value] of [
    ['broken JSON', '{"schema":1,"session":'],
    ['a forged shape', JSON.stringify({ schema: 1, session: { segments: 'all of them' }, presenceAt: 0, missedCheckInAt: null, pauseLimitMs: null })],
    ['markup', '<img src=x onerror=alert(1)>'],
  ] as const) {
    test(`${label} is discarded and the site starts idle`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await seed(page, { 'timer.active': value, 'timer.heartbeat': 'soon' });
      await openApp(page);
      await expect(primary(page)).toHaveAccessibleName('start');
      expect(await storedKeys(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test('tabs show one session: started, paused and ended from either', async ({ page, context }) => {
  await openApp(page);
  await primary(page).click();
  await page.clock.runFor(4 * MINUTE);

  const other = await context.newPage();
  await other.setViewportSize({ width: 720, height: 450 });
  await other.goto('/');
  await primary(other).waitFor();
  await expect(primary(other)).toHaveAccessibleName('pause');
  expect(await shownTime(other)).toBe('00:04');

  await primary(other).click();
  await expect(primary(page)).toHaveAccessibleName('resume');
  await page.clock.runFor(MINUTE);
  expect(await shownTime(page, '.time--paused-for')).toBe(await shownTime(other, '.time--paused-for'));

  await primary(page).click();
  await expect(primary(other)).toHaveAccessibleName('pause');

  await other.keyboard.press('e');
  await expect(primary(page)).toHaveAccessibleName('start');
  expect(await storedKeys(page)).toEqual([]);
});

test.describe('anonymous usage counts', () => {
  async function watchCounts(page: Page): Promise<Request[]> {
    const counted: Request[] = [];
    await page.route('**/api/count', async (route) => {
      counted.push(route.request());
      await route.fulfill({ status: 204 });
    });
    return counted;
  }

  test('count a visit and a session start, with nothing but the event’s name', async ({ page }) => {
    const counted = await watchCounts(page);
    await openApp(page);
    await expect.poll(() => counted.length).toBe(1);
    await primary(page).click();
    await expect.poll(() => counted.length).toBe(2);
    expect(counted.map((request) => request.postData())).toEqual(['{"event":"visit"}', '{"event":"session"}']);
    for (const request of counted) {
      const headers = await request.allHeaders();
      expect(request.method()).toBe('POST');
      expect(headers['content-type']).toBe('application/json');
      expect(headers['cookie']).toBeUndefined();
      expect(headers['referer']).toBeUndefined();
    }
  });

  // Without the fake clock, which hides the browser's navigation entries.
  test('count no visit for a reload, and no session for a restored one', async ({ page }) => {
    const counted = await watchCounts(page);
    const ready = async (): Promise<void> => {
      const control = page.waitForRequest('**/sw-control.json');
      await primary(page).waitFor();
      await control;
    };
    let loaded = ready();
    await page.goto('/');
    await loaded;
    await primary(page).click();
    await expect.poll(() => counted.length).toBe(2);
    loaded = ready();
    await page.reload();
    await loaded;
    await expect(primary(page)).toHaveAccessibleName('pause');
    expect(counted.map((request) => request.postData())).toEqual(['{"event":"visit"}', '{"event":"session"}']);
  });

  test('store nothing on the device to count', async ({ page }) => {
    await watchCounts(page);
    await page.goto('/');
    await primary(page).waitFor();
    expect(await storedKeys(page)).toEqual([]);
  });
});
