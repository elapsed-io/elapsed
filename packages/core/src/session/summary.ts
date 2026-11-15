/**
 * What the results screen shows for a finished session (plan, Decisions >
 * Results: "focused time is the headline, with all session data beneath";
 * the results frames). Everything is derived from the segments.
 */

import { focusedMs, lastSegment, longestStretchMs, pauseCount, sessionStatus } from './derive.ts';
import { SessionError } from './session.ts';
import type { Session } from './session.ts';

export interface SessionSummary {
  /** When the first segment began. */
  readonly startedAt: number;
  /** When the last segment ended. */
  readonly endedAt: number;
  readonly focusedMs: number;
  /** From start to end. */
  readonly elapsedMs: number;
  /** Time between segments. */
  readonly pausedMs: number;
  readonly pauses: number;
  readonly longestStretchMs: number;
  /**
   * The mode the results replay is drawn in: the one shown longest (plan,
   * Decisions > Results). A tie goes to the mode shown first.
   */
  readonly replayMode: string;
}

export function summarise(session: Session): SessionSummary {
  if (sessionStatus(session) !== 'ended') throw new SessionError('only a finished session has results');
  const startedAt = session.segments[0]?.start ?? 0;
  const endedAt = lastSegment(session).end ?? startedAt;
  const focused = focusedMs(session, endedAt);
  const shown = new Map<string, number>();
  session.modes.forEach((span, index) => {
    const until = Math.min(endedAt, session.modes[index + 1]?.start ?? endedAt);
    shown.set(span.mode, (shown.get(span.mode) ?? 0) + Math.max(0, until - Math.min(span.start, endedAt)));
  });
  let replayMode = session.modes[0]?.mode ?? '';
  for (const [mode, ms] of shown) if (ms > (shown.get(replayMode) ?? 0)) replayMode = mode;
  return {
    startedAt,
    endedAt,
    focusedMs: focused,
    elapsedMs: endedAt - startedAt,
    pausedMs: endedAt - startedAt - focused,
    pauses: pauseCount(session),
    longestStretchMs: longestStretchMs(session, endedAt),
    replayMode,
  };
}
