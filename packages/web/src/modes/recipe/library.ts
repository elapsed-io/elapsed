/**
 * The piece library's registry (docs/recipes/mode-recipes.md, The piece library; plan, Loading and performance):
 * each piece type is its own small download, fetched only when a chosen mode's recipe uses it, and the core holds
 * only what digits, ring and timeline need (the ring and track pieces). A built-in mode is then its recipe, the
 * sources of its slots' art and data, and its own colours over its environment; everything it draws comes from
 * here. Results views and environments load the same way, by the recipe's view and environment type.
 *
 * Loading is cancellable (an AbortSignal): a cancelled load stops at its next step and builds nothing.
 */

import { builtInRecipe } from '@stopwatch/core';
import type { Layer, LayerType, Recipe } from '@stopwatch/core';
import type { DisplayModeFactory } from '../contract.ts';
import { ringPiece } from '../pieces/ring/ring.ts';
import { trackPiece } from '../pieces/track/track.ts';
import type { EnvironmentFactory, PieceFactory, PieceLibrary, ResultsView, StageFactory } from './piece.ts';
import { createRecipeMode } from './recipe-mode.ts';
import type { SlotSources } from './slots.ts';

type AnyPiece = PieceFactory<Layer>;

/** Every piece type the library draws, and how to fetch it; ring and track are in the core already. */
const PIECES: { readonly [T in LayerType]?: () => Promise<AnyPiece> } = {
  ring: () => Promise.resolve(ringPiece as AnyPiece),
  track: () => Promise.resolve(trackPiece as AnyPiece),
  dial: async () => (await import('../pieces/dial/dial.ts')).dialPiece as AnyPiece,
  tree: async () => (await import('../pieces/tree/tree.ts')).treePiece as AnyPiece,
  particles: async () => (await import('../pieces/particles/particles.ts')).particlesPiece as AnyPiece,
  starfield: async () => (await import('../pieces/starfield/starfield.ts')).starfieldPiece as AnyPiece,
  circles: async () => (await import('../pieces/map/circles.ts')).circlesPiece as AnyPiece,
  shape: async () => (await import('../pieces/map/shape.ts')).shapePiece as AnyPiece,
  path: async () => (await import('../pieces/map/path.ts')).pathPiece as AnyPiece,
  landmarks: async () => (await import('../pieces/map/landmarks.ts')).landmarksPiece as AnyPiece,
};

/** The environments, by the recipe's environment type. */
const ENVIRONMENTS: Readonly<Record<string, () => Promise<EnvironmentFactory>>> = {
  'light-falloff': async () => (await import('../pieces/light/light.ts')).lightEnvironment,
  stops: async () => (await import('../pieces/stops/stops.ts')).stopsEnvironment,
};

/** The results view for a recipe, loaded when the results appear. */
export function viewFor(recipe: Recipe): () => Promise<ResultsView> {
  const view = recipe.results.view;
  switch (view.type) {
    case 'strip':
      return async () => (await import('../shared/strip-replay.ts')).stripView;
    case 'rings-per-hour':
      return async () => (await import('../pieces/ring/ring-replay.ts')).ringsView;
    case 'profile':
      return async () => (await import('../views/profile.ts')).profileView;
    case 'scene':
      return view.camera === true ? async () => (await import('../views/space.ts')).spaceView : async () => (await import('../pieces/tree/tree-replay.ts')).sceneView;
  }
}

/** What a built-in mode adds to its recipe: where its slots' art and data come from, and its colours over its environment. */
export interface BuiltInMode {
  readonly id: string;
  readonly recipe: unknown;
  readonly slots?: SlotSources;
  /** The light colours of the time, the icons and the labels over the environment (the contrast switch weighs them). */
  readonly chrome?: PieceLibrary['chrome'];
  /**
   * Whether it draws its own environment. While ocean depth and height are in testing they keep the theme's
   * background at all times (owner, 2026-11-17): no environment, no environment colours, no contrast switch.
   */
  readonly environment?: boolean;
}

function aborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new DOMException('the mode stopped loading', 'AbortError');
}

/** Fetches the pieces, environment and nothing else that a recipe draws on the timer, in parallel. */
export async function libraryFor(recipe: Recipe, mode: Omit<BuiltInMode, 'id' | 'recipe'>, signal?: AbortSignal): Promise<PieceLibrary> {
  const types = [...new Set(recipe.layers.map((layer) => layer.type))].filter((type) => PIECES[type] !== undefined);
  const environment = mode.environment !== false && recipe.environment !== undefined && recipe.environment.type !== 'theme' ? ENVIRONMENTS[recipe.environment.type] : undefined;
  const camera = recipe.camera?.type === 'follow-zoom' && recipe.layers.some((layer) => layer.space === 'camera');
  const [factories, environmentFactory, stage] = await Promise.all([
    Promise.all(types.map(async (type) => [type, await (PIECES[type] as () => Promise<AnyPiece>)()] as const)),
    environment?.(),
    camera ? import('./camera.ts').then(({ CameraStage }): StageFactory => (...args) => new CameraStage(...args)) : undefined,
  ]);
  aborted(signal);
  return {
    pieces: Object.fromEntries(factories),
    ...(stage === undefined ? {} : { stage }),
    ...(environmentFactory === undefined ? {} : { environment: environmentFactory }),
    view: viewFor(recipe),
    ...(mode.chrome === undefined || mode.environment === false ? {} : { chrome: mode.chrome }),
    ...(mode.slots === undefined ? {} : { slots: mode.slots }),
  };
}

/** A built-in mode ready to mount: its recipe (checked when the site was built) and every piece it draws, fetched. */
export async function prepareMode(mode: BuiltInMode, signal?: AbortSignal): Promise<DisplayModeFactory> {
  aborted(signal);
  const recipe = builtInRecipe(mode.recipe);
  const library = await libraryFor(recipe, mode, signal);
  return () => createRecipeMode(mode.id, recipe, library);
}
