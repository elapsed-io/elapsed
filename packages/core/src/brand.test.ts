import { describe, expect, it } from 'vitest';
import { BRAND } from './brand.ts';

function strings(value: unknown, path = 'copy'): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}.${key}`));
  }
  return [];
}

describe('brand', () => {
  it('keeps every interface string lowercase', () => {
    for (const [path, text] of strings(BRAND.copy)) {
      expect(text, path).toBe(text.toLowerCase());
    }
  });

  it('has no empty copy', () => {
    for (const [path, text] of strings(BRAND.copy)) {
      expect(text.trim(), path).not.toBe('');
    }
  });
});
