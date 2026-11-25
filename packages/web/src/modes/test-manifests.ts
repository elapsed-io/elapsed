/**
 * The test modes' manifests (core TEST_MODES): proofs of concept for the recipe system, offered only on a visit
 * opened with the test flag (test-flag.ts). Only such a visit loads this module (through modes/test-modes.ts); the
 * build and the tests read it with the rest (manifests.ts).
 */

import { TEST_MODES_COPY } from '@stopwatch/core';
import { MODE_BUDGET } from './standard-manifests.ts';
import type { ModeManifest } from './standard-manifests.ts';

const names = TEST_MODES_COPY.names;

export const TEST_MODE_MANIFESTS: readonly ModeManifest[] = [
  { id: 'ocean', name: names.ocean, tier: 'on-choice', budget: MODE_BUDGET, source: 'src/modes/built-in/ocean.ts', options: { 'ocean-life': 'oceanLife', landmarks: 'resultsLandmarks' } },
  { id: 'height', name: names.height, tier: 'on-choice', budget: MODE_BUDGET, source: 'src/modes/built-in/height.ts', options: { landmarks: 'heightLandmarks' } },
  { id: 'tree', name: names.tree, tier: 'on-choice', budget: MODE_BUDGET, source: 'src/modes/built-in/tree.ts', options: { 'tree-view': 'treeView' } },
  { id: 'interstellar', name: names.interstellar, tier: 'on-choice', budget: MODE_BUDGET, source: 'src/modes/built-in/interstellar.ts', options: {} },
];
