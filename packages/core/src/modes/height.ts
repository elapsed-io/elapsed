/**
 * Height (plan, Design system > Display modes): 140 m per focused minute, stopping at 100 km. The sky is linear
 * RGB (0.078, 0.275, 0.597) × e^(−K·h / 8,500 m), K = (1.25, 1.1, 0.95), drawn as a gradient from h + 1,500 m at
 * the top of the screen to h − 1,500 m at the bottom; stars fade in between 18 and 42 km; the replay is a climb
 * profile with layer bands and at most two random landmarks per 10 km band.
 */

import { CONFIG } from '../config.ts';
import { attenuated, hex } from './light.ts';
import type { LinearRgb } from './light.ts';
import { pickByBand, spreadBy } from './landmarks.ts';

const HEIGHT = CONFIG.modes.height;
const MINUTE = 60_000;

export type AtmosphereLayer = 'troposphere' | 'stratosphere' | 'mesosphere' | 'thermosphere';
export type HeightLandmarkId = (typeof HEIGHT.landmarks)[number][1];

export interface HeightLandmark {
  readonly height: number;
  readonly id: HeightLandmarkId;
}

/** Metres climbed after `focusedMs` of focus, continuous, stopping at 100 km. */
export function heightReached(focusedMs: number): number {
  return Math.min(HEIGHT.maxHeightMetres, (Math.max(0, focusedMs) / MINUTE) * HEIGHT.metresPerFocusedMinute);
}

const perMetre = HEIGHT.attenuation.map((k) => k / HEIGHT.scaleHeightMetres) as unknown as LinearRgb;
const clampHeight = (height: number): number => Math.min(Math.max(0, height), HEIGHT.maxHeightMetres);

/** The sky's colour at `height` (sRGB hex), as the frames compute it; below the ground is the ground's sky. */
export function skyColour(height: number): `#${string}` {
  return hex(attenuated(HEIGHT.groundLinearRgb, perMetre, clampHeight(height)));
}

/**
 * The light on the results card at `height`: the same light model dimmed (65 %), so text stays readable over it
 * (plan, Display modes > Results replays; the "results: height (build this one)" frame).
 */
export function skyLitColour(height: number): `#${string}` {
  const dimmed = HEIGHT.groundLinearRgb.map((value) => value * HEIGHT.results.lit.dim) as unknown as LinearRgb;
  return hex(attenuated(dimmed, perMetre, clampHeight(height)));
}

export function atmosphereLayer(height: number): AtmosphereLayer {
  const { troposphere, stratosphere, mesosphere } = HEIGHT.layers;
  if (height < troposphere) return 'troposphere';
  if (height < stratosphere) return 'stratosphere';
  if (height < mesosphere) return 'mesosphere';
  return 'thermosphere';
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** How visible the stars are at `height`: none below 18 km, fading in (smoothstep) to all of them at 42 km. */
export function starsOpacity(height: number): number {
  const { start, end } = HEIGHT.starsFadeMetres;
  return smoothstep((height - start) / (end - start));
}

export const HEIGHT_LANDMARKS: readonly HeightLandmark[] = HEIGHT.landmarks.map(([height, id]) => ({ height, id }));

/**
 * The landmarks a replay shows: from each 10 km band of the catalog, one or two at random (never more than
 * two), in height order. `random` returns numbers in [0, 1), like Math.random.
 */
export function pickHeightLandmarks(random: () => number): HeightLandmark[] {
  return pickByBand(HEIGHT_LANDMARKS, (landmark) => landmark.height, HEIGHT.landmarkBandMetres, HEIGHT.landmarksPerBand, random);
}

/** At most `max` landmarks, spread along the climb (as ocean depth's spreadLandmarks). */
export function spreadHeightLandmarks(landmarks: readonly HeightLandmark[], max: number, random: () => number): HeightLandmark[] {
  return spreadBy(landmarks, (landmark) => landmark.height, max, random);
}
