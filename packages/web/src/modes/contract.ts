/**
 * The display-mode contract (plan, Architecture invariant 4). Every mode,
 * built in or third party, implements it and receives the same events;
 * digits is built through it, not as a special case.
 */

import type { SecondsDisplay, Session, TimerEvents, TimerView } from '@stopwatch/core';

export interface DisplayContext {
  /** How much of the seconds is shown (settings, round 6). */
  readonly seconds: SecondsDisplay;
  /** The user asked for reduced motion. */
  readonly reducedMotion: boolean;
}

/** Events a mode may react to. Release 3 adds record.passed; round 4 adds checkin.due. */
export type ModeEvent = { readonly type: 'milestone.hour'; readonly payload: TimerEvents['milestone.hour'] };

export interface DisplayMode {
  readonly id: string;
  mount(root: HTMLElement, context: DisplayContext): void;
  /** Called only when the visible value changes. */
  render(view: TimerView): void;
  onEvent?(event: ModeEvent): void;
  /**
   * The results animation for this mode (round 5): draws the finished
   * session into `root` and creates its animations with the replay timing
   * (shared/replay-timing.ts) and no delay. The results screen sets when they
   * start, or finishes them at once. May load its drawing code first.
   */
  replay(root: HTMLElement, session: Session): void | Promise<void>;
  unmount(): void;
}

export type DisplayModeFactory = () => DisplayMode;
