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
  /**
   * The contrast switch (plan, Display modes; owner, changes 3): over a bright environment, a mode tells the site
   * how far the time, the icons and the labels have switched to its dark colour (0 none, 1 all), and which colour
   * that is; the site's stylesheets mix them. Set back to 0 when the mode goes.
   */
  readonly chrome?: (darkShare: number, dark: string) => void;
}

/**
 * A mode's own options (plan, Interface: "each display mode's options live in the display mode section", each in
 * its own options box): the values of its recipe's options, by the recipe's option ids, as the site's settings
 * hold them (ocean depth: "ocean-life" and "landmarks"; height: "landmarks"; tree: "tree-view"). An option the
 * settings do not hold takes the recipe's default.
 */
export type ModeOptions = Readonly<Record<string, string | boolean>>;

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

/** The results card's layouts a replay may draw into (each as its frame draws it). */
export type ReplayLayout = 'strip' | 'ring' | 'chart' | 'figure';

/**
 * Events a mode may react to. Release 3 adds record.passed; round 4 adds checkin.due. `end.pressed` comes the
 * moment end is pressed (by its button or E), before the ending countdown takes the screen (the analog crown dips).
 */
export type ModeEvent = { readonly type: 'milestone.hour'; readonly payload: TimerEvents['milestone.hour'] } | { readonly type: 'end.pressed' };

export interface DisplayMode {
  readonly id: string;
  /**
   * The results replay's own length and curve at normal speed (plan, Design system > Motion). The results
   * screen starts it after the shared delay, lengthens it for long sessions (core, replay.ts) and scales it
   * by the animation speed.
   */
  readonly replayTiming: ReplayTiming;
  /**
   * How the results card is laid out around the replay's graphic (decision 302): `strip` (a strip over the
   * stats: digits, timeline), `ring` (the rings beside the stats: ring, analog), `chart` (a profile chart over
   * the stats, 16 px apart: ocean depth, height) or `figure` (a drawing over the stats, 10 px apart: tree).
   */
  readonly replayLayout: ReplayLayout;
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
