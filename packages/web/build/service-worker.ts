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
 * - __SW_MODES__: each downloaded mode's own files (modeFiles below), which
 *   the worker keeps in that mode's cache once the mode is used.
 */

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Plugin, Rollup } from 'vite';
import { cssReferences, htmlReferences } from '../scripts/size-budget.ts';
import { coreModeSources, modeDownloads } from '../scripts/mode-downloads.ts';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { ICON_FILES, MANIFEST_FILE } from './web-app.ts';

export const SERVICE_WORKER_FILE = 'sw.js';
const SOURCE = fileURLToPath(new URL('../src/sw/sw.ts', import.meta.url));

function text(bundle: Rollup.OutputBundle, file: string): string | undefined {
  const output = bundle[file];
  if (output === undefined) return undefined;
  if (output.type === 'chunk') return output.code;
  return typeof output.source === 'string' ? output.source : new TextDecoder().decode(output.source);
}

/**
 * The page and every file it loads before it is interactive, as bundle file
 * names: what the HTML and CSS reference, scripts' static imports and their
 * CSS. Asset URLs a script only mentions (the built-in fonts, fetched when
 * chosen) are left out, as the size check leaves them out; the worker caches
 * each of them the first time it is fetched.
 */
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
      pending.push(...(output.viteMetadata?.importedCss ?? []));
    }
  }
  return [...seen].sort();
}

/** A chunk's own files: itself, its stylesheets and assets, and the chunks it imports (statically or not). */
function chunkFiles(bundle: Rollup.OutputBundle, starts: readonly string[], stop: (file: string) => boolean): Set<string> {
  const seen = new Set<string>();
  const pending = [...starts];
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || seen.has(file) || stop(file)) continue;
    const output = bundle[file];
    if (output === undefined) continue;
    seen.add(file);
    if (output.type !== 'chunk') continue;
    pending.push(...output.imports, ...output.dynamicImports);
    pending.push(...(output.viteMetadata?.importedCss ?? []), ...(output.viteMetadata?.importedAssets ?? []));
  }
  return seen;
}

/**
 * Each downloaded mode's own files, as paths: everything its download brings (its descriptor, and the pieces,
 * environment, results view and camera its recipe fetches, with their styles and art), less anything the rest of
 * the site also loads (the core, the settings panel, results, what core modes draw with). Those stay in the
 * version's own cache; only a mode's own files go with the mode. A piece two modes draw goes with each.
 */
export function modeFiles(bundle: Rollup.OutputBundle, downloads: Readonly<Record<string, readonly string[]>>, coreSources: ReadonlySet<string> = new Set()): Record<string, string[]> {
  const chunks = Object.values(bundle).filter((output): output is Rollup.OutputChunk => output.type === 'chunk');
  const starts = new Map<string, string[]>();
  for (const [id, sources] of Object.entries(downloads)) {
    const files: string[] = [];
    for (const source of sources) {
      if (coreSources.has(source)) continue;
      const chunk = chunks.find((candidate) => candidate.facadeModuleId === source);
      if (chunk === undefined) throw new Error(`the ${id} mode (${source}) is not in the build`);
      files.push(chunk.fileName);
    }
    starts.set(id, files);
  }
  const modeEntries = new Set([...starts.values()].flat());
  const siteEntries = chunks.filter((chunk) => chunk.isEntry && chunk.fileName !== SERVICE_WORKER_FILE).map((chunk) => chunk.fileName);
  const site = chunkFiles(bundle, siteEntries, (file) => modeEntries.has(file));
  const result: Record<string, string[]> = {};
  for (const [id, files] of starts) {
    result[id] = [...chunkFiles(bundle, files, (file) => site.has(file))].sort().map((file) => `/${file}`);
  }
  return result;
}

const absolute = (source: string): string => fileURLToPath(new URL(`../${source}`, import.meta.url));
const DOWNLOADS = modeDownloads();
const ON_CHOICE_DOWNLOADS = Object.fromEntries(MODE_MANIFESTS.filter((manifest) => manifest.tier === 'on-choice').map((manifest) => [manifest.id, (DOWNLOADS[manifest.id] ?? []).map(absolute)]));
const CORE_SOURCES = new Set([...coreModeSources()].map(absolute));

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
        worker.code = replaceOnce(worker.code, '__SW_MODES__', JSON.stringify(modeFiles(bundle, ON_CHOICE_DOWNLOADS, CORE_SOURCES)));
      },
    },
  };
}
