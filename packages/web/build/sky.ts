/**
 * Serves `virtual:sky/<recipe>/<layer>`: a built-in recipe's projected starfield layer, its skies drawn at build
 * time (sky-art.ts) as SVG images. In a build each image is a hashed asset of the chunk that imports it (so the
 * size check and the offline map of downloaded modes count it with the mode); while developing, a data: URL.
 *
 * The module's default export is the layer's two slots' data, by the slots' built-in keys:
 * - the view slot (the still sky): `{ still, faint, card }`, each `{ url, x, y, width, height }` in reference
 *   pixels, `still` placed from the view's centre;
 * - the turning slot (the whole catalog): `{ url, x, y, width, height, centreY }`, one turn wide.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { CONFIG, SPACE_CONFIG } from '@stopwatch/core';
import { CANVAS_STARS, FAINT_STARS_RESULTS, FAINT_STARS_TIMER } from '../src/art/space/canvas-stars.ts';
import { MODE_BUILD } from '../src/modes/sources.ts';
import { cardImage, faintTile, stillImage, stripImage } from './sky-art.ts';
import type { CatalogStar, Projection, SkyImage, SkyLook, StarSizes } from './sky-art.ts';

const PREFIX = 'virtual:sky/';
const RESOLVED = '\0virtual:sky/';
const read = (path: string): string => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

interface StarfieldLayer {
  readonly type: 'starfield';
  readonly id: string;
  readonly slot: string;
  readonly view?: string;
  readonly magnitudeMax?: number;
  readonly projection?: { readonly ra?: number; readonly dec?: number; readonly pxPerDegree?: number };
  readonly radius?: { readonly min?: number; readonly at0?: number; readonly perMagnitude?: number };
}

interface RecipeFile {
  readonly layers: readonly { readonly type: string; readonly id: string }[];
  readonly slots?: readonly { readonly id: string; readonly default: string }[];
}

/** The catalogs a built-in slot may name, by its key. */
const CATALOGS: Readonly<Record<string, () => { readonly stars: readonly CatalogStar[]; readonly credit: string }>> = {
  'stars/hyg-mag5': () => {
    const file = JSON.parse(read('../src/art/stars/hyg-mag5.json')) as { readonly stars: readonly CatalogStar[]; readonly source: string; readonly licence: string };
    return { stars: file.stars, credit: `${file.source}. Licence: ${file.licence} (src/art/stars/LICENSE.md).` };
  },
};

/** The still skies a built-in slot may name, by its key. */
const VIEWS: Readonly<Record<string, () => { readonly stars: typeof CANVAS_STARS; readonly faint: typeof FAINT_STARS_TIMER; readonly faintCard: typeof FAINT_STARS_RESULTS }>> = {
  'space/canvas-stars': () => ({ stars: CANVAS_STARS, faint: FAINT_STARS_TIMER, faintCard: FAINT_STARS_RESULTS }),
};

const LOOK: SkyLook = SPACE_CONFIG.sky;

function slotKey(recipe: RecipeFile, id: string | undefined): string {
  const found = recipe.slots?.find((slot) => slot.id === id)?.default ?? '';
  return found.startsWith('builtin:') ? found.slice('builtin:'.length) : '';
}

/** The images of one recipe's starfield layer, drawn. */
export function skyImages(recipeId: string, layerId: string): { readonly view: Readonly<Record<string, SkyImage>>; readonly turning: SkyImage & { readonly centreY: number }; readonly viewKey: string; readonly turningKey: string } {
  const build = MODE_BUILD[recipeId];
  if (build === undefined) throw new Error(`virtual:sky: no built-in recipe ${recipeId}`);
  const recipe = JSON.parse(read(`../${build.recipe}`)) as RecipeFile;
  const layer = recipe.layers.find((candidate) => candidate.id === layerId) as StarfieldLayer | undefined;
  if (layer?.type !== 'starfield' || layer.projection === undefined) throw new Error(`virtual:sky: ${recipeId} has no projected starfield ${layerId}`);
  const { rightAscensionHours, declinationDegrees, pxPerDegree } = SPACE_CONFIG.projection;
  const projection: Projection = { ra: layer.projection.ra ?? rightAscensionHours, dec: layer.projection.dec ?? declinationDegrees, pxPerDegree: layer.projection.pxPerDegree ?? pxPerDegree };
  const { minPx, basePx, perMagnitudePx } = SPACE_CONFIG.starRadius;
  const sizes: StarSizes = { min: layer.radius?.min ?? minPx, at0: layer.radius?.at0 ?? basePx, perMagnitude: layer.radius?.perMagnitude ?? -perMagnitudePx };
  const viewKey = slotKey(recipe, layer.view);
  const turningKey = slotKey(recipe, layer.slot);
  const view = VIEWS[viewKey]?.();
  const catalog = CATALOGS[turningKey]?.();
  if (view === undefined || catalog === undefined) throw new Error(`virtual:sky: ${recipeId}/${layerId} names slots the build cannot draw (${viewKey}, ${turningKey})`);
  return {
    viewKey,
    turningKey,
    view: {
      still: stillImage(view.stars, projection, sizes, LOOK),
      faint: faintTile(view.faint, CONFIG.design.reference.timer, LOOK),
      card: cardImage(view.stars, view.faintCard, CONFIG.design.reference.results, projection, sizes, LOOK),
    },
    turning: stripImage(catalog.stars, projection, sizes, layer.magnitudeMax ?? 5, LOOK, catalog.credit),
  };
}

export function skyArt(): Plugin {
  let serving = false;
  return {
    name: 'stopwatch:sky',
    configResolved(config) {
      serving = config.command === 'serve';
    },
    resolveId: (id) => (id.startsWith(PREFIX) ? RESOLVED + id.slice(PREFIX.length) : undefined),
    load(id) {
      if (!id.startsWith(RESOLVED)) return undefined;
      const [recipeId = '', layerId = ''] = id.slice(RESOLVED.length).split('/');
      const drawn = skyImages(recipeId, layerId);
      const url = (name: string, picture: SkyImage): string => {
        if (serving) return JSON.stringify(`data:image/svg+xml,${encodeURIComponent(picture.svg)}`);
        // Vite's own asset placeholder: the build writes the file's hashed URL here and lists it among the chunk's assets.
        const reference = this.emitFile({ type: 'asset', name: `${recipeId}-${layerId}-${name}.svg`, source: picture.svg });
        return JSON.stringify(`__VITE_ASSET__${reference}__`);
      };
      const entry = (name: string, picture: SkyImage, extra = ''): string => `{ url: ${url(name, picture)}, x: ${String(picture.x)}, y: ${String(picture.y)}, width: ${String(picture.width)}, height: ${String(picture.height)}${extra} }`;
      const view = Object.entries(drawn.view).map(([name, picture]) => `${name}: ${entry(name, picture)}`).join(', ');
      return `export default { ${JSON.stringify(drawn.viewKey)}: { ${view} }, ${JSON.stringify(drawn.turningKey)}: ${entry('turning', drawn.turning, `, centreY: ${String(drawn.turning.centreY)}`)} };\n`;
    },
  };
}
