import { describe, expect, it } from 'vitest';
import { createSession, endSession, pauseSession, resumeSession, shiftSession, switchMode } from './commands.ts';
import {
  currentMode,
  focusedMs,
  latestStamp,
  longestStretchMs,
  pauseCount,
  pausedForMs,
  pausedSince,
  sessionStatus,
  timeWhenFocusReached,
} from './derive.ts';
import { HOUR, ID, MINUTE, T0 } from './fixtures.ts';
import { SessionError } from './session.ts';
import type { Segment } from './session.ts';
import { parseSession } from './validate.ts';

const start = (at = T0) => createSession({ id: ID, mode: 'digits', at, timeZone: 'UTC' });

describe('createSession', () => {
  it('builds the plan data model with one running segment', () => {
    expect(start()).toEqual({
      schema: 1,
      id: ID,
      segments: [{ start: T0, end: null }],
      gaps: [],
      modes: [{ mode: 'digits', start: T0 }],
      endReason: null,
      localDay: '2026-11-16',
    });
  });

  it('is frozen all the way down', () => {
    const session = start();
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.segments)).toBe(true);
    expect(Object.isFrozen(session.segments[0])).toBe(true);
    expect(Object.isFrozen(session.modes[0])).toBe(true);
    expect(() => {
      (session.segments as unknown as Segment[]).push({ start: 1, end: null });
    }).toThrow(TypeError);
  });

  it.each([
    { id: 'not-a-uuid', mode: 'digits', at: T0 },
    { id: ID.toUpperCase(), mode: 'digits', at: T0 },
    { id: ID, mode: 'Digits', at: T0 },
    { id: ID, mode: 'x'.repeat(33), at: T0 },
    { id: ID, mode: '<script>', at: T0 },
    { id: ID, mode: 'digits', at: -1 },
    { id: ID, mode: 'digits', at: 1.5 },
    { id: ID, mode: 'digits', at: Number.NaN },
  ])('rejects %j', (input) => {
    expect(() => createSession({ ...input, timeZone: 'UTC' })).toThrow(SessionError);
  });
});

describe('transitions', () => {
  it('pauses, resumes and ends, deriving everything from segments', () => {
    let session = start();
    session = pauseSession(session, T0 + 25 * MINUTE);
    expect(sessionStatus(session)).toBe('paused');
    expect(pausedSince(session)).toBe(T0 + 25 * MINUTE);
    expect(pausedForMs(session, T0 + 30 * MINUTE)).toBe(5 * MINUTE);
    session = resumeSession(session, T0 + 30 * MINUTE);
    expect(sessionStatus(session)).toBe('running');
    expect(pausedForMs(session, T0 + 31 * MINUTE)).toBeNull();
    expect(focusedMs(session, T0 + 70 * MINUTE)).toBe(65 * MINUTE);
    session = endSession(session, 'user', T0 + 70 * MINUTE);
    expect(sessionStatus(session)).toBe('ended');
    expect(session.endReason).toBe('user');
    expect(session.segments).toEqual([
      { start: T0, end: T0 + 25 * MINUTE },
      { start: T0 + 30 * MINUTE, end: T0 + 70 * MINUTE },
    ]);
    expect(focusedMs(session, T0 + 10 * HOUR)).toBe(65 * MINUTE);
    expect(pauseCount(session)).toBe(1);
    expect(longestStretchMs(session, T0 + 10 * HOUR)).toBe(40 * MINUTE);
    expect(() => parseSession(session)).not.toThrow();
  });

  it('ends a paused session where its pause began', () => {
    const paused = pauseSession(start(), T0 + 10 * MINUTE);
    const ended = endSession(paused, 'pause_timeout', T0 + 40 * MINUTE);
    expect(ended.segments).toEqual([{ start: T0, end: T0 + 10 * MINUTE }]);
    expect(ended.endReason).toBe('pause_timeout');
  });

  it('rejects transitions that do not apply', () => {
    const running = start();
    const paused = pauseSession(running, T0 + MINUTE);
    const ended = endSession(paused, 'user', T0 + 2 * MINUTE);
    expect(() => resumeSession(running, T0 + MINUTE)).toThrow(SessionError);
    expect(() => pauseSession(paused, T0 + 2 * MINUTE)).toThrow(SessionError);
    expect(() => endSession(ended, 'user', T0 + 3 * MINUTE)).toThrow(SessionError);
    expect(() => switchMode(ended, 'ring', T0 + 3 * MINUTE)).toThrow(SessionError);
    expect(() => endSession(running, 'bored' as never, T0 + MINUTE)).toThrow(SessionError);
  });

  it('never records a time before what the session already holds', () => {
    const session = pauseSession(start(), T0 + 10 * MINUTE);
    expect(() => resumeSession(session, T0 + 9 * MINUTE)).toThrow(SessionError);
    expect(() => pauseSession(start(), T0 - 1)).toThrow(SessionError);
  });

  it('records mode switches, ignoring a switch to the current mode', () => {
    let session = switchMode(start(), 'ring', T0 + MINUTE);
    session = pauseSession(session, T0 + 2 * MINUTE);
    session = switchMode(session, 'timeline', T0 + 3 * MINUTE);
    expect(switchMode(session, 'timeline', T0 + 4 * MINUTE)).toBe(session);
    expect(session.modes.map((m) => m.mode)).toEqual(['digits', 'ring', 'timeline']);
    expect(currentMode(session)).toBe('timeline');
    expect(latestStamp(session)).toBe(T0 + 3 * MINUTE);
    expect(() => parseSession(session)).not.toThrow();
  });
});

describe('shiftSession', () => {
  it('moves every time and keeps every duration', () => {
    let session = start();
    session = switchMode(session, 'ring', T0 + 5 * MINUTE);
    session = pauseSession(session, T0 + 10 * MINUTE);
    session = resumeSession(session, T0 + 15 * MINUTE);
    const shifted = shiftSession(session, -HOUR);
    expect(shifted.segments).toEqual([
      { start: T0 - HOUR, end: T0 - 50 * MINUTE },
      { start: T0 - 45 * MINUTE, end: null },
    ]);
    expect(shifted.modes[1]).toEqual({ mode: 'ring', start: T0 - 55 * MINUTE });
    expect(shifted.localDay).toBe(session.localDay);
    expect(focusedMs(shifted, T0 - 40 * MINUTE)).toBe(focusedMs(session, T0 + 20 * MINUTE));
    expect(Object.isFrozen(shifted.segments[1])).toBe(true);
  });

  it('rejects shifts that are not whole milliseconds or reach before 1970', () => {
    expect(() => shiftSession(start(), 0.5)).toThrow(SessionError);
    expect(() => shiftSession(start(), -T0 - 1)).toThrow(SessionError);
  });
});

describe('timeWhenFocusReached', () => {
  it('dates a focus total exactly, across pauses', () => {
    let session = start();
    session = pauseSession(session, T0 + 50 * MINUTE);
    session = resumeSession(session, T0 + 70 * MINUTE);
    expect(timeWhenFocusReached(session, HOUR, T0 + 3 * HOUR)).toBe(T0 + 80 * MINUTE);
    expect(timeWhenFocusReached(session, 50 * MINUTE, T0 + 3 * HOUR)).toBe(T0 + 50 * MINUTE);
    expect(timeWhenFocusReached(session, HOUR, T0 + 75 * MINUTE)).toBeNull();
  });
});
