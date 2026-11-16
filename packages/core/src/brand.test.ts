import { describe, expect, it } from 'vitest';
import { BRAND } from './brand.ts';

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
    for (const [path, text] of strings(BRAND.copy)) {
      const plain = text.replace(PROPER, '');
      expect(plain, path).toBe(plain.toLowerCase());
    }
  });

  it('has no empty copy', () => {
    for (const [path, text] of strings(BRAND.copy)) {
      expect(text.trim(), path).not.toBe('');
    }
  });
});
