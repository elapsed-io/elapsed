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

/** Built from parts, so this file does not match them itself. */
export const SECRET_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['private key', new RegExp(['-----BEGIN ', '(?:[A-Z]+ )*PRIVATE KEY-----'].join(''))],
  ['GitHub token', new RegExp(['\\bgh[pousr]', '_[A-Za-z0-9]{36,}'].join(''))],
  ['GitHub fine-grained token', new RegExp(['github', '_pat_[A-Za-z0-9_]{40,}'].join(''))],
  ['AWS access key', new RegExp(['\\bAKIA', '[0-9A-Z]{16}\\b'].join(''))],
  ['Stripe key', new RegExp(['\\b[rs]k', '_(?:live|test)_[0-9A-Za-z]{16,}'].join(''))],
  ['Stripe webhook secret', new RegExp(['\\bwhsec', '_[0-9A-Za-z]{16,}'].join(''))],
  ['Google API key', new RegExp(['\\bAIza', '[0-9A-Za-z_-]{35}'].join(''))],
  ['Slack token', new RegExp(['\\bxox', '[abprs]-[0-9A-Za-z-]{10,}'].join(''))],
  ['JSON web token (a Supabase key is one)', new RegExp(['\\beyJ', '[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}'].join(''))],
  ['Cloudflare token in a variable', new RegExp(['CLOUDFLARE_', '(?:API_TOKEN|API_KEY)\\s*[=:]\\s*["\']?[A-Za-z0-9_-]{20,}'].join(''))],
  ['a secret assigned a literal', new RegExp(['(?:api[_-]?key|secret|token|password)', '["\']?\\s*[=:]\\s*["\'][A-Za-z0-9_+/=-]{24,}["\']'].join(''), 'i')],
];

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

  it('holds no secrets: keys, tokens or credentials in any text file', () => {
    // Plan, Infrastructure > Secrets: "nothing secret in the repository". The common shapes of keys and
    // tokens for the services the plan names (Cloudflare, GitHub, Stripe, Supabase, Google) and in general.
    for (const [name, pattern] of SECRET_PATTERNS) expect(containing(pattern), name).toEqual([]);
  });

  it('keeps local secret files out of git', () => {
    const ignored = readFileSync(join(root, '.gitignore'), 'utf8').split('\n');
    for (const entry of ['.env', '.env.*', '.dev.vars*', '.wrangler/']) expect(ignored, entry).toContain(entry);
    expect(files.filter((path) => /(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars.*|[^/]+\.(?:pem|key|p12))$/.test(path))).toEqual([]);
  });
});
