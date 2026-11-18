/**
 * Interstellar's skies, drawn when the site is built (plan-release-2, round 2.10: heavy preparation at build time,
 * static layers drawn once as images and only moved). The device never projects a star: the build projects the
 * recipe's catalogs with the recipe's own projection and star sizes and writes each sky as an SVG image.
 *
 * One sky everywhere, from one catalog (every HYG star to magnitude 5; owner, round 2.11):
 * - the timer's sky, still and turning: the whole sky as a strip one turn wide along the sky's equator, its rows
 *   from declination +90° to −90°, the view's centre row given; a star across the strip's edge is drawn on both
 *   edges, so two strips side by side join seamlessly;
 * - the results card's faint star field (720 × 520): the same catalog projected gnomonically about the card's
 *   centre.
 *
 * Each star's radius is max(min, at0 + perMagnitude × m), its opacity 1 − 0.1 m, warm or white, with a faint glow
 * three times its radius for those brighter than magnitude 1 (the frames), in reference pixels, rounded as the
 * site drew them before (round 2.9), so the images match those drawings.
 */

export interface Projection {
  readonly ra: number;
  readonly dec: number;
  readonly pxPerDegree: number;
}

export interface StarSizes {
  readonly min: number;
  readonly at0: number;
  readonly perMagnitude: number;
}

export interface SkyLook {
  readonly white: string;
  readonly warm: string;
  readonly opacityPerMagnitude: number;
  readonly glowBelowMagnitude: number;
  readonly glowScale: number;
  readonly glowOpacity: number;
  readonly warmFromColourIndex: number;
}

/** [right ascension (h), declination (°), magnitude, B−V] */
export type CatalogStar = readonly [number, number, number, number];

/** An image the build drew, and where it goes: its top-left corner from the view's centre, in reference pixels. */
export interface SkyImage {
  readonly svg: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const RADIANS = Math.PI / 180;
const fixed = (value: number, places: number): string => value.toFixed(places);

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

export function starRadius(magnitude: number, sizes: StarSizes): number {
  return Math.max(sizes.min, sizes.at0 + sizes.perMagnitude * magnitude);
}

/** How far a star reaches from its centre, glow included. */
function reach(magnitude: number, sizes: StarSizes, look: SkyLook): number {
  const radius = starRadius(magnitude, sizes);
  return magnitude < look.glowBelowMagnitude ? radius * look.glowScale : radius;
}

/** A star as the frames draw it: its glow if bright, then the star. */
function star(x: number, y: number, magnitude: number, warm: boolean, sizes: StarSizes, look: SkyLook): string {
  const radius = starRadius(magnitude, sizes);
  const fill = warm ? look.warm : look.white;
  const cx = fixed(x, 1);
  const cy = fixed(y, 1);
  const glow = magnitude < look.glowBelowMagnitude ? `<circle cx="${cx}" cy="${cy}" r="${fixed(radius * look.glowScale, 1)}" fill="${fill}" opacity="${fixed(look.glowOpacity, 2)}"/>` : '';
  return `${glow}<circle cx="${cx}" cy="${cy}" r="${fixed(radius, 2)}" fill="${fill}" opacity="${fixed(Math.min(1, 1 - look.opacityPerMagnitude * magnitude), 2)}"/>`;
}

function image(width: number, height: number, body: string, credit = ''): string {
  const note = credit === '' ? '' : `<!-- ${credit} -->`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}">${note}${body}</svg>`;
}

/** A card's faint star field: the catalog to `magnitudeMax`, projected about the card's centre. */
export function cardImage(catalog: readonly CatalogStar[], card: { readonly width: number; readonly height: number }, projection: Projection, sizes: StarSizes, magnitudeMax: number, look: SkyLook, credit: string): SkyImage {
  const projected = catalog.flatMap(([ra, dec, magnitude, colour]) => {
    if (magnitude > magnitudeMax) return [];
    const point = gnomonic(ra, dec, projection, card.width / 2, card.height / 2);
    if (point === null) return [];
    const r = reach(magnitude, sizes, look);
    if (point[0] + r < 0 || point[1] + r < 0 || point[0] - r > card.width || point[1] - r > card.height) return [];
    return [star(point[0], point[1], magnitude, colour >= look.warmFromColourIndex, sizes, look)];
  });
  return { svg: image(card.width, card.height, projected.join(''), credit), x: 0, y: 0, width: card.width, height: card.height };
}

/** The turning sky: one turn wide, from +90° to −90°, with `pad` pixels above and below for the brightest glows. */
export interface StripImage extends SkyImage {
  /** The row of the view's centre (the projection's declination), from the image's top. */
  readonly centreY: number;
}

export function stripImage(catalog: readonly CatalogStar[], projection: Projection, sizes: StarSizes, magnitudeMax: number, look: SkyLook, credit: string): StripImage {
  const ppd = projection.pxPerDegree;
  const turn = 360 * ppd;
  const pad = Math.ceil(Math.max(...catalog.map(([, , magnitude]) => reach(magnitude, sizes, look)))) + 1;
  const height = 180 * ppd + 2 * pad;
  const centreY = pad + (90 - projection.dec) * ppd;
  const drawn: string[] = [];
  for (const [ra, dec, magnitude, colour] of catalog) {
    if (magnitude > magnitudeMax) continue;
    const offset = (((((ra - projection.ra) * 15 + 540) % 360) + 360) % 360) - 180;
    const x = turn / 2 - offset * ppd;
    const y = pad + (90 - dec) * ppd;
    const warm = colour >= look.warmFromColourIndex;
    const r = reach(magnitude, sizes, look);
    drawn.push(star(x, y, magnitude, warm, sizes, look));
    // Across an edge: drawn on the other edge too, so strips side by side join.
    if (x - r < 0) drawn.push(star(x + turn, y, magnitude, warm, sizes, look));
    if (x + r > turn) drawn.push(star(x - turn, y, magnitude, warm, sizes, look));
  }
  return { svg: image(turn, height, drawn.join(''), credit), x: -turn / 2, y: -centreY, width: turn, height, centreY };
}
