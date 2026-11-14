/**
 * CI check: the size budget for the core tier. Run after `npm run build`.
 *
 *   npm run check:size
 */

import { fileURLToPath } from 'node:url';
import { CONFIG } from '@stopwatch/core';
import { coreFiles, verdict } from './size-budget.ts';
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
if (failed) process.exitCode = 1;
