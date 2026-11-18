import { describe, expect, it } from 'vitest';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { ENVIRONMENT_SOURCES, PIECE_SOURCES, VIEW_SOURCES } from '../src/modes/sources.ts';
import { CEILING_IDS, CORE_CEILING, ceilingOf } from './download-budgets.ts';
import { PARTS } from './downloads.ts';
import { coreModeSources } from './mode-downloads.ts';

describe('the download ceilings', () => {
  it('keep the core under the plan’s 50 KB of JavaScript, never above it', () => {
    expect(CORE_CEILING.javascriptBytes).toBeLessThanOrEqual(50 * 1024);
  });

  it('give every download the build measures a ceiling of its own, in bytes', () => {
    const inCore = coreModeSources();
    const ids = [
      ...MODE_MANIFESTS.filter((manifest) => manifest.tier === 'on-choice').map((manifest) => `mode:${manifest.id}`),
      ...Object.entries(PIECE_SOURCES).filter(([, source]) => !inCore.has(source)).map(([type]) => `piece:${type}`),
      ...Object.keys(VIEW_SOURCES).map((type) => `view:${type}`),
      ...Object.keys(ENVIRONMENT_SOURCES).map((type) => `environment:${type}`),
      'camera',
      ...Object.keys(PARTS).map((name) => `part:${name}`),
    ];
    expect([...CEILING_IDS].sort()).toEqual(ids.sort());
    expect(ceilingOf('mode:analog')).toEqual({ code: 5 * 1024, art: 0 });
    expect(ceilingOf('mode:calendar')).toBeUndefined();
  });
});
