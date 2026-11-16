/**
 * A display mode built from its recipe (docs/recipes/mode-recipes.md; plan-release-2, round 2.7). Every mode,
 * digits included, is one: the recipe chooses the pieces and tunes them, and this builds the display from them and
 * implements the display-mode contract, the same for every mode:
 *
 * - The environment (the light model's water or sky) goes behind everything, and the backdrop pieces (stars,
 *   ocean life, shooting stars) inside it.
 * - The time sits in its figure (the ring, the dial, the track, the tree): inside it, above it or below it, as the
 *   recipe's time layer says. Without a time layer, the time is there for screen readers only.
 * - The time and its figure blur together while held; a state's caption follows the display.
 * - A layer shows in the states its `when` names, or that a state's `show` lists, and only while its options
 *   are on. Options choose between variants (the tree's views); changing one rebuilds the display.
 * - Low power, which reduced motion also turns on, stills every piece: ambient pieces (particles) do not show,
 *   and anything that moves with time steps once a minute (each piece reads it from the context).
 * - The results replay is the recipe's view, loaded with the results.
 */

import { measureAt, replayTimingFor } from '@stopwatch/core';
import type { Layer, Recipe, ResultsView as ViewSpec, Session, StateName, TimeLayer, TimerView } from '@stopwatch/core';
import { html } from '../../dom.ts';
import type { DisplayContext, DisplayMode, ModeOptions, ReplayLayout, ReplaySurface } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';
import type { Activity, Environment, Figure, Frame, Piece, PieceFactory, PieceLibrary } from './piece.ts';
import { contrastSwitch } from './contrast.ts';
import { Slots } from './slots.ts';
import type { SlotSources } from './slots.ts';
import './recipe.css';

const LAYOUTS: Readonly<Record<ViewSpec['type'], ReplayLayout>> = { strip: 'strip', 'rings-per-hour': 'ring', profile: 'chart', scene: 'figure' };

/** The mode's option values: what the site holds, where the recipe offers it, else the recipe's default. */
export function optionValues(recipe: Recipe, given: ModeOptions = {}): ModeOptions {
  const values: Record<string, string | boolean> = {};
  for (const option of recipe.options ?? []) {
    const value = given[option.id];
    const valid = option.kind === 'switch' ? typeof value === 'boolean' : typeof value === 'string' && (option.choices ?? []).includes(value);
    values[option.id] = valid && value !== undefined ? value : option.default;
  }
  return values;
}

/** Whether a switch that toggles `layer` is off. */
function switchedOff(recipe: Recipe, layer: Layer, values: ModeOptions): boolean {
  return (recipe.options ?? []).some((option) => option.kind === 'switch' && values[option.id] === false && (option.toggles ?? []).includes(layer.id));
}

/** Whether an option turns `layer` off: a switch that toggles it is off, or it is a variant not chosen. */
function optedOut(recipe: Recipe, layer: Layer, values: ModeOptions): boolean {
  if (layer.variantOf !== undefined && values[layer.variantOf.option] !== layer.variantOf.value) return true;
  return switchedOff(recipe, layer, values);
}

/** A layer drawn only on the results (its `when` names no state of the timer). */
export function resultsOnly(layer: Layer): boolean {
  return layer.when !== undefined && layer.when.every((state) => state === 'results');
}

/** The layers the timer's display draws, under these option values, in the recipe's order. */
export function displayLayers(recipe: Recipe, values: ModeOptions): readonly Layer[] {
  return recipe.layers.filter((layer) => !resultsOnly(layer) && !optedOut(recipe, layer, values));
}

/**
 * The layers the results draw, under these option values: the results' `show`, and a scene's own layers, which
 * it draws whichever variant the timer shows (the tree's results are side on, as their frame draws them).
 */
export function resultsLayers(recipe: Recipe, values: ModeOptions): readonly Layer[] {
  const view = recipe.results.view;
  const scene = new Set(view.type === 'scene' ? view.layers : []);
  const shown = new Set(recipe.results.show ?? []);
  return recipe.layers.filter((layer) => (scene.has(layer.id) && !switchedOff(recipe, layer, values)) || (shown.has(layer.id) && !optedOut(recipe, layer, values)));
}

function stateOf(view: TimerView): Exclude<StateName, 'results'> {
  if (view.status === 'paused') return 'paused';
  if (view.status === 'running' && view.checkInDueAt !== null) return 'checkin';
  return 'running';
}

function activityOf(view: TimerView): Activity {
  if (view.status === 'idle' || view.status === 'ended') return 'idle';
  return view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
}

/** Whether `layer` shows in `state`: its `when` names it, or the state's `show` lists it; ambient pieces never with low power. */
function shownIn(recipe: Recipe, layer: Layer, state: Exclude<StateName, 'results'>, context: DisplayContext): boolean {
  if (layer.type === 'particles' && context.lowPower) return false;
  if (layer.when === undefined) return true;
  const listed = state === 'running' ? false : (recipe.states?.[state]?.show ?? []).includes(layer.id);
  return layer.when.includes(state) || listed;
}

const grouped = (value: number): string => Math.round(value).toLocaleString('en-US');

/** A state's caption from its template: only the recipe's placeholders, filled as text. */
export function captionText(recipe: Recipe, template: string, value: number): string {
  const zone = (recipe.zones ?? []).reduce<string>((name, [, label, from]) => (value >= from ? label : name), recipe.zones?.[0]?.[1] ?? '');
  const unit = recipe.measure.unitLabel ?? (recipe.measure.unit === 'time' ? '' : recipe.measure.unit);
  return template.replace(/\{(value|unit|zone)\}/g, (_, name: string) => (name === 'value' ? grouped(value) : name === 'unit' ? unit : zone));
}

interface Built {
  readonly display: TimeDisplay;
  readonly environment: Environment | null;
  readonly pieces: readonly { readonly layer: Layer; readonly piece: Piece }[];
  readonly caption: { readonly element: HTMLElement; readonly template: string } | null;
  /** Which layers it drew, so a change of options that changes them rebuilds it. */
  readonly drawn: string;
}

/**
 * The mode for `recipe`, drawn with `library`'s pieces. `id` is the mode's id in the site (its settings, its
 * stylesheet's `data-mode`), which for ocean depth differs from the recipe's ("ocean").
 */
export function createRecipeMode(id: string, recipe: Recipe, library: PieceLibrary & { readonly slots?: SlotSources }): DisplayMode {
  let root: HTMLElement | null = null;
  let context: DisplayContext | null = null;
  let built: Built | null = null;
  let last: TimerView | null = null;
  const darkShare = library.chrome === undefined ? null : contrastSwitch(recipe, library.chrome);
  const dark = recipe.contrast?.dark ?? '#000000';
  let shownShare = -1;

  const drawnKey = (values: ModeOptions): string =>
    displayLayers(recipe, values)
      .map((layer) => layer.id)
      .join();

  const build = (element: HTMLElement, displayContext: DisplayContext): Built => {
    const doc = element.ownerDocument;
    const values = optionValues(recipe, displayContext.options);
    const slots = new Slots(recipe, library.slots);
    const environment = recipe.environment !== undefined && recipe.environment.type !== 'theme' ? (library.environment?.({ doc, recipe, context: displayContext, slots }) ?? null) : null;
    const layers = displayLayers(recipe, values);
    const time = layers.find((layer): layer is TimeLayer => layer.type === 'time');
    const pieces: { layer: Layer; piece: Piece }[] = [];
    for (const layer of layers) {
      if (layer.type === 'time') continue;
      const factory = library.pieces[layer.type] as PieceFactory<Layer> | undefined;
      if (factory === undefined) continue;
      pieces.push({ layer, piece: factory({ doc, layer, recipe, context: displayContext, slots }) });
    }
    const figure: Figure | undefined = pieces.find(({ piece }) => piece.figure !== undefined)?.piece.figure;
    const display = new TimeDisplay(doc, displayContext, (shown) => {
      const held = figure?.hold?.(shown) ?? (time === undefined ? html(doc, 'div', { class: 'recipe__unseen' }, [shown]) : shown);
      if (figure === undefined) return [held];
      const box = html(doc, 'div', { class: figure.className }, time?.position === 'top' ? [held, ...figure.nodes] : [...figure.nodes, held]);
      for (const [name, value] of Object.entries(figure.style ?? {})) box.style.setProperty(name, value);
      return [box];
    });
    const backdrop = pieces.flatMap(({ piece }) => piece.backdrop ?? []);
    if (environment !== null) environment.element.append(...backdrop);
    const template = recipe.states?.paused?.caption;
    const caption = template === undefined ? null : { element: html(doc, 'div', { class: 'recipe__caption', attrs: { 'aria-hidden': 'true' } }), template };
    element.replaceChildren(...(environment === null ? backdrop : [environment.element]), display.element, ...pieces.flatMap(({ piece }) => piece.overlay ?? []), ...(caption === null ? [] : [caption.element]));
    if (time?.size === undefined) element.style.removeProperty('--mode-time-size');
    else element.style.setProperty('--mode-time-size', String(time.size));
    void doc.fonts.ready.then(() => {
      display.measure();
    });
    return { display, environment, pieces, caption, drawn: drawnKey(values) };
  };

  const teardown = (): void => {
    if (built === null) return;
    built.environment?.unmount?.();
    for (const { piece } of built.pieces) piece.unmount?.();
    built = null;
  };

  return {
    id,
    replayTiming: replayTimingFor(recipe),
    replayLayout: LAYOUTS[recipe.results.view.type],
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      built = build(element, displayContext);
    },
    render(view: TimerView) {
      if (root === null || context === null || built === null) return;
      // An option that changes which layers draw (the tree's view, ocean life) rebuilds the display.
      if (drawnKey(optionValues(recipe, context.options)) !== built.drawn) {
        teardown();
        built = build(root, context);
      }
      last = view;
      built.display.render(view);
      const state = stateOf(view);
      const value = measureAt(recipe.measure, view.focusedMs);
      const frame: Frame = { view, activity: activityOf(view), paused: view.status === 'paused', value, active: true };
      built.environment?.render(frame);
      if (darkShare !== null) {
        const share = Math.round(darkShare(value) * 1000) / 1000;
        if (share !== shownShare) context.chrome?.(share, dark);
        shownShare = share;
      }
      for (const { layer, piece } of built.pieces) piece.render({ ...frame, active: shownIn(recipe, layer, state, context) });
      if (built.caption !== null) {
        // The caption is ambient: shown while paused, never with low power.
        const shown = frame.paused && !context.lowPower;
        if (shown) built.caption.element.textContent = captionText(recipe, built.caption.template, value);
        built.caption.element.classList.toggle('recipe__caption--shown', shown);
      }
    },
    async replay(surface: ReplaySurface, session: Session, options?: ModeOptions) {
      const view = await library.view();
      await view(surface, session, recipe, optionValues(recipe, options), new Slots(recipe, library.slots));
    },
    relayout() {
      built?.display.measure();
      if (last !== null) built?.display.render(last);
    },
    unmount() {
      teardown();
      if (shownShare > 0) context?.chrome?.(0, dark);
      shownShare = -1;
      root?.style.removeProperty('--mode-time-size');
      root?.replaceChildren();
      root = null;
      context = null;
      last = null;
    },
  };
}
