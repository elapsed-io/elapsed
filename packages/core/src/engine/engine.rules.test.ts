/**
 * Round 4 rules through the engine, with the fake clock: check-ins, missed
 * check-ins, the pause limit, the session maximum, lid-shut replay, heartbeat
 * and gaps, restoring saved state, and adopting another tab's state.
 */

import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config.ts';
import { focusedMs } from '../session/derive.ts';
import { HOUR, MINUTE, T0 } from '../session/fixtures.ts';
import { defaultRules } from '../session/rules.ts';
import type { ActiveState } from '../session/state.ts';
import { parseActiveState } from '../session/validate.ts';
import { harness } from './harness.ts';
import type { Recorded } from './harness.ts';

const rules = defaultRules();
const SECOND = 1000;
const of = <T extends Recorded['type']>(events: readonly Recorded[], type: T) =>
  events.filter((event): event is Extract<Recorded, { type: T }> => event.type === type);

describe('check-ins', () => {
  it('appear after 2 hours of running and are answered by any sign of presence', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.clock.advance(2 * HOUR - SECOND);
    expect(h.engine.view.checkInDueAt).toBeNull();
    h.take();
    h.clock.advance(SECOND);
    const due = of(h.take(), 'checkin.due');
    expect(due.map((e) => e.payload.at)).toEqual([T0 + 2 * HOUR]);
    expect(h.engine.view).toMatchObject({ status: 'running', checkInDueAt: T0 + 2 * HOUR });
    h.clock.advance(20 * MINUTE);
    expect(h.engine.answerCheckIn()).toBe(true);
    expect(h.engine.view.checkInDueAt).toBeNull();
    expect(h.engine.view.focusedMs).toBe(2 * HOUR + 20 * MINUTE);
    // The next one falls due 2 hours after the answer.
    h.clock.advance(2 * HOUR - SECOND);
    expect(h.engine.view.checkInDueAt).toBeNull();
    h.clock.advance(SECOND);
    expect(h.engine.view.checkInDueAt).toBe(T0 + 4 * HOUR + 20 * MINUTE);
    expect(h.engine.answerCheckIn()).toBe(true);
    expect(h.engine.answerCheckIn()).toBe(false);
  });

  it('count running time since the last pause or resume, not across pauses', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.clock.advance(110 * MINUTE);
    h.engine.pause();
    h.clock.advance(10 * MINUTE);
    h.engine.resume();
    h.clock.advance(119 * MINUTE);
    expect(h.engine.view.checkInDueAt).toBeNull();
    h.clock.advance(MINUTE);
    expect(h.engine.view.checkInDueAt).toBe(T0 + 4 * HOUR);
  });

  it('when missed for an hour, pause the session where the check-in appeared, ignoring the pause limit', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.clock.advance(3 * HOUR);
    const paused = of(h.take(), 'session.paused');
    expect(paused.map((e) => [e.payload.reason, e.payload.at])).toEqual([['checkin_missed', T0 + 2 * HOUR]]);
    expect(h.engine.view).toMatchObject({ status: 'paused', focusedMs: 2 * HOUR, missedCheckInAt: T0 + 2 * HOUR, pausedForMs: HOUR });
    // The 30-minute pause limit does not apply to this pause.
    h.clock.advance(5 * HOUR);
    expect(h.engine.status).toBe('paused');
    expect(h.engine.resume()).toBe(true);
    expect(h.engine.view.missedCheckInAt).toBeNull();
    h.clock.advance(MINUTE);
    expect(h.engine.view.focusedMs).toBe(2 * HOUR + MINUTE);
  });

  it('after a missed check-in, wait 12 hours, then end dated to the check-in', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.clock.advance(2 * HOUR + 12 * HOUR);
    const ended = of(h.take(), 'session.ended');
    expect(ended.map((e) => [e.payload.reason, e.payload.at])).toEqual([['checkin_missed', T0 + 2 * HOUR]]);
    expect(h.engine.status).toBe('ended');
    expect(h.engine.state).toBeNull();
    expect(h.clock.pendingTimers).toBe(0);
  });
});

describe('pause limit', () => {
  it('ends a pause longer than the limit, dated to when it began; a changed limit applies from the next pause', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.clock.advance(10 * MINUTE);
    h.engine.pause();
    h.engine.setRules({ ...rules, pauseLimit: 5 * MINUTE });
    h.clock.advance(29 * MINUTE);
    expect(h.engine.status).toBe('paused');
    h.take();
    h.clock.advance(MINUTE);
    expect(of(h.take(), 'session.ended').map((e) => [e.payload.reason, e.payload.at])).toEqual([['pause_timeout', T0 + 10 * MINUTE]]);
    expect(h.engine.session?.segments).toEqual([{ start: T0, end: T0 + 10 * MINUTE }]);

    h.engine.start('digits');
    h.engine.pause();
    h.clock.advance(5 * MINUTE);
    expect(h.engine.status).toBe('ended');
  });
});

describe('session maximum', () => {
  it('ends at exactly 16 hours of focus', () => {
    const h = harness({ rules, seconds: 'never' });
    h.engine.start('digits');
    for (let hour = 2; hour <= 16; hour += 2) {
      h.clock.advance(2 * HOUR);
      h.engine.answerCheckIn();
    }
    const ended = of(h.take(), 'session.ended');
    expect(ended.map((e) => [e.payload.reason, e.payload.at])).toEqual([['max_duration', T0 + 16 * HOUR]]);
    const session = h.engine.session;
    expect(session === null ? 0 : focusedMs(session, T0 + 30 * HOUR)).toBe(16 * HOUR);
    expect(h.engine.view).toMatchObject({ status: 'ended', endReason: 'max_duration' });
  });
});

describe('lid shut', () => {
  it('a check-in that fell due while asleep can still be answered within the hour, crediting the time', () => {
    const h = harness({ rules, heartbeat: true });
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.clock.sleep(2 * HOUR + 39 * MINUTE);
    h.engine.sync();
    expect(h.engine.view).toMatchObject({ status: 'running', checkInDueAt: T0 + 2 * HOUR });
    expect(h.engine.answerCheckIn()).toBe(true);
    expect(h.engine.view.focusedMs).toBe(2 * HOUR + 40 * MINUTE);
  });

  it('after the hour, the check-in is missed: credited only up to it', () => {
    const h = harness({ rules, heartbeat: true });
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.clock.sleep(4 * HOUR);
    h.engine.sync();
    expect(h.engine.view).toMatchObject({ status: 'paused', focusedMs: 2 * HOUR, missedCheckInAt: T0 + 2 * HOUR });
  });
});

describe('heartbeat and gaps', () => {
  it('beats every 30 seconds while a session is open', () => {
    const h = harness({ heartbeat: true });
    h.engine.start('digits');
    h.take();
    h.clock.advance(5 * MINUTE);
    expect(of(h.take(), 'gap.detected')).toEqual([]);
    h.engine.end();
    h.clock.advance(5 * MINUTE);
    expect(h.clock.pendingTimers).toBe(0);
  });

  it('records a gap when the device slept for more than 5 minutes, without changing focus', () => {
    const h = harness({ heartbeat: true });
    h.engine.start('digits');
    h.clock.advance(MINUTE);
    h.clock.sleep(4 * MINUTE);
    h.engine.sync();
    expect(h.engine.session?.gaps).toEqual([]);
    h.clock.sleep(20 * MINUTE);
    h.engine.sync();
    const gaps = h.engine.session?.gaps ?? [];
    expect(gaps).toHaveLength(1);
    expect((gaps[0]?.end ?? 0) - (gaps[0]?.start ?? 0)).toBeGreaterThan(CONFIG.session.gapThreshold);
    expect(h.engine.view.focusedMs).toBe(25 * MINUTE);
    expect(() => parseActiveState(JSON.parse(JSON.stringify(h.engine.state)))).not.toThrow();
  });
});

describe('restore and adopt', () => {
  it('resumes a saved session after a refresh with no time lost', () => {
    const first = harness({ rules, heartbeat: true });
    first.engine.start('digits');
    first.clock.advance(30 * MINUTE);
    const saved = JSON.parse(JSON.stringify(first.engine.state)) as unknown;

    const second = harness({ rules, heartbeat: true, now: T0 + 30 * MINUTE + 20 * SECOND });
    expect(second.engine.restore(parseActiveState(saved), T0 + 30 * MINUTE)).toBe(true);
    expect(second.engine.view.focusedMs).toBe(30 * MINUTE + 20 * SECOND);
    expect(second.types(second.take())).not.toContain('session.started');
    expect(second.engine.session?.gaps).toEqual([]);
  });

  it('records a gap and replays the rules for a tab reopened hours later', () => {
    const second = harness({ rules, heartbeat: true, now: T0 + 5 * HOUR });
    const first = harness({ rules });
    first.engine.start('digits');
    second.engine.restore(parseActiveState(JSON.parse(JSON.stringify(first.engine.state))), T0 + 10 * MINUTE);
    expect(second.engine.view).toMatchObject({ status: 'paused', focusedMs: 2 * HOUR, missedCheckInAt: T0 + 2 * HOUR });
    expect(second.engine.session?.gaps).toEqual([{ start: T0 + 10 * MINUTE, end: T0 + 5 * HOUR }]);
  });

  it('resumes from the last saved elapsed time when the clock is behind the last heartbeat, crediting nothing for the closed period', () => {
    const first = harness({ rules });
    first.engine.start('digits');
    first.clock.advance(40 * MINUTE);
    const saved = parseActiveState(JSON.parse(JSON.stringify(first.engine.state)));
    // Reopened with the device clock an hour behind the last heartbeat.
    const second = harness({ rules, heartbeat: true, now: T0 + 40 * MINUTE - HOUR });
    second.engine.restore(saved, T0 + 40 * MINUTE);
    expect(second.engine.view.focusedMs).toBe(40 * MINUTE);
    second.clock.advance(MINUTE);
    expect(second.engine.view.focusedMs).toBe(41 * MINUTE);
  });

  it('shows another tab’s session without starting one, and goes idle when it ends there', () => {
    const tab = harness({ rules });
    const other = harness({ rules });
    other.engine.start('ring');
    other.clock.advance(5 * MINUTE);
    tab.clock.advance(5 * MINUTE);
    tab.take();
    tab.engine.adopt(other.engine.state);
    expect(tab.types(tab.take())).toEqual(['view.changed']);
    expect(tab.engine.view).toMatchObject({ status: 'running', focusedMs: 5 * MINUTE, mode: 'ring' });
    tab.engine.adopt(null);
    expect(tab.engine.status).toBe('idle');
  });

  it('takes up another tab’s answer before a frozen tab applies the rules', () => {
    let saved: ActiveState | null = null;
    const a = harness({ rules });
    a.bus.on('state.changed', ({ state }) => {
      saved = state;
    });
    let pulls = 0;
    const b = harness({
      rules,
      beforeWake: () => {
        pulls += 1;
        b.engine.adopt(saved);
      },
    });
    a.engine.start('digits');
    b.engine.adopt(saved);
    a.clock.advance(2 * HOUR + 10 * MINUTE);
    expect(a.engine.answerCheckIn()).toBe(true);
    // Tab b was frozen in the background; its overdue timers fire when it thaws an hour later.
    b.clock.sleep(3 * HOUR + 10 * MINUTE, { monotonic: 'advances' });
    expect(pulls).toBeGreaterThan(0);
    expect(of(b.take(), 'session.paused')).toEqual([]);
    expect(b.engine.view).toMatchObject({ status: 'running', focusedMs: 3 * HOUR + 10 * MINUTE, checkInDueAt: null });
  });

  it('records no gap for time another tab was watching', () => {
    let beat = T0;
    const b = harness({
      rules,
      heartbeat: true,
      beforeWake: () => {
        b.engine.observeHeartbeat(beat);
      },
    });
    b.engine.start('digits');
    // Another tab kept writing heartbeats while this one was frozen.
    beat = T0 + HOUR - 20 * SECOND;
    b.clock.sleep(HOUR, { monotonic: 'advances' });
    expect(b.engine.session?.gaps).toEqual([]);
    // Without that tab, the same freeze is a gap.
    b.clock.sleep(HOUR, { monotonic: 'advances' });
    expect(b.engine.session?.gaps).toEqual([{ start: T0 + HOUR - 20 * SECOND, end: T0 + 2 * HOUR }]);
  });

  it('does not announce a check-in again when another tab only recorded a gap', () => {
    const tab = harness({ rules });
    tab.engine.start('digits');
    tab.clock.advance(2 * HOUR);
    expect(of(tab.take(), 'checkin.due')).toHaveLength(1);
    const state = tab.engine.state;
    if (state === null) throw new Error('expected an open session');
    const withGap = parseActiveState(
      JSON.parse(JSON.stringify({ ...state, session: { ...state.session, gaps: [{ start: T0 + MINUTE, end: T0 + 7 * MINUTE }] } })),
    );
    tab.engine.adopt(withGap);
    expect(of(tab.take(), 'checkin.due')).toEqual([]);
    expect(tab.engine.view.checkInDueAt).toBe(T0 + 2 * HOUR);
  });

  it('reports every change to the saved state', () => {
    const h = harness({ rules });
    h.engine.start('digits');
    h.engine.pause();
    h.engine.resume();
    h.engine.end();
    const states = of(h.take(), 'state.changed').map((e) => e.payload.state?.session.segments.length ?? null);
    expect(states).toEqual([1, 1, 2, null]);
  });
});
