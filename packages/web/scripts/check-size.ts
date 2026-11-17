/**
 * CI check: the plan's size budgets (the core tier, each display mode), warning above one and failing above twice
 * it; and, from round 2.10, every download's own ceiling (download-budgets.ts), failing the moment one is passed,
 * when a download has no ceiling, or when a script chunk belongs to no measured download. Run after `npm run build`.
 *
 *   npm run check:size
 */

import { fileURLToPath } from 'node:url';
import { CONFIG } from '@stopwatch/core';
import { MODE_MANIFESTS } from '../src/modes/manifests.ts';
import { CEILING_IDS, CORE_CEILING, ceilingOf } from './download-budgets.ts';
import { measureDownloads, unmeasuredChunks } from './downloads.ts';
import { coreModeSources, modeDownload } from './mode-downloads.ts';
import { coreFiles, packageSize, verdict } from './size-budget.ts';
import type { Verdict } from './size-budget.ts';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const { core, failFactor } = CONFIG.budgets;
const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

const files = coreFiles(distDir);
for (const file of files) console.log(`${kb(file.bytes).padStart(9)}  ${file.path}`);

const javascript = files.filter((f) => f.isJavaScript).reduce((sum, f) => sum + f.bytes, 0);
const total = files.reduce((sum, f) => sum + f.bytes, 0);

const checks: [string, number, number][] = [
  ['core JavaScript', javascript, core.javascriptBytes],
  ['core total', total, core.totalBytes],
];

// Each display mode downloaded on demand has its own budget, declared in its manifest.
for (const manifest of MODE_MANIFESTS.filter((mode) => mode.tier === 'on-choice')) {
  const size = packageSize(distDir, modeDownload(manifest.id), coreModeSources());
  checks.push([`${manifest.id} mode code`, size.codeBytes, manifest.budget.codeBytes]);
  checks.push([`${manifest.id} mode art`, size.artBytes, manifest.budget.artBytes]);
}

const inCi = process.env['GITHUB_ACTIONS'] === 'true';
let failed = false;
console.log('');
for (const [label, bytes, budget] of checks) {
  const result: Verdict = verdict(bytes, budget, failFactor);
  const line = `${label}: ${kb(bytes)} of ${kb(budget)} (fails above ${kb(budget * failFactor)})`;
  if (result === 'ok') console.log(`ok    ${line}`);
  if (result === 'warn') {
    console.warn(`WARN  ${line}`);
    if (inCi) console.log(`::warning title=Size budget::${line}`);
  }
  if (result === 'fail') {
    console.error(`FAIL  ${line}`);
    if (inCi) console.log(`::error title=Size budget::${line}`);
    failed = true;
  }
}

// Every download against its own ceiling: passing one fails at once.
const over = (line: string): void => {
  console.error(`FAIL  ${line}`);
  if (inCi) console.log(`::error title=Download budget::${line}`);
  failed = true;
};
console.log('');
const ceilingLine = (label: string, bytes: number, ceiling: number): void => {
  const line = `${label}: ${kb(bytes)} of its ${kb(ceiling)} ceiling`;
  if (bytes > ceiling) over(`${line} (raise it only as a recorded decision: scripts/download-budgets.ts)`);
  else console.log(`ok    ${line}`);
};
ceilingLine('core JavaScript', javascript, CORE_CEILING.javascriptBytes);
ceilingLine('core total', total, CORE_CEILING.totalBytes);
const downloads = measureDownloads(distDir);
for (const download of downloads) {
  const ceiling = ceilingOf(download.id);
  if (ceiling === undefined) {
    over(`${download.id}: ${kb(download.codeBytes + download.artBytes)} and no ceiling (add one: scripts/download-budgets.ts)`);
    continue;
  }
  ceilingLine(`${download.id} code`, download.codeBytes, ceiling.code);
  if (download.artBytes > 0 || ceiling.art > 0) ceilingLine(`${download.id} art`, download.artBytes, ceiling.art);
}
for (const id of CEILING_IDS.filter((candidate) => !downloads.some((download) => download.id === candidate))) over(`${id}: a ceiling for a download the build no longer has (remove it)`);
for (const file of unmeasuredChunks(distDir, downloads)) over(`${file}: a script no measured download fetches (budget it: scripts/downloads.ts)`);

if (failed) process.exitCode = 1;
