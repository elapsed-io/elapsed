/**
 * The `profile` results view (ocean depth, height): the shared profile chart (shared/profile-chart.ts) drawn from
 * the recipe: its measure, zones and light; the passing layer's things; the landmarks layer's list, capped per
 * band and in total; and what the results show besides on the lit card (height's stars and horizon, each a
 * binding of the value reached, compiled to CSS of the one replay progress value) and the finale (the sonar
 * pings). The chart's finer geometry is each frame's own (CONFIG), by recipe; ocean depth's for any other.
 */

import './profile.css';
import { BRAND, CONFIG, bindingAt, environmentColour, pickByBand } from '@stopwatch/core';
import type { Recipe, ShapeLayer, StarfieldLayer } from '@stopwatch/core';
import { ART } from '../../art/registry.ts';
import { html, svg } from '../../dom.ts';
import { bindingCss } from '../recipe/binding-css.ts';
import type { ResultsView } from '../recipe/piece.ts';
import type { Slots } from '../recipe/slots.ts';
import { resultsLayers } from '../recipe/recipe-mode.ts';
import { drawProfile, grouped, percent } from '../shared/profile-chart.ts';
import type { FinaleContext, ProfileLandmark, ProfileSpec } from '../shared/profile-chart.ts';
import { drawField } from '../pieces/starfield/starfield.ts';

const OCEAN = CONFIG.modes.ocean.results;
const HEIGHT = CONFIG.modes.height.results;

/** Each frame's own chart geometry, as the profile spec reads it. */
interface Tuning {
  readonly chart: Omit<ProfileSpec['chart'], 'zoneLines' | 'landmark'> & { readonly zoneLines: Omit<ProfileSpec['chart']['zoneLines'], 'names'> };
  readonly landmark: { readonly flipAfterPx: number; readonly fadeMetres: number };
  readonly lit: { readonly near: number; readonly far: number; readonly blackFrom: number; readonly step: number };
  readonly passing: { readonly fromPx: number; readonly travelPx: number; readonly cardHeightPx: number; readonly cardWidthPx: number };
  readonly copy: { readonly profile: string; readonly landmarksPassed: string };
}

const chartOf = (results: typeof OCEAN | typeof HEIGHT, valueBaselinePx: number, at: readonly number[]): Tuning['chart'] => ({
  widthPx: results.widthPx,
  heightPx: results.heightPx,
  minScaleMetres: results.minScaleMetres,
  scaleHeadroom: results.scaleHeadroom,
  textInsetPx: results.textInsetPx,
  valueBaselinePx,
  zoneBaselinePx: results.zoneBaselinePx,
  lineWidthPx: results.lineWidthPx,
  headRadiusPx: results.headRadiusPx,
  zoneLines: { ...results.zoneLines, at },
});

const TUNING: Readonly<Record<string, Tuning>> = {
  'ocean-depth': {
    chart: chartOf(OCEAN, OCEAN.depthBaselinePx, OCEAN.zoneLines.depths),
    landmark: OCEAN.landmark,
    lit: { near: OCEAN.lit.aboveMetres, far: OCEAN.lit.belowMetres, blackFrom: OCEAN.lit.blackFromMetres, step: 1 },
    passing: OCEAN.passing,
    copy: BRAND.copy.ocean,
  },
  height: {
    chart: chartOf(HEIGHT, HEIGHT.valueBaselinePx, HEIGHT.zoneLines.heights),
    // The same markers as ocean depth's (both frames draw them alike), passed over the climb's own distances.
    landmark: { ...OCEAN.landmark, ...HEIGHT.landmark },
    lit: { near: HEIGHT.lit.belowMetres, far: HEIGHT.lit.aboveMetres, blackFrom: HEIGHT.lit.blackFromMetres, step: HEIGHT.lit.stepMetres },
    passing: HEIGHT.passing,
    copy: BRAND.copy.height,
  },
};

/** A built-in landmark list's entries (a landmark-list slot's data). */
export interface LandmarkEntry {
  readonly at: number;
  readonly id: string;
  readonly name: string;
}

function isLandmarks(value: unknown): value is readonly LandmarkEntry[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'object' && entry !== null && typeof (entry as LandmarkEntry).at === 'number' && typeof (entry as LandmarkEntry).name === 'string');
}

/** The landmark's label from the layer's template: only its name and its value, as text. */
function landmarkLabel(template: string, entry: LandmarkEntry): string {
  return template.replace(/\{(landmark|value)\}/g, (_, name: string) => (name === 'landmark' ? entry.name : grouped(entry.at)));
}

const find = <T extends Recipe['layers'][number]['type']>(layers: readonly Recipe['layers'][number][], type: T) => layers.filter((layer): layer is Extract<Recipe['layers'][number], { type: T }> => layer.type === type);

/** The sonar pings from the deepest point as the replay ends (the "results: ocean depth" frame). */
function pings(count: number, colour: string | undefined, { doc, surface, geometry }: FinaleContext): HTMLElement[] {
  const { fromRadiusPx, toRadiusPx, strokePx, durationMs, lagMs, opacity } = OCEAN.pings;
  return Array.from({ length: count }, (_, index) => {
    const size = 2 * toRadiusPx;
    const ping = html(doc, 'div', { class: 'profile__ping', attrs: { 'aria-hidden': 'true' } }, [
      svg(doc, 'svg', { class: 'profile__ping-ring', viewBox: `0 0 ${String(size)} ${String(size)}` }, [svg(doc, 'circle', { cx: toRadiusPx, cy: toRadiusPx, r: toRadiusPx - strokePx / 2, 'stroke-width': strokePx })]),
    ]);
    ping.style.setProperty('--ping-x', percent(geometry.head.x / OCEAN.widthPx));
    ping.style.setProperty('--ping-y', percent(geometry.head.y / OCEAN.heightPx));
    if (colour !== undefined) ping.style.setProperty('--ping-colour', colour);
    ping.animate(
      [
        { transform: `translate(-50%, -50%) scale(${String(fromRadiusPx / toRadiusPx)})`, opacity },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: durationMs * surface.scale, delay: surface.lengthMs + index * lagMs * surface.scale, easing: 'linear', fill: 'none' },
    );
    return ping;
  });
}

/** A starfield on the card: its slot's field, its opacity the binding of the value reached (CSS while it replays). */
function cardStars(doc: Document, layer: StarfieldLayer, slots: Slots, reached: number): HTMLElement {
  const binding = layer.opacity ?? 1;
  const stars = html(doc, 'div', { class: 'card-stars' }, [drawField(doc, slots.key(layer.slot), 'card-stars__art')]);
  stars.style.setProperty('--stars-final', bindingAt(binding, { measure: reached }).toFixed(2));
  stars.style.setProperty('--stars-replay', bindingCss(binding, 'var(--pd)'));
  return stars;
}

/** A shape on the card (height's horizon): its fill and glow, its height and opacity bindings of the value reached. */
function cardShape(doc: Document, layer: ShapeLayer, reached: number, cardHeight: number): HTMLElement {
  const shape = html(doc, 'div', { class: layer.shape === 'rect' ? 'card-shape' : 'card-shape card-shape--round' });
  const [width, height] = layer.size;
  const fill = layer.fill;
  const background = fill === undefined ? 'transparent' : typeof fill === 'string' ? fill : `radial-gradient(circle at 50% 50%, ${fill.radial.map(([at, colour]) => `${colour} ${String(Math.round(at * 1e6) / 1e4)}%`).join(', ')})`;
  const glow = layer.glow === undefined ? 'none' : `0 0 ${String(layer.glow.blur ?? 0)}px ${String((layer.glow.blur ?? 0) / 4)}px ${layer.glow.color ?? 'transparent'}`;
  const x = typeof layer.x === 'number' ? layer.x : 0.5;
  const y = layer.y ?? 0;
  const opacity = layer.opacity ?? 1;
  for (const [name, value] of Object.entries({
    '--shape-width': `${String(width)}px`,
    '--shape-height': `${String(height)}px`,
    '--shape-x': String(x),
    '--shape-fill': background,
    '--shape-glow': glow,
    '--shape-y-final': String(Number(bindingAt(y, { measure: reached }).toFixed(1)) / cardHeight),
    '--shape-y-replay': `calc(${bindingCss(y, 'var(--pd)')} / ${String(cardHeight)})`,
    '--shape-final': bindingAt(opacity, { measure: reached }).toFixed(2),
    '--shape-replay': bindingCss(opacity, 'var(--pd)'),
  }))
    shape.style.setProperty(name, value);
  return shape;
}

/** The profile spec for `recipe` under its option values. */
export async function profileSpec(recipe: Recipe, layers: readonly Recipe['layers'][number][], slots: Slots): Promise<ProfileSpec> {
  const tuning = TUNING[recipe.id] ?? TUNING['ocean-depth'];
  if (tuning === undefined) throw new Error('no profile tuning');
  const view = recipe.results.view;
  const direction = view.type === 'profile' && view.direction === 'up' ? 'up' : 'down';
  const max = recipe.measure.max ?? Number.MAX_SAFE_INTEGER;
  const zones = (recipe.zones ?? []).map(([id, name, from], index, all) => ({ id, name, from, to: all[index + 1]?.[2] ?? max + 1 }));
  const unit = recipe.measure.unitLabel ?? recipe.measure.unit;
  const passing = find(layers, 'passing')[0];
  const landmarks = find(layers, 'landmarks')[0];
  await slots.images([...(passing?.items.map((item) => item.slot) ?? []), ...find(layers, 'starfield').map((layer) => layer.slot)]);
  const list = landmarks === undefined ? [] : slots.data(landmarks.slot);
  const catalog: readonly LandmarkEntry[] = isLandmarks(list) ? list : [];
  const card = tuning.passing;
  const environment = recipe.environment;
  const dim = environment?.type === 'light-falloff' ? (environment.resultsDim ?? 1) : 1;
  const things = (passing?.items ?? []).map((item) => {
    const key = slots.key(item.slot);
    const box = ART.has(key) ? ART.resolve(key).viewBox : null;
    const sizePx = item.size === undefined || box === null ? undefined : ([item.size, Math.floor((item.size * box[3]) / box[2])] as const);
    return { key, from: item.from, span: item.to - item.from, peak: item.opacity ?? 1, leftPx: Math.round((item.x ?? 0.5) * card.cardWidthPx), ...(sizePx === undefined ? {} : { sizePx }) };
  });
  const pingFinale = recipe.results.finale?.find((finale) => finale.type === 'ping');
  return {
    direction,
    metresPerFocusedMinute: recipe.measure.perMinute,
    maxMetres: max,
    chart: {
      ...tuning.chart,
      zoneLines: { ...tuning.chart.zoneLines, names: tuning.chart.zoneLines.at.map((at) => zones.find((zone) => zone.from === at)?.name ?? '') },
      landmark: { ...tuning.landmark, max: landmarks?.maxTotal ?? 6 },
    },
    zones,
    copy: { value: `{value} ${unit}`, token: '{value}', profile: tuning.copy.profile, landmarksPassed: tuning.copy.landmarksPassed },
    valueClass: direction === 'down' ? 'profile__depth' : 'profile__height',
    pickLandmarks: (random) => {
      if (landmarks === undefined) return [];
      const picked = pickByBand(catalog, (entry) => entry.at, landmarks.perBand?.size ?? Number.MAX_SAFE_INTEGER, landmarks.perBand?.max ?? 2, random);
      return picked.map((entry): ProfileLandmark => ({ at: entry.at, id: entry.id, label: landmarkLabel(landmarks.labels?.template ?? '{landmark} · {value} m', entry) }));
    },
    lit: {
      colour: (at) => environmentColour(recipe, at, dim) ?? '#000000',
      nearMetres: tuning.lit.near,
      farMetres: tuning.lit.far,
      blackFromMetres: tuning.lit.blackFrom,
      crossfadeMs: (recipe.results.card?.crossSeconds ?? 0.35) * 1000,
      stepMetres: tuning.lit.step,
    },
    passing: { ...card, things, ready: () => Promise.resolve() },
    finale: (context) => ({
      ...(pingFinale?.type === 'ping' ? { chart: pings(pingFinale.count ?? 1, pingFinale.color, context) } : {}),
      backdrop: [
        ...find(layers, 'starfield').map((layer) => cardStars(context.doc, layer, slots, context.geometry.reached)),
        ...find(layers, 'shape').map((layer) => cardShape(context.doc, layer, context.geometry.reached, card.cardHeightPx)),
      ],
    }),
  };
}

export const profileView: ResultsView = async (surface, session, recipe, options, slots) => {
  const layers = resultsLayers(recipe, options);
  const spec = await profileSpec(recipe, layers, slots);
  await drawProfile(spec, surface, session, { landmarks: layers.some((layer) => layer.type === 'landmarks') });
};
