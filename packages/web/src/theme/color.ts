/**
 * Colour arithmetic for themes: parsing, mixing, relative luminance and
 * contrast ratio (WCAG 2.2 definitions). Pure functions with no DOM access, so
 * the build, the contrast check and the page all use the same code.
 */

/** A colour as "#rrggbb", lowercase. Only parseHex creates one. */
export type Hex = string & { readonly __hex: unique symbol };

export type Rgb = readonly [r: number, g: number, b: number];

const HEX_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/** Validates "#rrggbb" input from any source and normalises it to lowercase. */
export function parseHex(value: unknown): Hex {
  if (typeof value !== 'string' || !HEX_PATTERN.test(value)) {
    throw new TypeError(`expected a colour as #rrggbb, got ${JSON.stringify(value)}`);
  }
  return value.toLowerCase() as Hex;
}

export function toRgb(hex: Hex): Rgb {
  const match = HEX_PATTERN.exec(hex);
  if (match === null) throw new TypeError(`not a #rrggbb colour: ${hex}`);
  const [, r = '', g = '', b = ''] = match;
  return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16)];
}

function channelToHex(value: number): string {
  return Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0');
}

export function fromRgb([r, g, b]: Rgb): Hex {
  return parseHex(`#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`);
}

/**
 * Moves `from` toward `toward` by `fraction` in gamma-encoded sRGB, rounding
 * each channel, exactly as the design canvas does. mix(fg, bg, 0.45) is "the
 * foreground mixed 45 % toward the background".
 */
export function mix(from: Hex, toward: Hex, fraction: number): Hex {
  const a = toRgb(from);
  const b = toRgb(toward);
  return fromRgb([
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
    a[2] + (b[2] - a[2]) * fraction,
  ]);
}

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.2 relative luminance, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: Hex): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG 2.2 contrast ratio, from 1 to 21. */
export function contrastRatio(a: Hex, b: Hex): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
