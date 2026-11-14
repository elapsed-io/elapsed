/**
 * CI check: every preset theme passes the plan's contrast thresholds (text at
 * least 4.5:1, accent graphics at least 2.5:1). Exits non-zero on any failure.
 *
 *   npm run check:contrast
 */

import { checkThemeContrast } from '../src/theme/contrast.ts';
import { deriveTheme } from '../src/theme/derive.ts';
import { PRESETS } from '../src/theme/presets.ts';

let failures = 0;
const rows: string[] = [];

for (const preset of PRESETS) {
  for (const result of checkThemeContrast(deriveTheme(preset))) {
    if (!result.passes) failures += 1;
    rows.push(
      [
        preset.id.padEnd(10),
        result.pair.padEnd(22),
        `${result.foreground} on ${result.background}`.padEnd(22),
        result.ratio.toFixed(2).padStart(6),
        `≥ ${result.minimum.toFixed(1)}`,
        result.passes ? 'ok' : 'FAIL',
      ].join('  '),
    );
  }
}

console.log(rows.join('\n'));
if (failures > 0) {
  console.error(`\n${String(failures)} contrast check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${String(PRESETS.length)} presets pass.`);
}
