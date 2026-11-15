/**
 * Builds the service worker (src/sw/sw.ts) as /sw.js beside the site.
 *
 * It is emitted as an extra entry of the site's own build, then checked to be
 * one self-contained classic script (no imports or exports), because a
 * worker must not share chunks with the page. Two placeholders are filled in:
 *
 * - __SW_PRECACHE__: the core, cached on install (plan, Loading and
 *   performance: "Core ... First visit; cached for offline use"): the page,
 *   everything it loads before it is interactive (the same closure the size
 *   budget measures), the manifest and the tab icon.
 * - __SW_VERSION__: a hash of the page, the worker and every file name in the
 *   build. File names carry content hashes, so any change gives a new version,
 *   and the browser's byte-for-byte check of /sw.js notices it.
 */

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Plugin, Rollup } from 'vite';
import { cssReferences, htmlReferences } from '../scripts/size-budget.ts';
import { ICON_FILES, MANIFEST_FILE } from './web-app.ts';

export const SERVICE_WORKER_FILE = 'sw.js';
const SOURCE = fileURLToPath(new URL('../src/sw/sw.ts', import.meta.url));

function text(bundle: Rollup.OutputBundle, file: string): string | undefined {
  const output = bundle[file];
  if (output === undefined) return undefined;
  if (output.type === 'chunk') return output.code;
  return typeof output.source === 'string' ? output.source : new TextDecoder().decode(output.source);
}

/** The page and every file it loads before it is interactive, as bundle file names. */
export function coreClosure(bundle: Rollup.OutputBundle): string[] {
  const pending = ['index.html'];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || seen.has(file) || bundle[file] === undefined) continue;
    seen.add(file);
    const output = bundle[file];
    const body = text(bundle, file) ?? '';
    if (file.endsWith('.html')) pending.push(...htmlReferences(body));
    if (file.endsWith('.css')) pending.push(...cssReferences(body));
    if (output.type === 'chunk') {
      pending.push(...output.imports);
      pending.push(...(output.viteMetadata?.importedCss ?? []), ...(output.viteMetadata?.importedAssets ?? []));
    }
  }
  return [...seen].sort();
}

function replaceOnce(code: string, placeholder: string, value: string): string {
  const parts = code.split(placeholder);
  if (parts.length !== 2) throw new Error(`${SERVICE_WORKER_FILE}: expected ${placeholder} exactly once, found ${String(parts.length - 1)}`);
  return parts.join(value);
}

export function serviceWorker(): Plugin {
  return {
    name: 'stopwatch:service-worker',
    apply: 'build',
    buildStart() {
      this.emitFile({ type: 'chunk', id: SOURCE, fileName: SERVICE_WORKER_FILE });
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const worker = bundle[SERVICE_WORKER_FILE];
        if (worker?.type !== 'chunk') throw new Error(`${SERVICE_WORKER_FILE} is missing from the build`);
        if (worker.imports.length > 0 || worker.dynamicImports.length > 0 || worker.exports.length > 0 || /\bimport\s*[({"'`]|\bexport\s*[{*]/.test(worker.code)) {
          throw new Error(`${SERVICE_WORKER_FILE} must be one self-contained script; it imports or exports code`);
        }
        const core = coreClosure(bundle).filter((file) => file !== 'index.html');
        const precache = ['/', ...core.map((file) => `/${file}`), `/${MANIFEST_FILE}`, `/${ICON_FILES.svg}`];
        const hash = createHash('sha256');
        hash.update(text(bundle, 'index.html') ?? '');
        hash.update(worker.code);
        for (const file of Object.keys(bundle).sort()) hash.update(`\n${file}`);
        const version = hash.digest('hex').slice(0, 16);
        worker.code = replaceOnce(worker.code, '__SW_PRECACHE__', JSON.stringify(precache));
        worker.code = replaceOnce(worker.code, '__SW_VERSION__', JSON.stringify(version));
      },
    },
  };
}
