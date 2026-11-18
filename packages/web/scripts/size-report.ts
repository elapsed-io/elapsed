/**
 * The size report (round 2.10): what the first visit downloads, by module, compressed, against the core budget,
 * and what each display mode and each piece adds when it is fetched. Builds the site with one extra plugin that
 * notes each chunk's modules as rendered, then reads the build's manifest as the size check does.
 *
 *   node scripts/size-report.ts [out.md]
 *
 * A module's compressed size is its share of its chunk's compressed size, by its rendered length (modules
 * compress together, so this apportions the chunk's real size rather than compressing each alone).
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { relative } from 'node:path';
import { build } from 'vite';
import type { Plugin } from 'vite';
import { CONFIG } from '@stopwatch/core';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { ceilingOf } from './download-budgets.ts';
import { measureDownloads } from './downloads.ts';
import { coreFiles } from './size-budget.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const chunks = new Map<string, { readonly gzip: number; readonly modules: readonly { readonly id: string; readonly length: number }[] }>();

const noteModules: Plugin = {
  name: 'stopwatch:size-report',
  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk') continue;
      const modules = Object.entries(output.modules)
        .map(([id, module]) => ({ id: id.startsWith('\0') ? id.slice(1) : relative(root, id), length: module.renderedLength }))
        .filter((module) => module.length > 0);
      chunks.set(output.fileName, { gzip: gzipSync(output.code, { level: 9 }).length, modules });
    }
  },
};

await build({ root, configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), logLevel: 'warn', plugins: [noteModules] });

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(2)} KB`;
const lines: string[] = [];
const core = coreFiles(distDir);
const coreJs = core.filter((file) => file.isJavaScript);
const coreTotal = core.reduce((sum, file) => sum + file.bytes, 0);
const coreJsTotal = coreJs.reduce((sum, file) => sum + file.bytes, 0);
lines.push(`# Size report`, '', `Core JavaScript: ${kb(coreJsTotal)} of the ${kb(CONFIG.budgets.core.javascriptBytes)} budget; core total: ${kb(coreTotal)} of ${kb(CONFIG.budgets.core.totalBytes)} (gzip level 9).`, '');
lines.push('## The core, by file', '', '| File | Compressed |', '| --- | ---: |');
for (const file of core) lines.push(`| ${file.path} | ${kb(file.bytes)} |`);
lines.push('', '## The core JavaScript, by module', '', '| Module | Rendered | Compressed (share) |', '| --- | ---: | ---: |');
const byModule = new Map<string, { length: number; share: number }>();
for (const file of coreJs) {
  const chunk = chunks.get(file.path);
  if (chunk === undefined) continue;
  const total = chunk.modules.reduce((sum, module) => sum + module.length, 0);
  for (const module of chunk.modules) {
    const entry = byModule.get(module.id) ?? { length: 0, share: 0 };
    entry.length += module.length;
    entry.share += total === 0 ? 0 : (module.length / total) * chunk.gzip;
    byModule.set(module.id, entry);
  }
}
const sorted = [...byModule.entries()].sort((a, b) => b[1].share - a[1].share);
for (const [id, { length, share }] of sorted) lines.push(`| ${id} | ${(length / 1024).toFixed(1)} KB | ${kb(share)} |`);
// Every download after the core, with its ceiling (download-budgets.ts): modes with everything they fetch, and each
// piece, view, environment and optional part on its own.
const downloads = measureDownloads(distDir);
const row = (download: { readonly id: string; readonly codeBytes: number; readonly artBytes: number }): string => {
  const ceiling = ceilingOf(download.id);
  return `| ${download.id.replace(/^\w+:/, '')} | ${kb(download.codeBytes)} | ${kb(download.artBytes)} | ${ceiling === undefined ? 'none' : `${kb(ceiling.code)} / ${kb(ceiling.art)}`} |`;
};
lines.push('', '## Display modes, fetched when chosen', '', 'Digits, ring and timeline are in the core. Each other mode with everything it fetches: its recipe, the pieces its recipe draws with, its environment, its results view and its art, less what the core already holds.', '');
lines.push('| Mode | Code | Art | Ceiling (code / art) |', '| --- | ---: | ---: | ---: |');
for (const manifest of MODE_MANIFESTS.filter((mode) => mode.tier === 'core')) lines.push(`| ${manifest.id} | (in the core) | | |`);
for (const download of downloads.filter((item) => item.id.startsWith('mode:'))) lines.push(row(download));
for (const [title, prefix] of [
  ['Pieces, each its own download', 'piece:'],
  ['Results views', 'view:'],
  ['Environments and the camera', 'environment:|camera'],
  ['Optional parts', 'part:'],
] as const) {
  lines.push('', `## ${title}`, '', '| Download | Code | Art | Ceiling (code / art) |', '| --- | ---: | ---: | ---: |');
  for (const download of downloads.filter((item) => new RegExp(`^(?:${prefix})`).test(item.id))) lines.push(row(download));
}
lines.push('', '## Every chunk', '', '| Chunk | Compressed | Largest modules |', '| --- | ---: | --- |');
for (const [file, chunk] of [...chunks.entries()].sort((a, b) => b[1].gzip - a[1].gzip)) {
  const top = [...chunk.modules].sort((a, b) => b.length - a.length).slice(0, 4).map((module) => module.id.replace(/^src\//, '')).join(', ');
  lines.push(`| ${file} | ${kb(chunk.gzip)} | ${top} |`);
}
const text = `${lines.join('\n')}\n`;
const out = process.argv[2];
if (out === undefined) console.log(text);
else writeFileSync(out, text);
