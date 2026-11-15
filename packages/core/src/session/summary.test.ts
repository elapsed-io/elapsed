import { describe, expect, it } from 'vitest';
import { createSession, endSession, pauseSession, resumeSession, switchMode } from './commands.ts';
import { ID, MINUTE, T0 } from './fixtures.ts';
import { summarise } from './summary.ts';

const SECOND = 1000;

describe('session summary', () => {
  it('derives every number on the results screen from the segments', () => {
    let session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
    session = pauseSession(session, T0 + 92 * MINUTE);
    session = resumeSession(session, T0 + 102 * MINUTE);
    session = pauseSession(session, T0 + 150 * MINUTE);
    session = resumeSession(session, T0 + 158 * MINUTE);
    session = endSession(session, 'user', T0 + 185 * MINUTE + 40 * SECOND);
    expect(summarise(session)).toEqual({
      startedAt: T0,
      endedAt: T0 + 185 * MINUTE + 40 * SECOND,
      focusedMs: 167 * MINUTE + 40 * SECOND,
      elapsedMs: 185 * MINUTE + 40 * SECOND,
      pausedMs: 18 * MINUTE,
      pauses: 2,
      longestStretchMs: 92 * MINUTE,
      replayMode: 'digits',
    });
  });

  it('replays in the mode shown longest, the first on a tie', () => {
    let session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
    session = switchMode(session, 'ring', T0 + 10 * MINUTE);
    session = switchMode(session, 'digits', T0 + 40 * MINUTE);
    session = endSession(session, 'user', T0 + 60 * MINUTE);
    // digits 10 + 20 = 30 min, ring 30 min: a tie.
    expect(summarise(session).replayMode).toBe('digits');
    let longer = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
    longer = switchMode(longer, 'timeline', T0 + 5 * MINUTE);
    longer = endSession(longer, 'user', T0 + 60 * MINUTE);
    expect(summarise(longer).replayMode).toBe('timeline');
  });

  it('ends where an automatic end dated it, with no pause after it', () => {
    let session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });
    session = pauseSession(session, T0 + 20 * MINUTE);
    session = endSession(session, 'pause_timeout', T0 + 20 * MINUTE, { backdate: true });
    expect(summarise(session)).toMatchObject({ endedAt: T0 + 20 * MINUTE, pausedMs: 0, pauses: 0, focusedMs: 20 * MINUTE });
  });

  it('refuses an open session', () => {
    expect(() => summarise(createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' }))).toThrow();
  });
});
