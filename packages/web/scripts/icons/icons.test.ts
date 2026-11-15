import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PNG_ICONS, iconPixels, iconSvg } from './icon-art.ts';

const directory = join(import.meta.dirname, '..', '..', 'public', 'icons');

/** Width, height and RGB pixels of an unfiltered 8-bit RGB PNG, as encodePng writes. */
function decode(file: Buffer): { width: number; height: number; pixels: Buffer } {
  let offset = 8;
  let width = 0;
  let height = 0;
  const data: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('latin1', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
    }
    if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const rows = inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    expect(rows[y * (width * 3 + 1)]).toBe(0);
    rows.copy(pixels, y * width * 3, y * (width * 3 + 1) + 1, (y + 1) * (width * 3 + 1));
  }
  return { width, height, pixels };
}

describe('placeholder app icons', () => {
  it('match the script that draws them (npm run icons -w @stopwatch/web)', () => {
    expect(readFileSync(join(directory, 'icon.svg'), 'utf8')).toBe(iconSvg());
    for (const [name, size] of Object.entries(PNG_ICONS)) {
      const { width, height, pixels } = decode(readFileSync(join(directory, name)));
      expect([width, height], name).toEqual([size, size]);
      expect(pixels.equals(Buffer.from(iconPixels(size))), name).toBe(true);
    }
  });
});
