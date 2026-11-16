/**
 * The display-mode contract (plan, Architecture invariant 4). Every mode,
 * built in or third party, implements it and receives the same events;
 * digits is built through it, not as a special case.
 */

import type { ReplayTiming, SecondsDisplay, Session, TimerEvents, TimerView } from '@stopwatch/core';

/**
 * What a mode reads from the site. The site owns this object and may change
 * its values (a setting changed); it then calls render, or relayout when the
 * font changed.
 */
export interface DisplayContext {
  /** How much of the seconds is shown (Settings > Timer > seconds). */
  readonly seconds: SecondsDisplay;
  /** The user asked for reduced motion. */
  readonly reducedMotion: boolean;
  /**
   * Low power is on: by hand (Settings > Appearance), or because the system asks for reduced motion
   * (plan, Loading and performance). Ambient animation stops and only the time shows; anything that
   * moves with time steps once a minute instead of gliding.
   */
  readonly lowPower: boolean;
  /** The modes' own options (Settings > Display), as they are now. */
  readonly options: ModeOptions;
}

/**
 * A mode's own options (plan, Interface: "each display mode's options live in the display mode section"),
 * as the site's settings hold them. Release 2 adds them round by round: results landmarks in 2.3, ocean life
 * in 2.4.
 */
export interface ModeOptions {
  /** Sea life drifts in while a session is paused (ocean depth). */
  readonly oceanLife: boolean;
  /** Random landmarks on the results' profile chart (ocean depth, height). */
  readonly resultsLandmarks: boolean;
}

/**
 * Where a results replay draws (decision 291): `graphic`, the replay's own place on the results card (the
 * strip, the rings, the profile chart), and `backdrop`, an empty layer behind the whole card, for a replay
 * that lights the card or passes things across it. `lengthMs` is how long the replay runs and `scale` the
 * animation speed's multiplier, both already applied: a replay that animates anything besides what
 * --replay-progress drives creates its animations with no start time, timed from the replay's start, and the
 * results screen starts them with the replay (or finishes them at once). The results element carries
 * `data-replay` with the mode's id, so the replay's stylesheet may set the card's text colours
 * (--color-foreground, --color-muted) there.
 */
export interface ReplaySurface {
  readonly graphic: HTMLElement;
  readonly backdrop: HTMLElement;
  readonly lengthMs: number;
  readonly scale: number;
}

/** Events a mode may react to. Release 3 adds record.passed; round 4 adds checkin.due. */
export type ModeEvent = { readonly type: 'milestone.hour'; readonly payload: TimerEvents['milestone.hour'] };

export interface DisplayMode {
  readonly id: string;
  /**
   * The results replay's own length and curve at normal speed (plan, Design system > Motion). The results
   * screen starts it after the shared delay, lengthens it for long sessions (core, replay.ts) and scales it
   * by the animation speed.
   */
  readonly replayTiming: ReplayTiming;
  mount(root: HTMLElement, context: DisplayContext): void;
  /** Called only when the visible value changes. */
  render(view: TimerView): void;
  onEvent?(event: ModeEvent): void;
  /**
   * The results animation for this mode (round 5): draws the finished
   * session into its surface, everything that moves derived from
   * --replay-progress. May load its drawing code first. `options` are the
   * mode's options at the moment the results appear (the mode drawing them
   * may never have been mounted).
   */
  replay(surface: ReplaySurface, session: Session, options?: ModeOptions): void | Promise<void>;
  /** The font changed: measure anything that depends on it (the blur-away widths). */
  relayout?(): void;
  unmount(): void;
}

export type DisplayModeFactory = () => DisplayMode;
