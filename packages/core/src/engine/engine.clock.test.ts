/**
 * The round 2 brief: unit tests with fake time cover sleep, throttling and
 * system clock changes. Policies follow the owner's decisions of 2026-11-15:
 * a device clock set back shifts the open session; a forward jump counts
 * like sleep; time zones and daylight saving changes are not jumps.
 */

import { describe, expect, it } from 'vitest';
import { focusedMs } from '../session/derive.ts';
import { HOUR, MINUTE, T0 } from '../session/fixtures.ts';
import { parseSession } from '../session/validate.ts';
import { harness } from './harness.ts';
import type { Recorded } from './harness.ts';

const SECOND = 1000;

function focusNow(h: ReturnType<typeof harness>): number {
  const session = h.engine.session;
  return session === null ? 0 : focusedMs(session, h.clock.now());
}

function milestones(events: readonly Recorded[]): [number, number][] {
  return events.flatMap((event) => (event.type === 'milestone.hour' ? [[event.payload.hours, event.payload.at] as [number, number]] : []));
}

describe('sleep', () => {
  it('credits a shut lid when the monotonic clock pauses during sleep (macOS)', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(5 * MINUTE);
    h.take();
    h.clock.sleep(2 * HOUR);
    // No code runs while asleep; the pending wake comes when its delay has passed after waking.
    expect(h.take()).toEqual([]);
    h.clock.advance(MINUTE);
    const events = h.take();
    expect(h.types(events)).toEqual(['milestone.hour', 'milestone.hour', 'view.changed']);
    expect(milestones(events)).toEqual([
      [1, T0 + HOUR],
      [2, T0 + 2 * HOUR],
    ]);
    // One render with the current value, not one per minute missed.
    expect(h.views(events)[0]).toMatchObject({ focusedMs: 2 * HOUR + 6 * MINUTE, shownMs: 2 * HOUR + 6 * MINUTE });
  });

  it('catches up at once when the page reports waking', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(5 * MINUTE);
    h.clock.sleep(2 * HOUR);
    h.take();
    h.engine.sync();
    expect(h.engine.view.focusedMs).toBe(2 * HOUR + 5 * MINUTE);
  });

  it('credits a shut lid when the monotonic clock keeps counting during sleep (Windows)', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(5 * MINUTE);
    h.take();
    h.clock.sleep(2 * HOUR, { monotonic: 'advances' });
    const events = h.take();
    expect(h.types(events)).toEqual(['milestone.hour', 'milestone.hour', 'view.changed']);
    expect(h.views(events)[0]?.focusedMs).toBe(2 * HOUR + 5 * MINUTE);
  });

  it('adds sleep to a pause, not to focus', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.engine.pause();
    h.clock.sleep(HOUR);
    h.engine.sync();
    expect(h.engine.view).toMatchObject({ status: 'paused', focusedMs: 10 * MINUTE, pausedForMs: HOUR });
  });
});

describe('throttling', () => {
  it('stays exact when a background tab fires timers once a minute', () => {
    const h = harness();
    h.clock.throttle(MINUTE);
    h.engine.start('digits');
    h.take();
    h.clock.advance(2 * HOUR);
    const views = h.views(h.take());
    for (const view of views) {
      expect(view.focusedMs).toBe(view.at - T0);
      expect(view.shownMs).toBe(Math.floor(view.focusedMs / view.precisionMs) * view.precisionMs);
    }
    const shown = views.map((view) => view.shownMs);
    expect(shown).toEqual([...shown].sort((a, b) => a - b));
    expect(h.clock.firedTimers).toBeLessThanOrEqual(121);
    h.engine.sync();
    expect(h.engine.view.focusedMs).toBe(2 * HOUR);
  });

  it('shows every second it can when timers are aligned to a second', () => {
    const h = harness({ seconds: 'always' });
    h.clock.throttle(SECOND);
    h.engine.start('digits');
    h.take();
    h.clock.advance(MINUTE);
    const views = h.views(h.take());
    expect(views.at(-1)?.shownMs).toBeGreaterThanOrEqual(MINUTE - SECOND);
    for (const view of views) expect(view.focusedMs).toBe(view.at - T0);
  });

  it('dates a milestone exactly even when it is noticed late', () => {
    const h = harness();
    h.clock.throttle(5 * MINUTE);
    h.engine.start('digits');
    h.take();
    h.clock.advance(HOUR + 10 * MINUTE);
    expect(milestones(h.take())).toEqual([[1, T0 + HOUR]]);
  });
});

describe('device clock set back', () => {
  it('shifts a running session back by the jump, losing no time', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.take();
    h.clock.jumpDeviceClock(-HOUR);
    h.clock.advance(MINUTE);
    const events = h.take();
    expect(h.types(events)).toEqual(['clock.jumped', 'view.changed']);
    expect(events[0]).toMatchObject({ payload: { deltaMs: -HOUR, at: T0 + 11 * MINUTE - HOUR } });
    expect(h.engine.session?.segments).toEqual([{ start: T0 - HOUR, end: null }]);
    expect(h.engine.view.focusedMs).toBe(11 * MINUTE);
    expect(() => parseSession(h.engine.session)).not.toThrow();
  });

  it('notices at once when the page syncs', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.take();
    h.clock.jumpDeviceClock(-2 * HOUR);
    h.engine.sync();
    expect(h.types(h.take())).toEqual(['clock.jumped']);
    expect(h.engine.view.focusedMs).toBe(10 * MINUTE);
  });

  it('keeps a pause intact and the segments in order', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(5 * MINUTE);
    h.engine.pause();
    h.clock.advance(3 * MINUTE);
    h.clock.jumpDeviceClock(-30 * MINUTE);
    h.engine.sync();
    expect(h.engine.view).toMatchObject({ focusedMs: 5 * MINUTE, pausedForMs: 3 * MINUTE });
    h.engine.resume();
    h.clock.advance(MINUTE);
    expect(focusNow(h)).toBe(6 * MINUTE);
    expect(() => parseSession(h.engine.session)).not.toThrow();
  });

  it('absorbs a small step without shifting, and never records time out of order', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * SECOND);
    h.take();
    h.clock.jumpDeviceClock(-100);
    expect(h.engine.pause()).toBe(true);
    expect(h.types(h.take())).toEqual(['session.paused', 'view.changed']);
    expect(h.engine.session?.segments).toEqual([{ start: T0, end: T0 + 10 * SECOND }]);
    expect(() => parseSession(h.engine.session)).not.toThrow();
  });

  it('shifts once small steps add up past the tolerance', () => {
    const h = harness();
    h.engine.start('digits');
    h.take();
    for (let i = 0; i < 3; i += 1) {
      h.clock.jumpDeviceClock(-100);
      h.engine.sync();
    }
    const jumps = h.take().filter((event) => event.type === 'clock.jumped');
    expect(jumps.map((event) => event.payload.deltaMs)).toEqual([-300]);
    h.clock.advance(10 * SECOND);
    expect(focusNow(h)).toBe(10 * SECOND);
  });

  it('measures the jump against the monotonic clock even across a long freeze', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.take();
    // The clock is set back 30 minutes during an hour in which the monotonic clock kept counting.
    h.clock.jumpDeviceClock(-30 * MINUTE);
    h.clock.sleep(HOUR, { monotonic: 'advances' });
    const jumps = h.take().filter((event) => event.type === 'clock.jumped');
    expect(jumps.map((event) => event.payload.deltaMs)).toEqual([-30 * MINUTE]);
    expect(h.engine.view.focusedMs).toBe(61 * MINUTE);
  });

  it('changes nothing while idle, and a new session starts at the new time', () => {
    const h = harness();
    h.clock.jumpDeviceClock(-HOUR);
    h.engine.sync();
    h.engine.start('digits');
    expect(h.types(h.take())).toEqual(['session.started', 'view.changed']);
    expect(h.engine.session?.segments[0]?.start).toBe(T0 - HOUR);
  });

  it('leaves an ended session as it was', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.engine.end();
    const ended = h.engine.session;
    h.take();
    h.clock.jumpDeviceClock(-HOUR);
    h.engine.sync();
    expect(h.take()).toEqual([]);
    expect(h.engine.session).toBe(ended);
  });
});

describe('device clock set forward', () => {
  it('counts like sleep: the plan caps it with check-ins (round 4) and server checks (Release 3)', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.take();
    h.clock.jumpDeviceClock(HOUR);
    h.engine.sync();
    const events = h.take();
    expect(h.types(events)).toEqual(['milestone.hour', 'view.changed']);
    expect(h.engine.view.focusedMs).toBe(HOUR + 10 * MINUTE);
  });
});

describe('time zones and daylight saving', () => {
  it('are not jumps: elapsed time is UTC, and the local day is fixed at the start', () => {
    // 01:30 EDT on the morning New York falls back to EST (at 06:00 UTC).
    const h = harness({ now: Date.UTC(2026, 10, 1, 5, 30), timeZone: 'America/New_York' });
    h.engine.start('digits');
    expect(h.engine.session?.localDay).toBe('2026-10-31');
    h.clock.advance(HOUR);
    h.setTimeZone('Asia/Tokyo');
    h.engine.sync();
    expect(h.engine.view.focusedMs).toBe(HOUR);
    expect(h.engine.session?.localDay).toBe('2026-10-31');
    expect(h.take().some((event) => event.type === 'clock.jumped')).toBe(false);
  });

  it('records the local day of the zone in force when a session starts', () => {
    const h = harness({ now: Date.UTC(2026, 10, 16, 2, 0), timeZone: 'Asia/Tokyo' });
    h.engine.start('digits');
    expect(h.engine.session?.localDay).toBe('2026-11-16'); // 11:00 in Tokyo
    h.engine.end();
    h.setTimeZone('America/Los_Angeles');
    h.engine.start('digits');
    expect(h.engine.session?.localDay).toBe('2026-11-15'); // 18:00 the day before in Los Angeles
  });
});
