/**
 * The display-mode registry. The app finds modes here and never imports one
 * directly. Core-tier modes are bundled; the rest are separate chunks
 * downloaded the first time they are shown (plan, Loading and performance).
 */

import type { DisplayModeFactory } from './contract.ts';
import { createDigitsMode } from './digits/digits.ts';
import { MODE_MANIFESTS } from './manifests.ts';
import type { ModeManifest } from './manifests.ts';

const LOADERS: Readonly<Record<string, () => Promise<DisplayModeFactory>>> = {
  digits: () => Promise.resolve(createDigitsMode),
  ring: async () => (await import('./ring/ring.ts')).createRingMode,
  timeline: async () => (await import('./timeline/timeline.ts')).createTimelineMode,
  analog: async () => (await import('./analog/analog.ts')).createAnalogMode,
  ocean: async () => (await import('./ocean/ocean.ts')).createOceanMode,
  height: async () => (await import('./height/height.ts')).createHeightMode,
};

export interface RegisteredMode {
  readonly manifest: ModeManifest;
  readonly load: () => Promise<DisplayModeFactory>;
}

export function findMode(id: string): RegisteredMode | undefined {
  const manifest = MODE_MANIFESTS.find((candidate) => candidate.id === id);
  const load = manifest === undefined ? undefined : LOADERS[manifest.id];
  return manifest === undefined || load === undefined ? undefined : { manifest, load };
}
