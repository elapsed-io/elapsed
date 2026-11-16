/**
 * Text that must never appear in the repository, which is public:
 *
 * - the placeholders used before the product had a name;
 * - the admin address that owns every backend service account (plan,
 *   Infrastructure > Supply chain: "never shown publicly"; owner, 2026-11-16:
 *   never in code, on the site or in public docs).
 *
 * The patterns are built from parts so this file does not contain them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report', '.wrangler']);
const TEXT_FILE = /\.(?:ts|js|mjs|cjs|css|html|json|jsonc|md|txt|yml|yaml|sql|py|toml|svg)$/;
/** Safety overviews and the decisions log are records of their time; they may quote the old placeholders. */
const HISTORICAL = /^docs\/(?:safety\/round-1\.[1-5]\.md|decisions\.md)$/;

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return SKIP_DIRECTORIES.has(name) ? [] : walk(path);
    return TEXT_FILE.test(name) ? [path] : [];
  });
}

const files = walk(root).map((path) => relative(root, path).split('\\').join('/'));
const containing = (pattern: RegExp, skip: RegExp | null = null): string[] =>
  files.filter((path) => skip === null || !skip.test(path)).filter((path) => pattern.test(readFileSync(join(root, path), 'utf8')));

describe('repository text', () => {
  it('has no product-name placeholders left', () => {
    const placeholder = new RegExp(['\\[', '(?:site|domain)', '\\]'].join(''));
    expect(containing(placeholder, HISTORICAL)).toEqual([]);
  });

  it('never contains the admin address', () => {
    const admin = new RegExp(['\\badmin', '@'].join(''), 'i');
    expect(containing(admin)).toEqual([]);
  });
});
