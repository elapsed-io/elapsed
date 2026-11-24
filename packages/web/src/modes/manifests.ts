/**
 * Every display mode's manifest, the standard modes' (standard-manifests.ts) and the test modes' (test-manifests.ts),
 * for the build's scripts and plugins and for the tests. The site itself never imports this module: it registers the
 * standard modes, and the test modes only on a flagged visit (modes/registry.ts, modes/test-modes.ts).
 */

import { STANDARD_MODE_MANIFESTS } from './standard-manifests.ts';
import type { ModeManifest } from './standard-manifests.ts';
import { TEST_MODE_MANIFESTS } from './test-manifests.ts';

export { DEFAULT_MODE_ID, MODE_BUDGET, STANDARD_MODE_MANIFESTS } from './standard-manifests.ts';
export type { ModeManifest, ModeOptionSetting } from './standard-manifests.ts';
export { TEST_MODE_MANIFESTS } from './test-manifests.ts';

export const MODE_MANIFESTS: readonly ModeManifest[] = [...STANDARD_MODE_MANIFESTS, ...TEST_MODE_MANIFESTS];
