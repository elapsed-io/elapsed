/**
 * The test modes, for a visit opened with the test flag only (test-flag.ts): their manifests and where each one's
 * descriptor is downloaded from. The app loads this module and registers them (registry.ts registerModes) before it
 * shows a mode; a visit without the flag never fetches it, so it knows of no test mode and downloads none.
 */

import type { ModeSource } from './registry.ts';

export { TEST_MODE_MANIFESTS } from './test-manifests.ts';

export const TEST_MODE_SOURCES: Readonly<Record<string, ModeSource>> = {
  ocean: async () => (await import('./built-in/ocean.ts')).OCEAN,
  height: async () => (await import('./built-in/height.ts')).HEIGHT,
  tree: async () => (await import('./built-in/tree.ts')).TREE,
  interstellar: async () => (await import('./built-in/interstellar.ts')).INTERSTELLAR,
};
