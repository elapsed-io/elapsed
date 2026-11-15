import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config.ts';
import { focusedMs, pauseCount } from '../session/derive.ts';
import { HOUR, MINUTE, T0 } from '../session/fixtures.ts';
import { parseSession } from '../session/validate.ts';
import { harness } from './harness.ts';

const SECOND = 1000;

describe('starting', () => {
  it('starts a session at the current time and shows zero', () => {
    const h = harness();
    expect(h.engine.status).toBe('idle');
    expect(h.engine.start('digits')).toBe(true);
    const events = h.take();
    expect(h.types(events)).toEqual(['session.started', 'view.changed']);
    expect(h.engine.status).toBe('running');
    expect(h.engine.session?.segments).toEqual([{ start: T0, end: null }]);
    expect(h.engine.view).toMatchObject({ status: 'running', focusedMs: 0, shownMs: 0, precisionMs: 1000, mode: 'digits' });
    expect(() => parseSession(h.engine.session)).not.toThrow();
  });

  it('does nothing when asked to do something that does not apply', () => {
    const h = harness();
    expect(h.engine.pause()).toBe(false);
    expect(h.engine.resume()).toBe(false);
    expect(h.engine.end()).toBe(false);
    expect(h.engine.switchMode('ring')).toBe(false);
    h.engine.start('digits');
    h.take();
    expect(h.engine.start('digits')).toBe(false);
    expect(h.engine.resume()).toBe(false);
    expect(h.engine.switchMode('digits')).toBe(false);
    expect(h.take()).toEqual([]);
  });
});

describe('waking only for visible changes', () => {
  it('with seconds blurring away: every second to 10 s, every 10 s to a minute, then every minute', () => {
    const h = harness();
    h.engine.start('digits');
    h.take();
    h.clock.advance(HOUR);
    const events = h.take();
    const shown = h.views(events).map((view) => view.shownMs / SECOND);
    const minutes = Array.from({ length: 59 }, (_, i) => (i + 2) * 60);
    expect(shown).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, ...minutes]);
    // One wake per change, and nothing else.
    expect(h.clock.firedTimers).toBe(shown.length);
    expect(h.clock.pendingTimers).toBe(1);
  });

  it('with seconds always shown: every second', () => {
    const h = harness({ seconds: 'always' });
    h.engine.start('digits');
    h.take();
    h.clock.advance(10 * MINUTE);
    expect(h.views(h.take())).toHaveLength(600);
    expect(h.clock.firedTimers).toBe(600);
  });

  it('with seconds never shown: every minute', () => {
    const h = harness({ seconds: 'never' });
    h.engine.start('digits');
    h.take();
    h.clock.advance(10 * MINUTE);
    expect(h.views(h.take()).map((view) => view.shownMs)).toEqual(Array.from({ length: 10 }, (_, i) => (i + 1) * MINUTE));
  });

  it('changes pace when the seconds setting changes mid-session', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(5 * MINUTE);
    h.take();
    h.engine.setSecondsDisplay('always');
    expect(h.views(h.take())).toEqual([expect.objectContaining({ shownMs: 5 * MINUTE, precisionMs: SECOND })]);
    h.clock.advance(10 * SECOND);
    expect(h.views(h.take())).toHaveLength(10);
    expect(() => {
      h.engine.setSecondsDisplay('sometimes' as never);
    }).toThrow(TypeError);
  });
});

describe('pausing and resuming', () => {
  it('loses and gains no time, and counts the pause in seconds', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(30 * SECOND);
    h.take();
    expect(h.engine.pause()).toBe(true);
    const paused = h.take();
    expect(h.types(paused)).toEqual(['session.paused', 'view.changed']);
    expect(h.engine.view).toMatchObject({ status: 'paused', focusedMs: 30 * SECOND, pausedForShownMs: 0 });

    h.clock.advance(10 * MINUTE);
    const pauseViews = h.views(h.take());
    expect(pauseViews).toHaveLength(600);
    expect(pauseViews.at(-1)).toMatchObject({ focusedMs: 30 * SECOND, pausedForShownMs: 10 * MINUTE });

    expect(h.engine.resume()).toBe(true);
    h.clock.advance(30 * SECOND);
    const session = h.engine.session;
    expect(session === null ? 0 : focusedMs(session, h.clock.now())).toBe(MINUTE);
    expect(session === null ? 0 : pauseCount(session)).toBe(1);
    expect(h.engine.pause()).toBe(true);
    expect(h.engine.pause()).toBe(false);
  });

  it('refuses to pause once a session holds the most segments allowed', () => {
    const limits = CONFIG.session.limits as { maxSegments: number };
    const saved = limits.maxSegments;
    limits.maxSegments = 3;
    try {
      const h = harness();
      h.engine.start('digits');
      for (let i = 0; i < 2; i += 1) {
        h.clock.advance(SECOND);
        expect(h.engine.pause()).toBe(true);
        h.clock.advance(SECOND);
        expect(h.engine.resume()).toBe(true);
      }
      expect(h.engine.pause()).toBe(false);
      expect(h.engine.status).toBe('running');
      expect(h.engine.end()).toBe(true);
    } finally {
      limits.maxSegments = saved;
    }
  });
});

describe('milestones', () => {
  it('fires once per focused hour, dated exactly, across pauses', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(50 * MINUTE);
    h.engine.pause();
    h.clock.advance(20 * MINUTE);
    h.engine.resume();
    h.take();
    h.clock.advance(80 * MINUTE);
    const milestones = h.take().filter((event) => event.type === 'milestone.hour');
    expect(milestones.map((event) => [event.payload.hours, event.payload.at])).toEqual([
      [1, T0 + 80 * MINUTE],
      [2, T0 + 140 * MINUTE],
    ]);
  });

  it('starts counting again for a new session', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(HOUR);
    h.engine.end();
    h.engine.start('digits');
    h.take();
    h.clock.advance(HOUR);
    const milestones = h.take().filter((event) => event.type === 'milestone.hour');
    expect(milestones.map((event) => event.payload.hours)).toEqual([1]);
  });
});

describe('ending', () => {
  it('ends a running session, stops waking, and can start a new one', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(25 * MINUTE);
    h.take();
    expect(h.engine.end()).toBe(true);
    const events = h.take();
    expect(h.types(events)).toEqual(['session.ended', 'view.changed']);
    expect(events[0]).toMatchObject({ payload: { reason: 'user', at: T0 + 25 * MINUTE } });
    expect(h.engine.view).toMatchObject({ status: 'ended', focusedMs: 25 * MINUTE });
    expect(h.clock.pendingTimers).toBe(0);
    h.clock.advance(HOUR);
    expect(h.take()).toEqual([]);

    const first = h.engine.session;
    expect(h.engine.start('digits')).toBe(true);
    expect(h.engine.session?.id).not.toBe(first?.id);
  });

  it('ends a paused session where the pause began', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.engine.pause();
    h.clock.advance(5 * MINUTE);
    h.engine.end('pause_timeout');
    expect(h.engine.session?.segments).toEqual([{ start: T0, end: T0 + 10 * MINUTE }]);
    expect(h.engine.session?.endReason).toBe('pause_timeout');
    expect(() => h.engine.end('nope' as never)).toThrow(TypeError);
  });
});

describe('display modes', () => {
  it('records a switch and shows it', () => {
    const h = harness();
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.take();
    expect(h.engine.switchMode('ring')).toBe(true);
    const events = h.take();
    expect(h.types(events)).toEqual(['mode.switched', 'view.changed']);
    expect(h.engine.view.mode).toBe('ring');
    expect(h.engine.session?.modes).toEqual([
      { mode: 'digits', start: T0 },
      { mode: 'ring', start: T0 + MINUTE },
    ]);
  });
});

describe('robustness', () => {
  it('keeps going when a subscriber throws, and reports the error', () => {
    const h = harness();
    h.bus.on('view.changed', () => {
      throw new Error('display failed');
    });
    h.engine.start('digits');
    h.clock.advance(3 * SECOND);
    expect(h.errors).toHaveLength(4);
    expect(h.engine.view.shownMs).toBe(3 * SECOND);
  });

  it('delivers events in a consistent order when a subscriber issues a command', () => {
    const h = harness();
    h.bus.on('session.started', () => {
      h.engine.pause();
    });
    h.engine.start('digits');
    expect(h.types(h.take())).toEqual(['session.started', 'session.paused', 'view.changed']);
    expect(h.engine.status).toBe('paused');
  });

  it('shares only frozen sessions', () => {
    const h = harness();
    h.engine.start('digits');
    const session = h.engine.session;
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session?.segments)).toBe(true);
  });

  it('stops everything when disposed', () => {
    const h = harness();
    h.engine.start('digits');
    h.take();
    h.engine.dispose();
    expect(h.clock.pendingTimers).toBe(0);
    expect(h.engine.pause()).toBe(false);
    expect(h.engine.start('digits')).toBe(false);
    h.engine.sync();
    h.clock.advance(HOUR);
    expect(h.take()).toEqual([]);
  });
});
