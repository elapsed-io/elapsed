/**
 * Values derived from a session's segments (plan, Data model > Derived
 * values). Pure functions of the session and, for an open session, a time.
 */

import type { Segment, Session, SessionStatus } from './session.ts';

export function lastSegment(session: Session): Segment {
  const segment = session.segments.at(-1);
  if (segment === undefined) throw new TypeError('a session always has at least one segment');
  return segment;
}

export function sessionStatus(session: Session): SessionStatus {
  if (session.endReason !== null) return 'ended';
  return lastSegment(session).end === null ? 'running' : 'paused';
}

function segmentLength(segment: Segment, at: number): number {
  return Math.max(0, (segment.end ?? at) - segment.start);
}

/** Focused time: the sum of the segments, counting a running segment up to `at`. */
export function focusedMs(session: Session, at: number): number {
  let total = 0;
  for (const segment of session.segments) total += segmentLength(segment, at);
  return total;
}

/** Pauses: one fewer than the segments. */
export function pauseCount(session: Session): number {
  return session.segments.length - 1;
}

/** The longest unbroken stretch of focus. */
export function longestStretchMs(session: Session, at: number): number {
  let longest = 0;
  for (const segment of session.segments) longest = Math.max(longest, segmentLength(segment, at));
  return longest;
}

/** When the current pause began, or null when the session is running or ended. */
export function pausedSince(session: Session): number | null {
  return sessionStatus(session) === 'paused' ? lastSegment(session).end : null;
}

/** The length of the current pause at `at`, or null when not paused. */
export function pausedForMs(session: Session, at: number): number | null {
  const since = pausedSince(session);
  return since === null ? null : Math.max(0, at - since);
}

/** The display mode currently recorded for the session. */
export function currentMode(session: Session): string {
  const span = session.modes.at(-1);
  if (span === undefined) throw new TypeError('a session always has a mode');
  return span.mode;
}

/** The latest time recorded anywhere in the session. New records are never earlier. */
export function latestStamp(session: Session): number {
  let latest = 0;
  for (const segment of session.segments) latest = Math.max(latest, segment.start, segment.end ?? 0);
  for (const span of session.modes) latest = Math.max(latest, span.start);
  for (const gap of session.gaps) latest = Math.max(latest, gap.end);
  return latest;
}

/**
 * The time at which focused time first reached `targetMs`, or null if it has
 * not by `at`. Used to date milestones exactly, however late they are noticed.
 */
export function timeWhenFocusReached(session: Session, targetMs: number, at: number): number | null {
  let before = 0;
  for (const segment of session.segments) {
    const length = segmentLength(segment, at);
    if (before + length >= targetMs) return segment.start + (targetMs - before);
    before += length;
  }
  return null;
}
