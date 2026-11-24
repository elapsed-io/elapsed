import { describe, expect, it } from 'vitest';
import { STANDARD_MODES, TEST_MODES } from '@stopwatch/core';
import { findMode, registerModes } from './registry.ts';
import { TEST_MODE_MANIFESTS, TEST_MODE_SOURCES } from './test-modes.ts';

describe('the mode registry', () => {
  it('knows only the standard modes until a flagged visit registers the test modes', () => {
    for (const id of STANDARD_MODES) expect(findMode(id)?.manifest.id).toBe(id);
    for (const id of TEST_MODES) expect(findMode(id)).toBeUndefined();
    registerModes(TEST_MODE_MANIFESTS, TEST_MODE_SOURCES);
    for (const id of TEST_MODES) expect(findMode(id)?.manifest.id).toBe(id);
    // Registering again changes nothing.
    registerModes(TEST_MODE_MANIFESTS, TEST_MODE_SOURCES);
    expect(findMode('ocean')?.manifest.name).toBe('ocean depth');
    expect(findMode('calendar')).toBeUndefined();
  });
});
