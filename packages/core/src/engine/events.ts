/**
 * Events the timer engine emits (plan, Data model > Events). Every payload
 * carries `at`, the time the event happened, which can be earlier than when
 * it is delivered (a milestone noticed after the device wakes).
 *
 * Release 3 adds `record.passed`. Additions to the plan's list:
 * `mode.switched` and `clock.jumped` (both change the stored session),
 * `checkin.answered`, `pause.ending` (for notifications), `heartbeat` and `state.changed`, which storage and
 * other tabs use to keep the saved state current.
 */

import type { EndReason, Gap, Session } from '../session/session.ts';
import type { ActiveState } from '../session/state.ts';
import type { TimerView } from './view.ts';

interface SessionEvent {
  readonly at: number;
  readonly session: Session;
}

export interface TimerEvents {
  'session.started': SessionEvent;
  /** reason: the user paused, or a check-in went unanswered (dated to when it appeared). */
  'session.paused': SessionEvent & { readonly reason: 'user' | 'checkin_missed' };
  'session.resumed': SessionEvent;
  'session.ended': SessionEvent & { readonly reason: EndReason };
  /** The display mode recorded for the session changed. */
  'mode.switched': SessionEvent & { readonly mode: string };
  /** The device clock was set back while a session was open; every time in it moved by `deltaMs` (negative). */
  'clock.jumped': SessionEvent & { readonly deltaMs: number };
  /** The visible value changed: render. */
  'view.changed': { readonly view: TimerView };
  /** Focused time reached a whole number of hours. */
  'milestone.hour': SessionEvent & { readonly hours: number };
  /** A check-in fell due and waits for any key, click or tap. */
  'checkin.due': SessionEvent;
  /**
   * The pause will end the session at `endsAt` unless the user resumes: sent
   * once per pause, 5 minutes before (or at once when the limit is that short).
   * Never for the wait after a missed check-in, which has no pause limit.
   */
  'pause.ending': SessionEvent & { readonly endsAt: number };
  'checkin.answered': SessionEvent;
  /** The device slept or the tab was closed for longer than the gap threshold. Informational. */
  'gap.detected': SessionEvent & { readonly gap: Gap };
  /** The engine is alive; storage writes the time every 30 seconds. */
  'heartbeat': { readonly at: number };
  /** The state to keep on the device changed (null: no session is open). */
  'state.changed': { readonly state: ActiveState | null };
}
