/**
 * The light models of the ambient modes (plan, Design system > Display modes): a colour that fades with
 * depth (ocean) or height (sky) as linear RGB times e^(−K·x), turned into sRGB for the screen. Shared by
 * ocean depth and height, and by their tests.
 */

export type LinearRgb = readonly [number, number, number];

/** A linear-light channel (0–1) as an 8-bit sRGB value, rounded, as the frames compute it. */
export function srgbChannel(linear: number): number {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, encoded)) * 255);
}

/** `base` × e^(−K·x) per channel, in sRGB. */
export function attenuated(base: LinearRgb, k: LinearRgb, x: number): readonly [number, number, number] {
  return [srgbChannel(base[0] * Math.exp(-k[0] * x)), srgbChannel(base[1] * Math.exp(-k[1] * x)), srgbChannel(base[2] * Math.exp(-k[2] * x))];
}

export function hex(rgb: readonly [number, number, number]): `#${string}` {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance of an sRGB colour (0–255 channels). */
export function luminance(rgb: readonly [number, number, number]): number {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

export function contrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

export function parseHexColour(value: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (match === null) throw new RangeError(`not a colour: ${value}`);
  return [Number.parseInt(match[1] ?? '0', 16), Number.parseInt(match[2] ?? '0', 16), Number.parseInt(match[3] ?? '0', 16)];
}
