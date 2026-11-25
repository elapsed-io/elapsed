/**
 * Interstellar (plan, Display modes > Interstellar; the interstellar frames): light-speed travel outward from
 * Earth's orbit on a true-scale map. The camera keeps the Sun fixed and the traveller about 85 % of the way along
 * the usable path, so pixels per AU = usable path ÷ max(distance from the Sun, 1.6 AU). Rings fade as they shrink,
 * bodies fade as their orbits shrink below 24 px once reached, Earth folds into the Sun's glow, and a name shows
 * only when it stands at least 70 px clear of the next name kept further out, so the newest keeps its name.
 * Everything here is the frames' own arithmetic; the timer's map and the results' map both draw from it.
 */

import { smoothstep } from '../recipes/measure.ts';
import { SPACE_CONFIG } from './space-config.ts';

const SPACE = SPACE_CONFIG;

export type SpaceBodyId = (typeof SPACE.landmarks)[number]['id'] | (typeof SPACE.start)['id'];

export interface SpaceBody {
  readonly id: SpaceBodyId;
  readonly au: number;
}

/** The landmarks past Earth, nearest first. */
export const SPACE_LANDMARKS: readonly SpaceBody[] = SPACE.landmarks;

/** Pixels per AU when the traveller is `distanceAu` from the Sun: the usable path ÷ max(distance, the minimum). */
export function spaceScale(distanceAu: number, usablePx: number, minAu: number = SPACE.camera.minAu): number {
  return usablePx / Math.max(distanceAu, minAu);
}

/** The timer's usable path in a view `width` wide with the Sun at `sunX`: 85 % of the way along the heading to 20 px short of the right edge. */
export function usablePath(width: number, sunX: number, headingDegrees: number = SPACE.camera.headingDegrees): number {
  const { usableShare, edgeMarginPx } = SPACE.camera;
  return (usableShare * (width - edgeMarginPx - sunX)) / Math.cos((headingDegrees * Math.PI) / 180);
}

/** A ring's opacity at `radiusPx`: gone below 3 px, full (55 %) from 9 px. */
export function ringOpacity(radiusPx: number): number {
  const { gonePx, fullPx, opacity } = SPACE.ringFade;
  return opacity * smoothstep((radiusPx - gonePx) / (fullPx - gonePx));
}

/** A landmark's opacity: nothing until the traveller reaches it, then fading out as its orbit shrinks below 38 px to 24 px. */
export function bodyOpacity(au: number, distanceAu: number, pxPerAu: number): number {
  const { gonePx, spanPx } = SPACE.bodyFade;
  return distanceAu >= au ? smoothstep((au * pxPerAu - gonePx) / spanPx) : 0;
}

/** Earth's opacity: it folds into the Sun's glow as the camera pulls back (gone below 9 px per AU, full from 17). */
export function startOpacity(pxPerAu: number): number {
  const { gonePxPerAu, spanPxPerAu } = SPACE.earthFade;
  return smoothstep((pxPerAu - gonePxPerAu) / spanPxPerAu);
}

/**
 * Which landmarks show their names, given each one's x and opacity (in the landmarks' order, nearest first): from
 * the outermost in, a name shows when its body is more than 30 % visible and stands more than 70 px clear of the
 * last name kept.
 */
export function keptLabels(bodies: readonly { readonly x: number; readonly opacity: number }[]): boolean[] {
  const { shownAbove, minGapPx } = SPACE.label;
  const kept = bodies.map(() => false);
  let last = Number.POSITIVE_INFINITY;
  for (let index = bodies.length - 1; index >= 0; index -= 1) {
    const body = bodies[index];
    if (body === undefined) continue;
    const keep = body.opacity > shownAbove && last - body.x > minGapPx;
    kept[index] = keep;
    if (keep) last = body.x;
  }
  return kept;
}

/** The heading's direction to four decimals, as the frames write it (cos −28° = 0.8829, sin −28° = −0.4695). */
export function headingDirection(headingDegrees: number): readonly [number, number] {
  const radians = (headingDegrees * Math.PI) / 180;
  return [Math.round(Math.cos(radians) * 10_000) / 10_000, Math.round(Math.sin(radians) * 10_000) / 10_000];
}

/** Where a body `au` from the Sun sits on the map: the Sun's point plus `au` × pixels per AU along the heading. */
export function mapPoint(sun: readonly [number, number], headingDegrees: number, au: number, pxPerAu: number): [number, number] {
  const [cos, sin] = headingDirection(headingDegrees);
  return [sun[0] + au * pxPerAu * cos, sun[1] + au * pxPerAu * sin];
}

/**
 * Everything the map draws at `distanceAu`: the scale, each ring's radius and opacity, each landmark's point,
 * opacity and whether its name shows, Earth's point and opacity, and the traveller's point.
 */
export interface MapState {
  readonly pxPerAu: number;
  readonly rings: readonly { readonly au: number; readonly radius: number; readonly opacity: number }[];
  readonly bodies: readonly { readonly id: SpaceBodyId; readonly au: number; readonly x: number; readonly y: number; readonly opacity: number; readonly named: boolean }[];
  readonly start: { readonly x: number; readonly y: number; readonly opacity: number };
  readonly traveller: { readonly x: number; readonly y: number };
}

export function mapState(distanceAu: number, sun: readonly [number, number], headingDegrees: number, usablePx: number): MapState {
  const pxPerAu = spaceScale(distanceAu, usablePx);
  const rings = SPACE.rings.map((au) => ({ au, radius: au * pxPerAu, opacity: ringOpacity(au * pxPerAu) }));
  const placed = SPACE_LANDMARKS.map((body) => {
    const [x, y] = mapPoint(sun, headingDegrees, body.au, pxPerAu);
    return { id: body.id, au: body.au, x, y, opacity: bodyOpacity(body.au, distanceAu, pxPerAu) };
  });
  const named = keptLabels(placed);
  const bodies = placed.map((body, index) => ({ ...body, named: named[index] === true }));
  const [sx, sy] = mapPoint(sun, headingDegrees, SPACE.start.au, pxPerAu);
  const [tx, ty] = mapPoint(sun, headingDegrees, distanceAu, pxPerAu);
  return { pxPerAu, rings, bodies, start: { x: sx, y: sy, opacity: startOpacity(pxPerAu) }, traveller: { x: tx, y: ty } };
}
