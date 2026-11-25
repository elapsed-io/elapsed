import { describe, expect, it } from 'vitest';
import { contrastRatio, mix, parseHex } from './color.ts';
import { ANALOG_CONFIG } from '@stopwatch/core';
import { deriveTheme, isLightBackground, themeCustomProperties } from './derive.ts';
import { getPreset, PRESETS } from './presets.ts';

describe('the dial red (round 2.8)', () => {
  it('is the plan\'s red where it meets 4.5:1 on the small dial (graphite, paper), and meets 4.5:1 in every preset', () => {
    expect(deriveTheme(getPreset('graphite')).red).toBe('#e5574b');
    expect(deriveTheme(getPreset('paper')).red).toBe('#b8332a');
    for (const preset of PRESETS) {
      const theme = deriveTheme(preset);
      const face = mix(theme.track, theme.background, ANALOG_CONFIG.subdialFill);
      expect(contrastRatio(theme.red, face), preset.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('deriveTheme', () => {
  // Computed by the design canvas's pal(): muted steps back from 45 % until it has 4.5:1 against the background and the panel.
  const CANVAS_MUTED = {
    graphite: '#8a8a87',
    paper: '#646465',
    'deep-sea': '#91a5b0',
    forest: '#99aa96',
    plum: '#a294ac',
    sky: '#485e6f',
    sand: '#665943',
    mint: '#496458',
  } as const;

  it('derives muted text in every preset exactly as the design canvas, with 4.5:1 on the background and the panel', () => {
    for (const [id, muted] of Object.entries(CANVAS_MUTED)) {
      expect(deriveTheme(getPreset(id as keyof typeof CANVAS_MUTED)).muted, id).toBe(muted);
    }
  });

  // Golden values from the design canvas's pal() function.
  it('derives graphite exactly as the design canvas', () => {
    expect(deriveTheme(getPreset('graphite'))).toEqual({
      background: '#0e0f11',
      foreground: '#eceae4',
      accent: '#35764e',
      scheme: 'dark',
      muted: '#8a8a87',
      faint: '#323233',
      track: '#222324',
      pause: '#3a3b3b',
      end: '#a8403d',
      recordMarker: '#8c7a52',
      red: '#e5574b',
    });
  });

  it('derives paper exactly as the design canvas', () => {
    expect(deriveTheme(getPreset('paper'))).toMatchObject({
      scheme: 'light',
      muted: '#646465',
      faint: '#d3d2d0',
      track: '#e2e1df',
      pause: '#cac9c8',
      end: '#e28a86',
      recordMarker: '#8a6d2e',
      red: '#b8332a',
    });
  });

  it('treats a background with luminance 0.4 or more as light', () => {
    expect(isLightBackground(parseHex('#aaaaaa'))).toBe(true); // luminance 0.402
    expect(isLightBackground(parseHex('#a9a9a9'))).toBe(false); // luminance 0.397
  });

  it('classifies the presets as the plan describes', () => {
    const light = PRESETS.filter((p) => isLightBackground(p.background)).map((p) => p.id);
    expect(light).toEqual(['paper', 'mint', 'sand', 'sky']);
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
      '--color-red',
      '--color-scheme',
    ]);
    expect(properties['--color-muted']).toBe('#8a8a87');
  });
});
