/**
 * The display-mode registry. Every mode is a recipe drawn with the piece library (recipe/library.ts). The app finds
 * modes here and never imports one directly. Digits, ring and timeline are in the core, ready without a download;
 * analog is downloaded the first time it is shown, and the test modes are known only on a flagged visit, downloaded
 * the same way (plan, Loading and performance), with only the pieces their
 * recipes use. Loading is one pipeline (prepareMode) and can be cancelled.
 */

import type { DisplayModeFactory } from './contract.ts';
import { DIGITS } from './built-in/digits.ts';
import { RING } from './built-in/ring.ts';
import { TIMELINE } from './built-in/timeline.ts';
import type { BuiltInMode } from './recipe/library.ts';
import { prepareMode } from './recipe/library.ts';
import { STANDARD_MODE_MANIFESTS } from './standard-manifests.ts';
import type { ModeManifest } from './standard-manifests.ts';

/** Where a mode's descriptor comes from: the core's at once, the others' by download. */
export type ModeSource = () => BuiltInMode | Promise<BuiltInMode>;

/** The standard modes' sources. */
const SOURCES: Record<string, ModeSource> = {
  digits: () => DIGITS,
  ring: () => RING,
  timeline: () => TIMELINE,
  analog: async () => (await import('./built-in/analog.ts')).ANALOG,
};
const MANIFESTS: ModeManifest[] = [...STANDARD_MODE_MANIFESTS];

/**
 * Registers the test modes, on a visit opened with the test flag only (test-flag.ts): their manifests and sources
 * come from modes/test-modes.ts, which nothing else loads, so a visit without the flag knows of no test mode.
 */
export function registerModes(manifests: readonly ModeManifest[], sources: Readonly<Record<string, ModeSource>>): void {
  for (const manifest of manifests) {
    const source = sources[manifest.id];
    if (source === undefined || MANIFESTS.some((known) => known.id === manifest.id)) continue;
    MANIFESTS.push(manifest);
    SOURCES[manifest.id] = source;
  }
}

export interface RegisteredMode {
  readonly manifest: ModeManifest;
  /** Fetches the mode and every piece it draws; a cancelled load (the signal aborted) rejects and builds nothing. */
  readonly load: (signal?: AbortSignal) => Promise<DisplayModeFactory>;
}

export function findMode(id: string): RegisteredMode | undefined {
  const manifest = MANIFESTS.find((candidate) => candidate.id === id);
  const source = manifest === undefined ? undefined : SOURCES[manifest.id];
  if (manifest === undefined || source === undefined) return undefined;
  return { manifest, load: async (signal) => prepareMode(await source(), signal) };
}
