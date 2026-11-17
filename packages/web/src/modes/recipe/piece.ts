/**
 * The piece library's contract (docs/recipes/mode-recipes.md, The piece library). A recipe chooses pieces and
 * tunes them; each piece is drawn by the site's own code and follows the plan's motion rules: CSS animations of
 * transforms and opacity, nothing run per frame, still under low power and reduced motion (recipe-mode.ts passes
 * both to every piece). The recipe mode builds the display from them and implements the display-mode contract.
 */

import type { Layer, LayerOf, LayerType, Recipe, TimerView } from '@stopwatch/core';
import type { DisplayContext, ModeEvent, ReplaySurface, ModeOptions } from '../contract.ts';
import type { Session } from '@stopwatch/core';
import type { Slots } from './slots.ts';

/** What the timer is doing, as every piece reads it: stood still, running, or held (paused, or a check-in due). */
export type Activity = 'idle' | 'running' | 'held';

export interface Frame {
  readonly view: TimerView;
  readonly activity: Activity;
  /** Paused (not a check-in). */
  readonly paused: boolean;
  /** The recipe's measure at the view's focused time. */
  readonly value: number;
  /**
   * Whether the recipe shows the piece now: in a state its `when` names (or that the state's `show` lists), with
   * its options on. A piece shown only while paused enters and leaves as its own frames draw it.
   */
  readonly active: boolean;
}

/** What a piece is built from. */
export interface PieceSetup<L extends Layer = Layer> {
  readonly doc: Document;
  readonly layer: L;
  readonly recipe: Recipe;
  /** The site's context: the seconds setting, reduced motion, low power and the mode's options, as they are now. */
  readonly context: DisplayContext;
  readonly slots: Slots;
}

/** A graphic the time sits in, above or below (the ring, the dial, the track, the tree). */
export interface Figure {
  /** The box that holds the figure and the time, laid out by the piece's own stylesheet. */
  readonly className: string;
  readonly nodes: readonly Node[];
  /** Custom properties the box carries: the recipe's sizes and colours for the piece's stylesheet. */
  readonly style?: Readonly<Record<string, string>>;
  /** Wraps the time where the figure needs it (the dial shows the time to screen readers only). */
  readonly hold?: (time: HTMLElement) => HTMLElement;
}

export interface Piece {
  /** Drawn behind the display, over the environment (stars, ocean life, shooting stars). */
  readonly backdrop?: readonly Node[];
  readonly figure?: Figure;
  /** Drawn after the display (a caption). */
  readonly overlay?: readonly Node[];
  render(frame: Frame): void;
  /** A mode event (end pressed), passed on to every piece. */
  onEvent?(event: ModeEvent): void;
  unmount?(): void;
}

export type PieceFactory<L extends Layer> = (setup: PieceSetup<L>) => Piece;

/** The environment behind everything (the light model's water or sky); pieces in the backdrop draw inside it. */
export interface Environment {
  readonly element: HTMLElement;
  render(frame: Frame): void;
  unmount?(): void;
}
export type EnvironmentFactory = (setup: Omit<PieceSetup, 'layer'>) => Environment;

/** A results view (strip, rings per hour, profile, scene): loaded with the results, drawing into their surface. */
export type ResultsView = (surface: ReplaySurface, session: Session, recipe: Recipe, options: ModeOptions, slots: Slots) => void | Promise<void>;

/** The pieces one mode uses, by layer type; a built-in mode imports only its own (built-in/*.ts). */
export interface PieceLibrary {
  readonly pieces: { readonly [T in LayerType]?: PieceFactory<LayerOf<T>> };
  readonly environment?: EnvironmentFactory;
  /** The results view, loaded when the results appear, not with the timer. */
  readonly view: () => Promise<ResultsView>;
  /**
   * The light colours of the time, the icons and the labels over the environment (the frames' own palette); the
   * contrast switch weighs all three against the recipe's dark colour.
   */
  readonly chrome?: { readonly text: string; readonly icon: string; readonly label: string };
}
