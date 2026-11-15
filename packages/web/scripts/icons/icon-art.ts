/**
 * The placeholder app icon (owner decision, 2026-11-15): the ring display's
 * track and head dot, in the graphite theme's faint colour and accent green
 * on its background, until an icon is designed.
 *
 * Geometry is in a 512-unit square. The ring's outer edge stays inside the
 * maskable icon's safe zone (a circle of 40% of the size), so one drawing
 * serves both ordinary and maskable icons.
 *
 * PNGs are drawn here without any image library: each pixel's coverage is
 * sampled on a 4 × 4 grid, and the result is written as an RGB PNG with
 * Node's zlib.
 */

import { crc32, deflateSync } from 'node:zlib';
import { deriveTheme } from '../../src/theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../../src/theme/presets.ts';

const UNITS = 512;
const CENTRE = UNITS / 2;
const RING_RADIUS = 150;
const TRACK_WIDTH = 36;
const HEAD_RADIUS = 26;
/** Corner radius of the SVG's rounded square (browser tabs show it as drawn; app icons are masked by the system). */
const SVG_CORNER = 96;
const SAMPLES = 4;

const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
export const ICON_COLOURS = { background: theme.background, track: theme.faint, head: theme.accent } as const;

export function iconSvg(): string {
  const { background, track, head } = ICON_COLOURS;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(UNITS)} ${String(UNITS)}">`,
    `<rect width="${String(UNITS)}" height="${String(UNITS)}" rx="${String(SVG_CORNER)}" fill="${background}"/>`,
    `<circle cx="${String(CENTRE)}" cy="${String(CENTRE)}" r="${String(RING_RADIUS)}" fill="none" stroke="${track}" stroke-width="${String(TRACK_WIDTH)}"/>`,
    `<circle cx="${String(CENTRE)}" cy="${String(CENTRE - RING_RADIUS)}" r="${String(HEAD_RADIUS)}" fill="${head}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const over = (base: Rgb, top: Rgb, alpha: number): Rgb => [
  base[0] + (top[0] - base[0]) * alpha,
  base[1] + (top[1] - base[1]) * alpha,
  base[2] + (top[2] - base[2]) * alpha,
];

/** RGB pixels, row by row, of the full-bleed icon at `size` × `size`. */
export function iconPixels(size: number): Uint8Array {
  const background = rgb(ICON_COLOURS.background);
  const track = rgb(ICON_COLOURS.track);
  const head = rgb(ICON_COLOURS.head);
  const scale = UNITS / size;
  const pixels = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let onTrack = 0;
      let onHead = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const ux = (x + (sx + 0.5) / SAMPLES) * scale;
          const uy = (y + (sy + 0.5) / SAMPLES) * scale;
          if (Math.abs(Math.hypot(ux - CENTRE, uy - CENTRE) - RING_RADIUS) <= TRACK_WIDTH / 2) onTrack += 1;
          if (Math.hypot(ux - CENTRE, uy - (CENTRE - RING_RADIUS)) <= HEAD_RADIUS) onHead += 1;
        }
      }
      const total = SAMPLES * SAMPLES;
      const colour = over(over(background, track, onTrack / total), head, onHead / total);
      pixels.set(colour.map((channel) => Math.round(channel)), (y * size + x) * 3);
    }
  }
  return pixels;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([header.subarray(4), data])), 0);
  return Buffer.concat([header, data, crc]);
}

export function encodePng(size: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const rows = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    // Each row starts with filter type 0 (none).
    rows.set(pixels.subarray(y * size * 3, (y + 1) * size * 3), y * (size * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** The files written to public/icons/, by name. */
export const PNG_ICONS = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'apple-touch-icon.png': 180,
} as const;
