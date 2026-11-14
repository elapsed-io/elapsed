import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
// Built from parts so this file does not contain the placeholder itself.
const PLACEHOLDER = ['[', 'site', ']'].join('');
const ALLOWED = new Set(['packages/core/src/brand.ts', 'docs/plan.md']);
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report']);
const TEXT_FILE = /\.(?:ts|js|css|html|json|md|yml|yaml)$/;

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return SKIP_DIRECTORIES.has(name) ? [] : walk(path);
    return TEXT_FILE.test(name) ? [path] : [];
  });
}

describe('brand placeholder', () => {
  it('appears only in the brand module', () => {
    const offenders = walk(root)
      .map((path) => relative(root, path).split('\\').join('/'))
      .filter((path) => !ALLOWED.has(path))
      .filter((path) => readFileSync(join(root, path), 'utf8').includes(PLACEHOLDER));
    expect(offenders).toEqual([]);
  });
});
