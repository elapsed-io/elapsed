/**
 * The display-mode registry. Every mode is a recipe drawn with the piece library (recipe/library.ts). The app finds
 * modes here and never imports one directly. Digits, ring and timeline are in the core, ready without a download;
 * the rest are downloaded the first time they are shown (plan, Loading and performance), with only the pieces their
 * recipes use. Loading is one pipeline (prepareMode) and can be cancelled.
 */

import type { DisplayModeFactory } from './contract.ts';
import { DIGITS } from './built-in/digits.ts';
import { RING } from './built-in/ring.ts';
import { TIMELINE } from './built-in/timeline.ts';
import type { BuiltInMode } from './recipe/library.ts';
import { prepareMode } from './recipe/library.ts';
import { MODE_MANIFESTS } from './manifests.ts';
import type { ModeManifest } from './manifests.ts';

/** Where each mode's descriptor comes from: the core's at once, the others' by download. */
const SOURCES: Readonly<Record<string, () => BuiltInMode | Promise<BuiltInMode>>> = {
  digits: () => DIGITS,
  ring: () => RING,
  timeline: () => TIMELINE,
  analog: async () => (await import('./built-in/analog.ts')).ANALOG,
  ocean: async () => (await import('./built-in/ocean.ts')).OCEAN,
  height: async () => (await import('./built-in/height.ts')).HEIGHT,
  tree: async () => (await import('./built-in/tree.ts')).TREE,
  interstellar: async () => (await import('./built-in/interstellar.ts')).INTERSTELLAR,
};

export interface RegisteredMode {
  readonly manifest: ModeManifest;
  /** Fetches the mode and every piece it draws; a cancelled load (the signal aborted) rejects and builds nothing. */
  readonly load: (signal?: AbortSignal) => Promise<DisplayModeFactory>;
}

export function findMode(id: string): RegisteredMode | undefined {
  const manifest = MODE_MANIFESTS.find((candidate) => candidate.id === id);
  const source = manifest === undefined ? undefined : SOURCES[manifest.id];
  if (manifest === undefined || source === undefined) return undefined;
  return { manifest, load: async (signal) => prepareMode(await source(), signal) };
}
