/**
 * Pure session transitions. Each takes a session and a time and returns a
 * new frozen session, or throws a SessionError when the transition does not
 * apply. Times may be backdated (round 4 dates pauses to a missed check-in),
 * but never earlier than anything already recorded, so segments stay ordered.
 */

import { localDay } from '../time/local-day.ts';
import { latestStamp, lastSegment, sessionStatus, currentMode } from './derive.ts';
import {
  SESSION_ID_PATTERN,
  SESSION_SCHEMA,
  SessionError,
  freezeSession,
  isEndReason,
  isModeId,
  isTime,
} from './session.ts';
import type { EndReason, Session } from './session.ts';

export interface NewSession {
  readonly id: string;
  readonly mode: string;
  readonly at: number;
  readonly timeZone: string;
}

function assertTime(at: number): void {
  if (!isTime(at)) throw new SessionError(`not a valid time: ${String(at)}`);
}

function assertNotBefore(session: Session, at: number): void {
  assertTime(at);
  const latest = latestStamp(session);
  if (at < latest) throw new SessionError(`time ${String(at)} is before the session's latest record ${String(latest)}`);
}

export function createSession({ id, mode, at, timeZone }: NewSession): Session {
  if (!SESSION_ID_PATTERN.test(id)) throw new SessionError('session id must be a lowercase UUID');
  if (!isModeId(mode)) throw new SessionError(`not a display mode id: ${JSON.stringify(mode)}`);
  assertTime(at);
  return freezeSession({
    schema: SESSION_SCHEMA,
    id,
    segments: [{ start: at, end: null }],
    gaps: [],
    modes: [{ mode, start: at }],
    endReason: null,
    localDay: localDay(at, timeZone),
  });
}

export function pauseSession(session: Session, at: number): Session {
  if (sessionStatus(session) !== 'running') throw new SessionError('only a running session can pause');
  assertNotBefore(session, at);
  const running = lastSegment(session);
  return freezeSession({
    ...session,
    segments: [...session.segments.slice(0, -1), { start: running.start, end: at }],
  });
}

export function resumeSession(session: Session, at: number): Session {
  if (sessionStatus(session) !== 'paused') throw new SessionError('only a paused session can resume');
  assertNotBefore(session, at);
  return freezeSession({ ...session, segments: [...session.segments, { start: at, end: null }] });
}

/** Ends a session. A running session's last segment closes at `at`; a paused session ends where its pause began. */
export function endSession(session: Session, reason: EndReason, at: number): Session {
  if (sessionStatus(session) === 'ended') throw new SessionError('the session has already ended');
  if (!isEndReason(reason)) throw new SessionError(`not an end reason: ${JSON.stringify(reason)}`);
  assertNotBefore(session, at);
  const closed = sessionStatus(session) === 'running' ? pauseSession(session, at) : session;
  return freezeSession({ ...closed, endReason: reason });
}

/** Records that a different display mode is shown from `at`. Switching to the current mode changes nothing. */
export function switchMode(session: Session, mode: string, at: number): Session {
  if (sessionStatus(session) === 'ended') throw new SessionError('an ended session cannot switch mode');
  if (!isModeId(mode)) throw new SessionError(`not a display mode id: ${JSON.stringify(mode)}`);
  assertNotBefore(session, at);
  if (currentMode(session) === mode) return session;
  return freezeSession({ ...session, modes: [...session.modes, { mode, start: at }] });
}

/**
 * Moves every time in the session by `deltaMs`, keeping all durations. Used
 * when the device clock is set back while a session is open (owner decision,
 * 2026-11-15). The local day is kept: it was decided when the session began.
 */
export function shiftSession(session: Session, deltaMs: number): Session {
  if (!Number.isSafeInteger(deltaMs)) throw new SessionError(`not a whole number of milliseconds: ${String(deltaMs)}`);
  const move = (time: number): number => {
    const moved = time + deltaMs;
    if (!isTime(moved)) throw new SessionError('shifting would move a time before 1970');
    return moved;
  };
  return freezeSession({
    ...session,
    segments: session.segments.map(({ start, end }) => ({ start: move(start), end: end === null ? null : move(end) })),
    gaps: session.gaps.map(({ start, end }) => ({ start: move(start), end: move(end) })),
    modes: session.modes.map(({ mode, start }) => ({ mode, start: move(start) })),
  });
}
