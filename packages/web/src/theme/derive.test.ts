import { describe, expect, it } from 'vitest';
import { parseHex } from './color.ts';
import { deriveTheme, isLightBackground, themeCustomProperties } from './derive.ts';
import { getPreset, PRESETS } from './presets.ts';

describe('deriveTheme', () => {
  // Golden values from the design canvas's pal() function.
  it('derives graphite exactly as the design canvas', () => {
    expect(deriveTheme(getPreset('graphite'))).toEqual({
      background: '#0e0f11',
      foreground: '#eceae4',
      accent: '#35764e',
      scheme: 'dark',
      muted: '#888785',
      faint: '#323233',
      track: '#222324',
      pause: '#3a3b3b',
      end: '#a8403d',
      recordMarker: '#8c7a52',
    });
  });

  it('derives paper exactly as the design canvas', () => {
    expect(deriveTheme(getPreset('paper'))).toMatchObject({
      scheme: 'light',
      muted: '#7d7d7d',
      faint: '#d3d2d0',
      track: '#e2e1df',
      pause: '#cac9c8',
      end: '#e28a86',
      recordMarker: '#8a6d2e',
    });
  });

  it('derives lilac exactly as the design canvas', () => {
    expect(deriveTheme(getPreset('lilac'))).toMatchObject({
      scheme: 'light',
      muted: '#79708d',
      faint: '#c3bbd7',
      track: '#d1c9e4',
      pause: '#bcb4cf',
    });
  });

  it('treats a background with luminance 0.4 or more as light', () => {
    expect(isLightBackground(parseHex('#aaaaaa'))).toBe(true); // luminance 0.402
    expect(isLightBackground(parseHex('#a9a9a9'))).toBe(false); // luminance 0.397
  });

  it('classifies the presets as the plan describes', () => {
    const light = PRESETS.filter((p) => isLightBackground(p.background)).map((p) => p.id);
    expect(light).toEqual(['paper', 'lilac', 'sky', 'sand', 'mint']);
  });
});

describe('themeCustomProperties', () => {
  it('exposes every derived colour as a custom property', () => {
    const properties = themeCustomProperties(deriveTheme(getPreset('graphite')));
    expect(Object.keys(properties)).toEqual([
      '--color-background',
      '--color-foreground',
      '--color-accent',
      '--color-muted',
      '--color-faint',
      '--color-track',
      '--color-pause',
      '--color-end',
      '--color-record',
      '--color-scheme',
    ]);
    expect(properties['--color-muted']).toBe('#888785');
  });
});
