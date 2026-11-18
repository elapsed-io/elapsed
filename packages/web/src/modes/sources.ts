/**
 * Where each mode's code comes from, for the build alone (the size check, the size report and the service
 * worker's map of downloaded modes); the site never imports this. A mode's download is its descriptor
 * (modes/built-in), the pieces its recipe's layers name, its environment, its results view and, with a follow-zoom
 * camera, the camera stage: the modules recipe/library.ts fetches for it. Paths are relative to packages/web; a
 * unit test holds this list and library.ts to the same modules (recipe/library.test.ts).
 */

import type { LayerType } from '@stopwatch/core';

export const PIECE_SOURCES: { readonly [T in LayerType]?: string } = {
  ring: 'src/modes/pieces/ring/ring.ts',
  track: 'src/modes/pieces/track/track.ts',
  dial: 'src/modes/pieces/dial/dial.ts',
  tree: 'src/modes/pieces/tree/tree.ts',
  particles: 'src/modes/pieces/particles/particles.ts',
  starfield: 'src/modes/pieces/starfield/starfield.ts',
  circles: 'src/modes/pieces/map/circles.ts',
  shape: 'src/modes/pieces/map/shape.ts',
  path: 'src/modes/pieces/map/path.ts',
  landmarks: 'src/modes/pieces/map/landmarks.ts',
};

export const ENVIRONMENT_SOURCES: Readonly<Record<string, string>> = {
  'light-falloff': 'src/modes/pieces/light/light.ts',
  stops: 'src/modes/pieces/stops/stops.ts',
};

export const VIEW_SOURCES = {
  strip: 'src/modes/shared/strip-replay.ts',
  'rings-per-hour': 'src/modes/pieces/ring/ring-replay.ts',
  profile: 'src/modes/views/profile.ts',
  scene: 'src/modes/pieces/tree/tree-replay.ts',
  'scene-camera': 'src/modes/views/space.ts',
} as const;

export const CAMERA_SOURCE = 'src/modes/recipe/camera.ts';

/** Each mode's recipe file (relative to packages/web) and whether it draws its own environment (BuiltInMode.environment). */
export const MODE_BUILD: Readonly<Record<string, { readonly recipe: string; readonly environment: boolean }>> = {
  digits: { recipe: '../../docs/recipes/recipes/digits.json', environment: true },
  ring: { recipe: '../../docs/recipes/recipes/ring.json', environment: true },
  timeline: { recipe: '../../docs/recipes/recipes/timeline.json', environment: true },
  analog: { recipe: '../../docs/recipes/recipes/analog.json', environment: true },
  ocean: { recipe: '../../docs/recipes/recipes/ocean-depth.json', environment: false },
  height: { recipe: '../../docs/recipes/recipes/height.json', environment: false },
  tree: { recipe: '../../docs/recipes/recipes/tree.json', environment: true },
  interstellar: { recipe: '../../docs/recipes/recipes/interstellar.json', environment: true },
};

interface RecipeShape {
  readonly layers?: readonly { readonly type?: string; readonly space?: string }[];
  readonly environment?: { readonly type?: string };
  readonly camera?: { readonly type?: string };
  readonly results?: { readonly view?: { readonly type?: string; readonly camera?: boolean } };
}

/** The modules a recipe's mode fetches beside its descriptor, as library.ts fetches them. */
export function recipeSources(recipe: RecipeShape, environment: boolean): string[] {
  const sources = new Set<string>();
  for (const layer of recipe.layers ?? []) {
    const piece = PIECE_SOURCES[layer.type as LayerType];
    if (piece !== undefined) sources.add(piece);
  }
  const environmentType = recipe.environment?.type;
  if (environment && environmentType !== undefined && environmentType !== 'theme') {
    const source = ENVIRONMENT_SOURCES[environmentType];
    if (source !== undefined) sources.add(source);
  }
  if (recipe.camera?.type === 'follow-zoom' && (recipe.layers ?? []).some((layer) => layer.space === 'camera')) sources.add(CAMERA_SOURCE);
  const view = recipe.results?.view;
  const viewKey = view?.type === 'scene' && view.camera === true ? 'scene-camera' : view?.type;
  if (viewKey !== undefined && viewKey in VIEW_SOURCES) sources.add(VIEW_SOURCES[viewKey as keyof typeof VIEW_SOURCES]);
  return [...sources].sort();
}
