/**
 * Measures what a first visit downloads from the built site and compares it
 * with the core budget (plan, Loading and performance > Budgets): at most
 * 50 KB of JavaScript and 150 KB in total, compressed. Above a budget is a
 * warning; above twice the budget fails.
 *
 * "Compressed" is measured as gzip at level 9 for text files, a conservative
 * stand-in for what Cloudflare sends (Brotli is smaller). Fonts and images are
 * already compressed and count at their file size.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export type Verdict = 'ok' | 'warn' | 'fail';

export function verdict(bytes: number, budget: number, failFactor: number): Verdict {
  if (bytes > budget * failFactor) return 'fail';
  if (bytes > budget) return 'warn';
  return 'ok';
}

const TEXT_EXTENSIONS = /\.(?:html|css|js|mjs|json|svg|txt|webmanifest)$/;

export function compressedSize(path: string, contents: Buffer): number {
  return TEXT_EXTENSIONS.test(path) ? gzipSync(contents, { level: 9 }).length : contents.length;
}

interface ManifestChunk {
  readonly file: string;
  readonly src?: string;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
  readonly css?: readonly string[];
  readonly assets?: readonly string[];
}
type Manifest = Readonly<Record<string, ManifestChunk>>;

/** Same-origin URLs a document or stylesheet references directly. */
export function htmlReferences(html: string): string[] {
  const found: string[] = [];
  const tags = /<(?:script|link)\b[^>]*>/g;
  for (const [tag] of html.matchAll(tags)) {
    // Icons for tabs and home screens, and the manifest, are not part of what the page needs to run.
    if (/\brel=["']?(?:icon|apple-touch-icon|manifest)\b/.test(tag)) continue;
    const url = /\b(?:src|href)=["']([^"']+)["']/.exec(tag)?.[1];
    if (url !== undefined && url.startsWith('/')) found.push(url.slice(1));
  }
  return found;
}

export function cssReferences(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const url = match[1];
    if (url?.startsWith('/') === true) found.push(url.slice(1));
  }
  return found;
}

export interface CoreFile {
  readonly path: string;
  readonly bytes: number;
  readonly isJavaScript: boolean;
}

/** Every file the entry page loads before it is interactive: HTML, its scripts and their static imports, CSS and what the CSS loads. */
export function coreFiles(distDir: string): CoreFile[] {
  const manifest = JSON.parse(readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8')) as Manifest;
  const byFile = new Map(Object.values(manifest).map((chunk) => [chunk.file, chunk]));
  const pending = ['index.html'];
  const seen = new Set<string>();
  const files: CoreFile[] = [];

  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || seen.has(path)) continue;
    seen.add(path);
    const contents = readFileSync(join(distDir, path));
    files.push({ path, bytes: compressedSize(path, contents), isJavaScript: /\.m?js$/.test(path) });

    if (path.endsWith('.html')) pending.push(...htmlReferences(contents.toString('utf8')));
    if (path.endsWith('.css')) pending.push(...cssReferences(contents.toString('utf8')));
    for (const imported of byFile.get(path)?.imports ?? []) {
      const chunk = manifest[imported];
      if (chunk !== undefined) pending.push(chunk.file);
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

const ART = /\.(?:svg|png|webp|avif|jpe?g|gif)$/;
/** An art catalog (data drawn through the asset registry), in its own folder apart from the code: art too. */
const CATALOG = /^src\/art\/[a-z0-9-]+\//;

export interface ChunkSize {
  readonly codeBytes: number;
  readonly artBytes: number;
  readonly files: readonly string[];
}

/**
 * What one lazily loaded package (a display mode, a piece, later a widget) adds on top of the core: the chunks of
 * its source modules (a mode's descriptor and the pieces, environment and view its recipe fetches), their
 * stylesheets, their art, and any chunk they import, now or later (art catalogs load when used), that the core does
 * not already load. Images and art catalogs count as art.
 */
export function packageSize(distDir: string, sources: string | readonly string[], bundledInCore: ReadonlySet<string> = new Set(), follow: 'all' | 'static' = 'all'): ChunkSize {
  const manifest = JSON.parse(readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8')) as Manifest;
  const core = new Set(coreFiles(distDir).map((file) => file.path));
  const files = new Set<string>();
  const catalogs = new Set<string>();
  const visit = (chunk: ManifestChunk): void => {
    if (core.has(chunk.file) || files.has(chunk.file)) return;
    files.add(chunk.file);
    if (chunk.src !== undefined && CATALOG.test(chunk.src)) catalogs.add(chunk.file);
    for (const path of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) if (!core.has(path)) files.add(path);
    // `static`: what loading it fetches at once; `all`: and whatever it loads later (its art, its replay).
    for (const imported of [...(chunk.imports ?? []), ...(follow === 'all' ? (chunk.dynamicImports ?? []) : [])]) {
      const next = manifest[imported];
      if (next !== undefined) visit(next);
    }
  };
  for (const source of typeof sources === 'string' ? [sources] : sources) {
    const entry = Object.values(manifest).find((chunk) => chunk.src === source);
    // A module the core imports statically (the ring and track pieces, drawn by core modes) has no chunk of its own.
    if (entry === undefined && !bundledInCore.has(source)) throw new Error(`${source} is not in the build`);
    if (entry !== undefined) visit(entry);
  }
  let codeBytes = 0;
  let artBytes = 0;
  for (const path of files) {
    const bytes = compressedSize(path, readFileSync(join(distDir, path)));
    if (ART.test(path) || catalogs.has(path)) artBytes += bytes;
    else codeBytes += bytes;
  }
  return { codeBytes, artBytes, files: [...files].sort() };
}
