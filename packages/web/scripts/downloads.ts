/**
 * Every download the site fetches after the core, measured from the build (round 2.10's per-download budgets): each
 * downloaded mode (its descriptor, pieces, environment, view and art: mode-downloads.ts), each piece, results view,
 * environment and the camera on its own, and the optional parts (settings, results, the custom CSS editor, a flagged
 * visit's test modes and their settings tiles, the downloaded-modes list, the image store, the service worker, the
 * credits page's theme script). A part counts what loading
 * it fetches at once; a mode, a piece or a view counts what it fetches later too (its art).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { CAMERA_SOURCE, ENVIRONMENT_SOURCES, PIECE_SOURCES, VIEW_SOURCES } from '../src/modes/sources.ts';
import { coreModeSources, modeDownload } from './mode-downloads.ts';
import { coreFiles, packageSize } from './size-budget.ts';

/** The optional parts, by name: the module each one's download starts from. */
export const PARTS: Readonly<Record<string, string>> = {
  'settings panel': 'src/settings/panel.ts',
  results: 'src/results/results.ts',
  'custom CSS editor': 'src/settings/css-editor.ts',
  'test modes (flagged visits)': 'src/modes/test-modes.ts',
  'test-mode settings (flagged visits)': 'src/settings/test-modes.ts',
  'downloaded modes list': 'src/storage/mode-cache.ts',
  'image store': 'src/storage/media-store.ts',
  'service worker': 'src/sw/sw.ts',
  'site pages theme': 'src/pages/theme.ts',
  'picture-in-picture (flagged visits)': 'src/pip/pip.ts',
};

export interface Download {
  /** `mode:<id>`, `piece:<type>`, `view:<type>`, `environment:<type>`, `camera` or `part:<name>`. */
  readonly id: string;
  readonly codeBytes: number;
  readonly artBytes: number;
  readonly files: readonly string[];
}

export function measureDownloads(distDir: string): Download[] {
  const inCore = coreModeSources();
  const measured: Download[] = [];
  const add = (id: string, sources: readonly string[], follow: 'all' | 'static', skipCore = true): void => {
    // A mode's download leaves out what the core modes fetch anyway; a piece, view or part counts on its own.
    const own = skipCore ? sources.filter((source) => !inCore.has(source)) : sources;
    if (own.length === 0) return;
    measured.push({ id, ...packageSize(distDir, own, inCore, follow) });
  };
  for (const manifest of MODE_MANIFESTS.filter((mode) => mode.tier === 'on-choice')) add(`mode:${manifest.id}`, modeDownload(manifest.id), 'all');
  for (const [type, source] of Object.entries(PIECE_SOURCES)) add(`piece:${type}`, [source], 'all');
  for (const [type, source] of Object.entries(VIEW_SOURCES)) add(`view:${type}`, [source], 'all', false);
  for (const [type, source] of Object.entries(ENVIRONMENT_SOURCES)) add(`environment:${type}`, [source], 'all');
  add('camera', [CAMERA_SOURCE], 'all');
  for (const [name, source] of Object.entries(PARTS)) add(`part:${name}`, [source], 'static');
  return measured;
}

/** Script chunks outside the core that no measured download fetches: a download nobody budgeted. */
export function unmeasuredChunks(distDir: string, downloads: readonly Download[]): string[] {
  const manifest = JSON.parse(readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8')) as Readonly<Record<string, { readonly file: string }>>;
  const core = new Set(coreFiles(distDir).map((file) => file.path));
  const measured = new Set(downloads.flatMap((download) => download.files));
  return [...new Set(Object.values(manifest).map((chunk) => chunk.file))].filter((file) => file.endsWith('.js') && !core.has(file) && !measured.has(file)).sort();
}
