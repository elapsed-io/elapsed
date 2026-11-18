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
export type ReplayLayout = 'strip' | 'ring' | 'chart' | 'figure' | 'map';

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
   * the stats, 16 px apart: ocean depth, height), `figure` (a drawing over the stats, 10 px apart: tree) or `map`
   * (a map over the stats, 14 px apart, on space from edge to edge: interstellar).
   */
  readonly replayLayout: ReplayLayout;
  /**
   * What the headline counts by while the replay runs: `session` (default), through the whole session so it rises
   * only while the replay passes focus; `focus`, evenly with the replay, for a replay that draws distance by
   * focused time only (interstellar), so the count never stalls while the journey moves.
   */
  readonly replayCounts?: 'session' | 'focus';
  /**
   * Mounts the mode into `root`, which the site may keep out of sight until `ready` settles (round 2.10: the
   * current mode stays on screen while the next one gets ready, then they swap on one frame).
   */
  mount(root: HTMLElement, context: DisplayContext): void;
  /** Settles once the mounted mode's first view is whole: its art loaded and its images decoded. */
  ready?(): Promise<void>;
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
  /**
   * Takes the mode down completely (round 2.10's mount and teardown contract): everything it put in `root`, every
   * animation, timer, listener and observer it started, and any layer it cached. Nothing it made outlives it, and
   * the site may mount another mode, or the same one again, into the same root at once.
   */
  unmount(): void;
}

export type DisplayModeFactory = () => DisplayMode;
