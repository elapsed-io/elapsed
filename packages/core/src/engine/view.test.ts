import { describe, expect, it } from 'vitest';
import { createSession, pauseSession } from '../session/commands.ts';
import { ID, T0 } from '../session/fixtures.ts';
import { computeView, focusPrecision, msUntilNextChange, viewKey } from './view.ts';

describe('focusPrecision', () => {
  it('blurs the seconds away: ones until 10 s, tens until 60 s, then minutes', () => {
    expect(focusPrecision('blur-away', 0)).toBe(1000);
    expect(focusPrecision('blur-away', 9_999)).toBe(1000);
    expect(focusPrecision('blur-away', 10_000)).toBe(10_000);
    expect(focusPrecision('blur-away', 59_999)).toBe(10_000);
    expect(focusPrecision('blur-away', 60_000)).toBe(60_000);
  });

  it('keeps or hides seconds when asked', () => {
    expect(focusPrecision('always', 5 * 3_600_000)).toBe(1000);
    expect(focusPrecision('never', 0)).toBe(60_000);
  });
});

describe('computeView', () => {
  const session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });

  it('describes an idle timer', () => {
    const view = computeView(null, T0, 'blur-away');
    expect(view).toMatchObject({ status: 'idle', focusedMs: 0, shownMs: 0, precisionMs: 1000, mode: null });
    expect(msUntilNextChange(view)).toBeNull();
  });

  it('rounds focused time down to what is visible and finds the next change', () => {
    const view = computeView(session, T0 + 25_300, 'blur-away');
    expect(view).toMatchObject({ status: 'running', focusedMs: 25_300, shownMs: 20_000, precisionMs: 10_000, mode: 'digits' });
    expect(msUntilNextChange(view)).toBe(4_700);
    const later = computeView(session, T0 + 125_000, 'blur-away');
    expect(later.shownMs).toBe(120_000);
    expect(msUntilNextChange(later)).toBe(55_000);
  });

  it('counts the pause in whole seconds while paused', () => {
    const paused = pauseSession(session, T0 + 90_000);
    const view = computeView(paused, T0 + 90_000 + 4_250, 'blur-away');
    expect(view).toMatchObject({ status: 'paused', focusedMs: 90_000, shownMs: 60_000, pausedForMs: 4_250, pausedForShownMs: 4_000 });
    expect(msUntilNextChange(view)).toBe(750);
  });

  it('gives the same key to views that look the same', () => {
    expect(viewKey(computeView(session, T0 + 61_000, 'blur-away'))).toBe(viewKey(computeView(session, T0 + 119_999, 'blur-away')));
    expect(viewKey(computeView(session, T0 + 61_000, 'blur-away'))).not.toBe(viewKey(computeView(session, T0 + 120_000, 'blur-away')));
  });
});
