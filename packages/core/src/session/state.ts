/**
 * The active state: an open session plus what the abandonment rules need to
 * remember about it (plan, Session lifecycle and abandonment). It is what the
 * device keeps for the session in progress (round 4).
 */

import { CONFIG } from '../config.ts';
import { lastSegment, sessionStatus } from './derive.ts';
import { SessionError, isTime, freezeSession } from './session.ts';
import type { Gap, Session } from './session.ts';
import { shiftSession } from './commands.ts';

export const ACTIVE_STATE_SCHEMA = 1;

export interface ActiveState {
  readonly schema: typeof ACTIVE_STATE_SCHEMA;
  /** An open session: running or paused, never ended. */
  readonly session: Session;
  /** The last sign of presence: start, pause, resume or an answered check-in. */
  readonly presenceAt: number;
  /** When an unanswered check-in fell due, while the session waits after missing it; otherwise null. */
  readonly missedCheckInAt: number | null;
  /** The pause limit in force for the current pause, fixed when it began ("a changed limit applies from the next pause"). */
  readonly pauseLimitMs: number | null;
}

export function freezeState(state: ActiveState): ActiveState {
  return Object.freeze({ ...state, session: freezeSession(state.session) });
}

export function startState(session: Session): ActiveState {
  return freezeState({
    schema: ACTIVE_STATE_SCHEMA,
    session,
    presenceAt: lastSegment(session).start,
    missedCheckInAt: null,
    pauseLimitMs: null,
  });
}

/** Moves every time in the state, keeping all durations (a device clock set back). */
export function shiftState(state: ActiveState, deltaMs: number): ActiveState {
  return freezeState({
    ...state,
    session: shiftSession(state.session, deltaMs),
    presenceAt: state.presenceAt + deltaMs,
    missedCheckInAt: state.missedCheckInAt === null ? null : state.missedCheckInAt + deltaMs,
  });
}

/** Appends an informational gap (the device asleep or the tab closed). Gaps never change focused time. */
export function recordGap(session: Session, gap: Gap): Session {
  if (!isTime(gap.start) || !isTime(gap.end) || gap.end < gap.start) throw new SessionError('a gap needs a start and a later end');
  const previous = session.gaps.at(-1);
  const floor = previous === undefined ? (session.segments[0]?.start ?? 0) : previous.end;
  if (gap.start < floor) throw new SessionError('gaps cannot overlap or precede the session');
  if (session.gaps.length >= CONFIG.session.limits.maxGaps) return session;
  return freezeSession({ ...session, gaps: [...session.gaps, { start: gap.start, end: gap.end }] });
}

export function isOpen(session: Session): boolean {
  return sessionStatus(session) !== 'ended';
}

/**
 * The state as JSON with its fields in one fixed order, so two equal states
 * always serialise to the same text (storage compares the text to notice
 * another tab's change).
 */
export function serializeActiveState(state: ActiveState): string {
  const { session } = state;
  return JSON.stringify({
    schema: state.schema,
    session: {
      schema: session.schema,
      id: session.id,
      segments: session.segments.map(({ start, end }) => ({ start, end })),
      gaps: session.gaps.map(({ start, end }) => ({ start, end })),
      modes: session.modes.map(({ mode, start }) => ({ mode, start })),
      endReason: session.endReason,
      localDay: session.localDay,
    },
    presenceAt: state.presenceAt,
    missedCheckInAt: state.missedCheckInAt,
    pauseLimitMs: state.pauseLimitMs,
  });
}
