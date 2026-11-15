import { describe, expect, it } from 'vitest';
import { pauseSession, resumeSession } from './commands.ts';
import { createSession } from './commands.ts';
import { focusedMs } from './derive.ts';
import { HOUR, ID, MINUTE, T0 } from './fixtures.ts';
import { advance, checkInDueAt, defaultRules, nextTrigger, normaliseRules, pendingCheckIn } from './rules.ts';
import { startState } from './state.ts';
import type { ActiveState } from './state.ts';
import { parseActiveState } from './validate.ts';

const rules = defaultRules();
const fresh = (): ActiveState => startState(createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' }));

describe('check-ins', () => {
  it('fall due after a full interval of running time since the last sign of presence', () => {
    const state = fresh();
    expect(checkInDueAt(state, rules)).toBe(T0 + 2 * HOUR);
    expect(pendingCheckIn(state, rules, T0 + 2 * HOUR - 1)).toBeNull();
    expect(pendingCheckIn(state, rules, T0 + 2 * HOUR)).toBe(T0 + 2 * HOUR);
  });

  it('count again from a resume, and not at all while paused', () => {
    let state = fresh();
    state = { ...state, session: pauseSession(state.session, T0 + 110 * MINUTE), presenceAt: T0 + 110 * MINUTE };
    expect(checkInDueAt(state, rules)).toBeNull();
    state = { ...state, session: resumeSession(state.session, T0 + 2 * HOUR), presenceAt: T0 + 2 * HOUR };
    expect(checkInDueAt(state, rules)).toBe(T0 + 4 * HOUR);
  });
});

describe('rules in order', () => {
  it('pause a session whose check-in goes unanswered for an hour, backdated to the check-in', () => {
    const [outcome] = advance(fresh(), rules, T0 + 3 * HOUR);
    expect(outcome?.kind).toBe('paused');
    if (outcome?.kind !== 'paused') return;
    expect(outcome.at).toBe(T0 + 2 * HOUR);
    expect(outcome.state.missedCheckInAt).toBe(T0 + 2 * HOUR);
    expect(focusedMs(outcome.state.session, T0 + 10 * HOUR)).toBe(2 * HOUR);
    expect(() => parseActiveState(JSON.parse(JSON.stringify(outcome.state)))).not.toThrow();
  });

  it('do not pause while the hour to answer is still running', () => {
    expect(advance(fresh(), rules, T0 + 3 * HOUR - 1)).toEqual([]);
  });

  it('wait 12 hours after a missed check-in, ignoring the pause limit, then end dated to the check-in', () => {
    const outcomes = advance(fresh(), rules, T0 + 2 * HOUR + 12 * HOUR);
    expect(outcomes.map((o) => o.kind)).toEqual(['paused', 'ended']);
    const ended = outcomes[1];
    if (ended?.kind !== 'ended') return;
    expect(ended).toMatchObject({ reason: 'checkin_missed', at: T0 + 2 * HOUR });
    expect(ended.session.segments).toEqual([{ start: T0, end: T0 + 2 * HOUR }]);
    expect(advance(fresh(), rules, T0 + 14 * HOUR - 1).map((o) => o.kind)).toEqual(['paused']);
  });

  it('end a pause longer than the limit in force when it began, dated to when it began', () => {
    const paused: ActiveState = { ...fresh(), session: pauseSession(fresh().session, T0 + HOUR), presenceAt: T0 + HOUR, pauseLimitMs: 10 * MINUTE };
    expect(nextTrigger(paused, { ...rules, pauseLimit: 60 * MINUTE })).toEqual({ kind: 'pause-timeout', decidedAt: T0 + 70 * MINUTE, effectiveAt: T0 + HOUR });
    const [outcome] = advance(paused, rules, T0 + 70 * MINUTE);
    expect(outcome).toMatchObject({ kind: 'ended', reason: 'pause_timeout', at: T0 + HOUR });
  });

  it('end at exactly 16 hours of focus', () => {
    // Presence 13.5 h in: the next check-in falls due at 15.5 h and would be missed at 16.5 h,
    // so the maximum, decided first at 16 h, ends the session.
    const state: ActiveState = { ...fresh(), presenceAt: T0 + 13.5 * HOUR };
    const [outcome] = advance(state, rules, T0 + 20 * HOUR);
    expect(outcome).toMatchObject({ kind: 'ended', reason: 'max_duration', at: T0 + 16 * HOUR });
    if (outcome?.kind === 'ended') expect(focusedMs(outcome.session, T0 + 30 * HOUR)).toBe(16 * HOUR);
  });

  it('keep thresholds inside the plan ranges', () => {
    expect(normaliseRules({ checkInInterval: MINUTE, pauseLimit: 5 * HOUR })).toEqual({ checkInInterval: 30 * MINUTE, pauseLimit: 60 * MINUTE });
    expect(normaliseRules({ checkInInterval: Number.NaN, pauseLimit: 7 * MINUTE })).toEqual({ checkInInterval: 2 * HOUR, pauseLimit: 7 * MINUTE });
  });
});

describe('parseActiveState', () => {
  const valid = (): Record<string, unknown> => JSON.parse(JSON.stringify(fresh())) as Record<string, unknown>;

  it('accepts a saved state', () => {
    expect(parseActiveState(valid()).presenceAt).toBe(T0);
  });

  it.each([
    ['another schema', { schema: 2 }],
    ['presence before the start', { presenceAt: T0 - 1 }],
    ['a missed check-in on a running session', { missedCheckInAt: T0 + HOUR }],
    ['a pause limit outside the range', { pauseLimitMs: 1000 }],
    ['an extra field', { note: 'x' }],
  ])('rejects %s', (_label, change) => {
    expect(() => parseActiveState({ ...valid(), ...change })).toThrow();
  });

  it('rejects an ended session', () => {
    const state = valid();
    const session = state['session'] as Record<string, unknown>;
    expect(() => parseActiveState({ ...state, session: { ...session, endReason: 'user', segments: [{ start: T0, end: T0 + 1 }] } })).toThrow();
  });
});
