import { describe, expect, it } from 'vitest';
import { contrastRatio, fromRgb, mix, parseHex, relativeLuminance, toRgb } from './color.ts';

describe('parseHex', () => {
  it('accepts #rrggbb and lowercases it', () => {
    expect(parseHex('#0E0F11')).toBe('#0e0f11');
  });

  it.each([
    '0E0F11',
    '#0E0F1',
    '#0E0F111',
    '#GGGGGG',
    'red',
    'url(x)',
    '#0E0F11;background:red',
    '',
    42,
    null,
    undefined,
    {},
  ])('rejects %j', (value) => {
    expect(() => parseHex(value)).toThrow(TypeError);
  });
});

describe('rgb conversion', () => {
  it('round-trips', () => {
    expect(toRgb(parseHex('#35764e'))).toEqual([0x35, 0x76, 0x4e]);
    expect(fromRgb([0x35, 0x76, 0x4e])).toBe('#35764e');
  });

  it('clamps and rounds channels', () => {
    expect(fromRgb([-4, 255.6, 127.5])).toBe('#00ff80');
  });
});

describe('mix', () => {
  const white = parseHex('#ffffff');
  const black = parseHex('#000000');

  it('returns the endpoints at 0 and 1', () => {
    expect(mix(white, black, 0)).toBe(white);
    expect(mix(white, black, 1)).toBe(black);
  });

  it('rounds each channel like the design canvas', () => {
    // Golden values computed with the canvas's own mix() for the graphite preset.
    const fg = parseHex('#ECEAE4');
    const bg = parseHex('#0E0F11');
    expect(mix(fg, bg, 0.45)).toBe('#888785');
    expect(mix(fg, bg, 0.84)).toBe('#323233');
    expect(mix(fg, bg, 0.91)).toBe('#222324');
    expect(mix(fg, bg, 0.8)).toBe('#3a3b3b');
  });
});

describe('luminance and contrast', () => {
  it('matches the WCAG reference points', () => {
    expect(relativeLuminance(parseHex('#000000'))).toBe(0);
    expect(relativeLuminance(parseHex('#ffffff'))).toBeCloseTo(1, 10);
    expect(contrastRatio(parseHex('#000000'), parseHex('#ffffff'))).toBeCloseTo(21, 10);
    expect(contrastRatio(parseHex('#777777'), parseHex('#ffffff'))).toBeCloseTo(4.48, 2);
  });

  it('is symmetric', () => {
    const a = parseHex('#35764e');
    const b = parseHex('#0e0f11');
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });
});
