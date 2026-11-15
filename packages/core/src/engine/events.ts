/**
 * Events the timer engine emits (plan, Data model > Events). Every payload
 * carries `at`, the time the event happened, which can be earlier than when
 * it is delivered (a milestone noticed after the device wakes).
 *
 * Round 4 adds `gap.detected` and `checkin.due`; Release 3 adds
 * `record.passed`. `mode.switched` and `clock.jumped` are additions to the
 * plan's list: both change the stored session, so storage (round 4) must hear
 * about them.
 */

import type { EndReason, Session } from '../session/session.ts';
import type { TimerView } from './view.ts';

interface SessionEvent {
  readonly at: number;
  readonly session: Session;
}

export interface TimerEvents {
  'session.started': SessionEvent;
  'session.paused': SessionEvent;
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
}
