import { describe, expect, it } from 'vitest';
import { BRAND } from './brand.ts';
import { HEIGHT_COPY } from './copy/height.ts';
import { OCEAN_COPY } from './copy/ocean.ts';
import { SETTINGS_COPY } from './copy/settings.ts';
import { SPACE_COPY } from './copy/space.ts';
import { TREE_COPY } from './copy/tree.ts';

/** Every piece of copy: the brand module's and the copy only some downloads need (copy/). */
const ALL_COPY = { ...BRAND.copy, settings: SETTINGS_COPY, ocean: OCEAN_COPY, height: HEIGHT_COPY, tree: TREE_COPY, interstellar: SPACE_COPY };

function strings(value: unknown, path = 'copy'): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

/** Names and units the frames write with capitals ("on iPhone", "up to 2 MB"). */
const PROPER = /\b(?:iPhone|MB|KB)\b/g;

describe('brand', () => {
  it('keeps every interface string lowercase', () => {
    for (const [path, text] of strings(ALL_COPY)) {
      const plain = text.replace(PROPER, '');
      expect(plain, path).toBe(plain.toLowerCase());
    }
  });

  it('has no empty copy', () => {
    for (const [path, text] of strings(ALL_COPY)) {
      expect(text.trim(), path).not.toBe('');
    }
  });
});
