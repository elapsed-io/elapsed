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
  readonly imports?: readonly string[];
}
type Manifest = Readonly<Record<string, ManifestChunk>>;

/** Same-origin URLs a document or stylesheet references directly. */
function htmlReferences(html: string): string[] {
  const found: string[] = [];
  const tags = /<(?:script|link)\b[^>]*>/g;
  for (const [tag] of html.matchAll(tags)) {
    if (/\brel=["']?icon\b/.test(tag)) continue;
    const url = /\b(?:src|href)=["']([^"']+)["']/.exec(tag)?.[1];
    if (url !== undefined && url.startsWith('/')) found.push(url.slice(1));
  }
  return found;
}

function cssReferences(css: string): string[] {
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
