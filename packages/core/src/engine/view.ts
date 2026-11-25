/**
 * The timer view: what the screen shows, and when that changes. Display modes
 * render only when the visible value changes (plan, Principles > Appealing and
 * fast; DisplayMode.render), so the engine works out the visible value and
 * wakes only for the next change.
 *
 * Visible precision follows the seconds setting (plan, Settings catalog >
 * Timer). With the default "blur away", the ones digit is visible for the
 * first 10 s of focus, the tens digit until 60 s, then the time is hh:mm.
 */

import { CONFIG } from '../config.ts';
import { currentMode, focusedMs, pausedForMs, sessionStatus } from '../session/derive.ts';
import type { EndReason, Session, SessionStatus } from '../session/session.ts';

const SECOND = 1000;
const TEN_SECONDS = 10 * SECOND;
const MINUTE = 60 * SECOND;

/** In the settings' order: always (the default from round 2.14), blur away, never. */
export const SECONDS_DISPLAYS = ['always', 'blur-away', 'never'] as const;
export type SecondsDisplay = (typeof SECONDS_DISPLAYS)[number];

export type TimerStatus = 'idle' | SessionStatus;

export interface TimerView {
  readonly status: TimerStatus;
  /** The time this view describes (epoch ms). */
  readonly at: number;
  /** Exact focused time at `at`, for displays that animate between renders. */
  readonly focusedMs: number;
  /** Focused time as shown: rounded down to `precisionMs`. */
  readonly shownMs: number;
  /** The smallest unit of focused time currently visible: 1 s, 10 s or 1 min. */
  readonly precisionMs: number;
  /** Exact length of the current pause, or null when not paused. */
  readonly pausedForMs: number | null;
  /** The pause length as shown (whole seconds), or null when not paused. */
  readonly pausedForShownMs: number | null;
  /** The session's current display mode, or null when idle. */
  readonly mode: string | null;
  /** When the check-in now waiting for an answer fell due, or null. */
  readonly checkInDueAt: number | null;
  /** While paused after a missed check-in: when that check-in fell due. */
  readonly missedCheckInAt: number | null;
  /** Why an ended session ended, or null. */
  readonly endReason: EndReason | null;
}

export interface ViewExtras {
  readonly checkInDueAt?: number | null;
  readonly missedCheckInAt?: number | null;
}

export function isSecondsDisplay(value: unknown): value is SecondsDisplay {
  return typeof value === 'string' && (SECONDS_DISPLAYS as readonly string[]).includes(value);
}

/** The smallest unit of focused time visible after `focused` ms. */
export function focusPrecision(display: SecondsDisplay, focused: number): number {
  if (display === 'always') return SECOND;
  if (display === 'never') return MINUTE;
  if (focused < CONFIG.motion.onesBlurWindow.end) return SECOND;
  if (focused < CONFIG.motion.tensBlurWindow.end) return TEN_SECONDS;
  return MINUTE;
}

function roundDown(value: number, unit: number): number {
  return Math.floor(value / unit) * unit;
}

export function computeView(session: Session | null, at: number, display: SecondsDisplay, extras: ViewExtras = {}): TimerView {
  if (session === null) {
    return {
      status: 'idle',
      at,
      focusedMs: 0,
      shownMs: 0,
      precisionMs: focusPrecision(display, 0),
      pausedForMs: null,
      pausedForShownMs: null,
      mode: null,
      checkInDueAt: null,
      missedCheckInAt: null,
      endReason: null,
    };
  }
  const focused = focusedMs(session, at);
  const precision = focusPrecision(display, focused);
  const pausedFor = pausedForMs(session, at);
  return {
    status: sessionStatus(session),
    at,
    focusedMs: focused,
    shownMs: roundDown(focused, precision),
    precisionMs: precision,
    pausedForMs: pausedFor,
    pausedForShownMs: pausedFor === null ? null : roundDown(pausedFor, CONFIG.engine.pausedPrecision),
    mode: currentMode(session),
    checkInDueAt: extras.checkInDueAt ?? null,
    missedCheckInAt: extras.missedCheckInAt ?? null,
    endReason: session.endReason,
  };
}

/** Identifies what is visible; two views with the same key look the same. */
export function viewKey(view: TimerView): string {
  return [view.status, view.mode, view.shownMs, view.precisionMs, view.pausedForShownMs, view.checkInDueAt, view.missedCheckInAt, view.endReason].join('|');
}

/**
 * Milliseconds until the visible value next changes, or null if it never will
 * without a command. Precision boundaries (10 s, 60 s) are multiples of the
 * finer precisions, so the next change is always the next multiple.
 */
export function msUntilNextChange(view: TimerView): number | null {
  if (view.status === 'running') return view.shownMs + view.precisionMs - view.focusedMs;
  if (view.status === 'paused' && view.pausedForMs !== null && view.pausedForShownMs !== null) {
    return view.pausedForShownMs + CONFIG.engine.pausedPrecision - view.pausedForMs;
  }
  return null;
}
