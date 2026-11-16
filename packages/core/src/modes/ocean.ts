/**
 * Ocean depth (plan, Design system > Display modes): 15 m per focused minute, stopping at 10,935 m; the
 * background is linear RGB (0.0232, 0.212, 0.392) × e^(−K·depth), K = (0.30, 0.06, 0.023) per metre, drawn
 * as a gradient from depth − 6 m to depth + 6 m; the replay is a dive profile with zone bands and at most
 * two random landmarks per 1,000 m band.
 */

import { CONFIG } from '../config.ts';
import { attenuated, hex } from './light.ts';

const OCEAN = CONFIG.modes.ocean;
const MINUTE = 60_000;

export type OceanZone = 'sunlight' | 'twilight' | 'midnight' | 'abyssal' | 'hadal';
export type LandmarkId = (typeof OCEAN.landmarks)[number][1];

export interface Landmark {
  readonly depth: number;
  readonly id: LandmarkId;
}

/** Metres reached after `focusedMs` of focus, continuous, stopping at the deepest point. */
export function oceanDepth(focusedMs: number): number {
  return Math.min(OCEAN.maxDepthMetres, (Math.max(0, focusedMs) / MINUTE) * OCEAN.metresPerFocusedMinute);
}

/** The water's colour at `depth` (sRGB hex), as the frames compute it; above the surface is the surface. */
export function oceanColour(depth: number): `#${string}` {
  return hex(attenuated(OCEAN.surfaceLinearRgb, OCEAN.attenuationPerMetre, Math.min(Math.max(0, depth), OCEAN.maxDepthMetres)));
}

/**
 * The light on the results card at `depth`: the same light model dimmed (80 %), so text stays readable over
 * it (plan, Display modes > Results replays; the "results: ocean depth (build this one)" frame).
 */
export function oceanLitColour(depth: number): `#${string}` {
  const dimmed = OCEAN.surfaceLinearRgb.map((value) => value * OCEAN.results.lit.dim) as [number, number, number];
  return hex(attenuated(dimmed, OCEAN.attenuationPerMetre, Math.min(Math.max(0, depth), OCEAN.maxDepthMetres)));
}

export function oceanZone(depth: number): OceanZone {
  const { sunlight, twilight, midnight, abyssal } = OCEAN.zones;
  if (depth < sunlight) return 'sunlight';
  if (depth < twilight) return 'twilight';
  if (depth < midnight) return 'midnight';
  if (depth < abyssal) return 'abyssal';
  return 'hadal';
}

export const OCEAN_LANDMARKS: readonly Landmark[] = OCEAN.landmarks.map(([depth, id]) => ({ depth, id }));

/**
 * The landmarks a replay shows: from each 1,000 m band of the catalog, one or two at random (never more than
 * two), in depth order. `random` returns numbers in [0, 1), like Math.random.
 */
export function pickLandmarks(random: () => number): Landmark[] {
  const bands = new Map<number, Landmark[]>();
  for (const landmark of OCEAN_LANDMARKS) {
    const band = Math.floor(landmark.depth / OCEAN.landmarkBandMetres);
    bands.set(band, [...(bands.get(band) ?? []), landmark]);
  }
  const picked: Landmark[] = [];
  for (const band of [...bands.keys()].sort((a, b) => a - b)) {
    const pool = [...(bands.get(band) ?? [])];
    // Fisher–Yates, so every order is equally likely.
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j] as Landmark, pool[i] as Landmark];
    }
    const count = Math.min(OCEAN.landmarksPerBand, random() < 0.5 ? 1 : 2);
    picked.push(...pool.slice(0, count));
  }
  return picked.sort((a, b) => a.depth - b.depth);
}

/**
 * At most `max` landmarks, spread along the path (plan: "at most 6 landmarks per results, spread along the
 * path"): while there are too many, one of the two closest in depth goes, picked by `random`. Keeps depth order.
 */
export function spreadLandmarks(landmarks: readonly Landmark[], max: number, random: () => number): Landmark[] {
  const kept = [...landmarks].sort((a, b) => a.depth - b.depth);
  while (kept.length > Math.max(0, max)) {
    let closest = 0;
    for (let i = 1; i < kept.length - 1; i += 1) {
      const gap = (kept[i + 1]?.depth ?? 0) - (kept[i]?.depth ?? 0);
      if (gap < (kept[closest + 1]?.depth ?? 0) - (kept[closest]?.depth ?? 0)) closest = i;
    }
    kept.splice(closest + (random() < 0.5 ? 0 : 1), 1);
  }
  return kept;
}
