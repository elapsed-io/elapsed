/**
 * The session model (plan, Data model; Architecture invariants 2 and 10).
 * A session stores only timestamps and how it ended; every statistic is
 * derived from its segments. Times are UTC epoch milliseconds.
 */

import { CONFIG } from '../config.ts';

export const SESSION_SCHEMA = 1;

/** A stretch of running time. `end` is null while the segment is still running. */
export interface Segment {
  readonly start: number;
  readonly end: number | null;
}

/** A stretch when the device was asleep or the tab closed. Informational only (round 4). */
export interface Gap {
  readonly start: number;
  readonly end: number;
}

/** The display mode shown from `start` onward. */
export interface ModeSpan {
  readonly mode: string;
  readonly start: number;
}

export const END_REASONS = ['user', 'pause_timeout', 'checkin_missed', 'max_duration'] as const;
export type EndReason = (typeof END_REASONS)[number];

export interface Session {
  readonly schema: typeof SESSION_SCHEMA;
  /** A random UUID generated on the device. */
  readonly id: string;
  readonly segments: readonly Segment[];
  readonly gaps: readonly Gap[];
  /** Decides the results replay and which ambient mode the session counts toward. */
  readonly modes: readonly ModeSpan[];
  readonly endReason: EndReason | null;
  /** YYYY-MM-DD in local time at start, with the day ending at 04:00. */
  readonly localDay: string;
}

export type SessionStatus = 'running' | 'paused' | 'ended';

/** RFC 9562 UUID, lowercase, as crypto.randomUUID() produces. */
export const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MODE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export function isModeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= CONFIG.session.limits.modeIdMaxLength &&
    MODE_ID_PATTERN.test(value)
  );
}

export function isEndReason(value: unknown): value is EndReason {
  return typeof value === 'string' && (END_REASONS as readonly string[]).includes(value);
}

/** A timestamp or duration in whole milliseconds that JavaScript represents exactly. */
export function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Thrown when a command does not apply to a session's current state, or its input is invalid. */
export class SessionError extends Error {
  override readonly name = 'SessionError';
}

/** Freezes a session and everything in it, so subscribers cannot change shared state. */
export function freezeSession(session: Session): Session {
  for (const list of [session.segments, session.gaps, session.modes]) {
    for (const item of list) Object.freeze(item);
    Object.freeze(list);
  }
  return Object.freeze(session);
}
