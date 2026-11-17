/**
 * A projected sky (docs/recipes/mode-recipes.md, `starfield` with a `projection`; plan, Display modes >
 * Interstellar): the still view is the layer's `view` catalog (the canvas's own stars) projected gnomonically about
 * the view's centre at the layer's right ascension and declination, with the faint stars scattered over the frames;
 * while the recipe turns the sky (paused), the whole catalog in the layer's slot (every HYG star to magnitude 5)
 * is drawn once as a strip a full turn wide along the sky's equator and slid sideways by one CSS animation, a full
 * turn in `turnMinutes`, wrapping seamlessly, crossfading from the still view over 2 s. Never with low power or
 * reduced motion: the sky then stays still.
 *
 * Each star's radius is max(min, at0 + perMagnitude × m) (0.7, 2.7 and −0.42), its opacity 1 − 0.1 m, warm or
 * white, with a faint glow three times its radius for those brighter than magnitude 1 (the frames). Everything is
 * drawn in reference pixels and scaled like the time.
 */

import { CONFIG } from '@stopwatch/core';
import type { StarfieldLayer } from '@stopwatch/core';
import { html, svg } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';

const SKY = CONFIG.modes.interstellar.sky;
const REFERENCE = CONFIG.design.reference.timer;

/** [right ascension (h), declination (°), magnitude, warm] */
export type ViewStar = readonly [number, number, number, boolean];
/** [x, y, radius, opacity] in reference pixels */
export type FaintStar = readonly [number, number, number, number];

export interface StillSky {
  readonly stars: readonly ViewStar[];
  /** The faint stars over the timer's frame (720 × 450), tiled past it. */
  readonly faint: readonly FaintStar[];
  /** The faint stars over the results card's frame (720 × 520). */
  readonly faintResults: readonly FaintStar[];
}

export function isStillSky(value: unknown): value is StillSky {
  if (typeof value !== 'object' || value === null) return false;
  const sky = value as Record<string, unknown>;
  const rows = (list: unknown, check: (row: readonly unknown[]) => boolean): boolean => Array.isArray(list) && list.every((row: unknown) => Array.isArray(row) && row.length === 4 && check(row));
  const numbers = (row: readonly unknown[], count: number): boolean => row.slice(0, count).every((item) => typeof item === 'number' && Number.isFinite(item));
  return rows(sky['stars'], (row) => numbers(row, 3) && typeof row[3] === 'boolean') && rows(sky['faint'], (row) => numbers(row, 4)) && rows(sky['faintResults'], (row) => numbers(row, 4));
}

/** A catalog as the HYG file holds it: [right ascension (h), declination (°), magnitude, B−V]. */
export function isCatalog(value: unknown): value is { readonly stars: readonly (readonly [number, number, number, number])[] } {
  if (typeof value !== 'object' || value === null) return false;
  const stars = (value as Record<string, unknown>)['stars'];
  return Array.isArray(stars) && stars.every((row: unknown) => Array.isArray(row) && row.length === 4 && row.every((item: unknown) => typeof item === 'number' && Number.isFinite(item)));
}

export interface Projection {
  readonly ra: number;
  readonly dec: number;
  readonly pxPerDegree: number;
}

export function projectionOf(layer: StarfieldLayer): Projection {
  const { rightAscensionHours, declinationDegrees, pxPerDegree } = CONFIG.modes.interstellar.projection;
  return { ra: layer.projection?.ra ?? rightAscensionHours, dec: layer.projection?.dec ?? declinationDegrees, pxPerDegree: layer.projection?.pxPerDegree ?? pxPerDegree };
}

const RADIANS = Math.PI / 180;

/** Where a star falls on a gnomonic projection about `projection`, centred at (cx, cy), right ascension increasing to the left. */
export function gnomonic(ra: number, dec: number, projection: Projection, cx: number, cy: number): readonly [number, number] | null {
  const a = (ra - projection.ra) * 15 * RADIANS;
  const d = dec * RADIANS;
  const d0 = projection.dec * RADIANS;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a);
  if (cosc <= 0) return null;
  const x = (Math.cos(d) * Math.sin(a)) / cosc;
  const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a)) / cosc;
  const scale = projection.pxPerDegree / RADIANS;
  return [cx - x * scale, cy - y * scale];
}

export interface StarSizes {
  readonly min: number;
  readonly at0: number;
  readonly perMagnitude: number;
}

export function sizesOf(layer: StarfieldLayer): StarSizes {
  const { minPx, basePx, perMagnitudePx } = CONFIG.modes.interstellar.starRadius;
  return { min: layer.radius?.min ?? minPx, at0: layer.radius?.at0 ?? basePx, perMagnitude: layer.radius?.perMagnitude ?? -perMagnitudePx };
}

const fixed = (value: number, places: number): string => value.toFixed(places);

/** A star as the frames draw it: its glow if bright, then the star. */
function star(doc: Document, x: number, y: number, magnitude: number, warm: boolean, sizes: StarSizes): SVGElement[] {
  const radius = Math.max(sizes.min, sizes.at0 + sizes.perMagnitude * magnitude);
  const fill = warm ? SKY.warm : SKY.white;
  const cx = fixed(x, 1);
  const cy = fixed(y, 1);
  const drawn: SVGElement[] = [];
  if (magnitude < SKY.glowBelowMagnitude) drawn.push(svg(doc, 'circle', { cx, cy, r: fixed(radius * SKY.glowScale, 1), fill, opacity: fixed(SKY.glowOpacity, 2) }));
  drawn.push(svg(doc, 'circle', { cx, cy, r: fixed(radius, 2), fill, opacity: fixed(Math.min(1, 1 - SKY.opacityPerMagnitude * magnitude), 2) }));
  return drawn;
}

/** Faint stars scattered over a frame `tile` big, repeated to fill `width` × `height`. */
function faintStars(doc: Document, faint: readonly FaintStar[], width: number, height: number, tile: { readonly width: number; readonly height: number }): SVGElement[] {
  const drawn: SVGElement[] = [];
  for (let top = 0; top < height; top += tile.height)
    for (let left = 0; left < width; left += tile.width)
      for (const [x, y, r, opacity] of faint)
        if (left + x <= width && top + y <= height) drawn.push(svg(doc, 'circle', { cx: fixed(left + x, 1), cy: fixed(top + y, 1), r: String(r), fill: SKY.faint, opacity: fixed(opacity, 2) }));
  return drawn;
}

/** The still view `width` × `height` reference pixels: the faint stars, then the catalog projected about its centre. */
export function drawStill(doc: Document, sky: StillSky, faint: readonly FaintStar[], tile: { readonly width: number; readonly height: number }, width: number, height: number, projection: Projection, sizes: StarSizes, opacity: number): SVGGElement {
  const stars = sky.stars.flatMap(([ra, dec, magnitude, warm]) => {
    const point = gnomonic(ra, dec, projection, width / 2, height / 2);
    return point === null ? [] : star(doc, point[0], point[1], magnitude, warm, sizes);
  });
  return svg(doc, 'g', { opacity: String(opacity) }, [...faintStars(doc, faint, width, height, tile), ...stars]);
}

/** The whole sky as a strip one turn wide (twice over, so it wraps), along the equator about the projection's centre. */
export function drawStrip(doc: Document, catalog: readonly (readonly [number, number, number, number])[], width: number, height: number, projection: Projection, sizes: StarSizes, magnitudeMax: number, opacity: number): SVGGElement {
  const turn = 360 * projection.pxPerDegree;
  const stars: SVGElement[] = [];
  for (const [ra, dec, magnitude, colour] of catalog) {
    if (magnitude > magnitudeMax) continue;
    const y = height / 2 - (dec - projection.dec) * projection.pxPerDegree;
    if (y < -12 || y > height + 12) continue;
    const offset = ((((ra - projection.ra) * 15 + 540) % 360) + 360) % 360 - 180;
    const x = width / 2 - offset * projection.pxPerDegree;
    const warm = colour >= SKY.warmFromColourIndex;
    stars.push(...star(doc, x, y, magnitude, warm, sizes), ...star(doc, x - turn, y, magnitude, warm, sizes));
  }
  return svg(doc, 'g', { opacity: String(opacity) }, stars);
}

/** The starfield piece with a projection: the still view, and the turning sky while the recipe turns it. */
export function skyPiece({ doc, layer, context, slots, stage }: PieceSetup<StarfieldLayer>): Piece {
  const projection = projectionOf(layer);
  const sizes = sizesOf(layer);
  const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
  const still = svg(doc, 'svg', { class: 'sky__still', 'aria-hidden': 'true', focusable: 'false' });
  const strip = svg(doc, 'svg', { class: 'sky__strip', 'aria-hidden': 'true', focusable: 'false' });
  const turning = html(doc, 'div', { class: 'sky__turning' }, [strip]);
  const box = html(doc, 'div', { class: 'sky__box' }, [still, turning]);
  const element = html(doc, 'div', { class: 'sky' }, [box]);
  const turn = 360 * projection.pxPerDegree;
  let catalog: readonly (readonly [number, number, number, number])[] | null = null;
  let loading = false;
  let pan: Animation | null = null;
  let wanted = false;
  let gone = false;

  const size = (): { readonly width: number; readonly height: number } => {
    const layout = stage?.layout;
    const view = doc.defaultView;
    const scale = layout?.scale ?? Math.min((view?.innerWidth ?? REFERENCE.width) / REFERENCE.width, (view?.innerHeight ?? REFERENCE.height) / REFERENCE.height);
    const width = layout?.width ?? (view?.innerWidth ?? REFERENCE.width) / scale;
    const height = layout?.height ?? (view?.innerHeight ?? REFERENCE.height) / scale;
    box.style.setProperty('width', `${String(width)}px`);
    box.style.setProperty('height', `${String(height)}px`);
    box.style.setProperty('transform', `scale(${String(scale)})`);
    return { width, height };
  };

  const drawView = (): void => {
    const { width, height } = size();
    const data = layer.view === undefined ? undefined : slots.data(layer.view);
    still.setAttribute('viewBox', `0 0 ${String(width)} ${String(height)}`);
    still.replaceChildren(...(isStillSky(data) ? [drawStill(doc, data, data.faint, REFERENCE, width, height, projection, sizes, opacity)] : []));
    if (catalog !== null) drawTurning();
  };

  const drawTurning = (): void => {
    if (catalog === null) return;
    const { width, height } = size();
    strip.setAttribute('viewBox', `${String(-turn)} 0 ${String(width + turn)} ${String(height)}`);
    strip.style.setProperty('left', `${String(-turn)}px`);
    strip.style.setProperty('width', `${String(width + turn)}px`);
    strip.style.setProperty('height', `${String(height)}px`);
    strip.replaceChildren(drawStrip(doc, catalog, width, height, projection, sizes, layer.magnitudeMax ?? 5, opacity));
  };

  /** Starts the turn from the current view, so nothing jumps. */
  const startTurning = (): void => {
    pan?.cancel();
    const minutes = layer.pan?.turnMinutes ?? 6;
    pan = strip.animate([{ transform: 'translateX(0px)' }, { transform: `translateX(${String(turn)}px)` }], { duration: minutes * 60_000, iterations: Infinity, easing: 'linear' });
    element.classList.add('sky--turning');
  };

  const turnSky = (on: boolean): void => {
    if (on === wanted) return;
    wanted = on;
    if (!on) {
      element.classList.remove('sky--turning');
      return;
    }
    if (catalog !== null) {
      startTurning();
      return;
    }
    if (loading) return;
    loading = true;
    void slots.load(layer.slot).then((data) => {
      loading = false;
      if (gone || !isCatalog(data)) return;
      catalog = data.stars;
      drawTurning();
      if (wanted) startTurning();
    });
  };

  drawView();
  stage?.onLayout(drawView);

  return {
    backdrop: [element],
    render({ paused }) {
      const turns = (layer.pan?.when ?? []).includes('paused') && paused && !context.lowPower && !context.reducedMotion;
      turnSky(turns);
    },
    unmount() {
      gone = true;
      pan?.cancel();
      pan = null;
    },
  };
}
