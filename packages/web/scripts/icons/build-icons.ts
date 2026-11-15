/**
 * Writes the placeholder app icons into public/icons/ (see icon-art.ts).
 * Run with `npm run icons -w @stopwatch/web`; the output is committed, and a
 * test checks it still matches this script.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG_ICONS, encodePng, iconPixels, iconSvg } from './icon-art.ts';

const directory = join(import.meta.dirname, '..', '..', 'public', 'icons');
writeFileSync(join(directory, 'icon.svg'), iconSvg());
for (const [name, size] of Object.entries(PNG_ICONS)) {
  writeFileSync(join(directory, name), encodePng(size, iconPixels(size)));
}
console.log(`icons written to ${directory}`);
