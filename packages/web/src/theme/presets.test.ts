import { describe, expect, it } from 'vitest';
import { checkThemeContrast } from './contrast.ts';
import { deriveTheme } from './derive.ts';
import { DEFAULT_PRESET_ID, getPreset, PRESETS } from './presets.ts';
import { parseHex } from './color.ts';

describe('presets', () => {
  it('ships the eight presets of plan version 14, lightest to darkest, graphite the default', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['paper', 'mint', 'sand', 'sky', 'forest', 'deep-sea', 'plum', 'graphite']);
    expect(DEFAULT_PRESET_ID).toBe('graphite');
  });

  it('keeps the exact colours of the plan table', () => {
    expect(getPreset('deep-sea')).toMatchObject({ background: '#0f2b3b', foreground: '#ddedf5', accent: '#237389' });
    expect(getPreset('mint')).toMatchObject({ background: '#d5f0e3', foreground: '#0e2a1e', accent: '#2f9d6c' });
  });

  it('has lowercase labels', () => {
    for (const preset of PRESETS) expect(preset.label).toBe(preset.label.toLowerCase());
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))('%s passes every contrast check', (_id, preset) => {
    const failures = checkThemeContrast(deriveTheme(preset)).filter((c) => !c.passes);
    expect(failures).toEqual([]);
  });

  it('flags a theme below the thresholds', () => {
    const weak = deriveTheme({
      background: parseHex('#808080'),
      foreground: parseHex('#909090'),
      accent: parseHex('#858585'),
    });
    const failed = checkThemeContrast(weak)
      .filter((c) => !c.passes)
      .map((c) => c.pair);
    expect(failed).toContain('text on background');
    expect(failed).toContain('accent on background');
  });
});
