/**
 * The ten preset themes (plan, Design system > Color). Each theme is three
 * colours; everything else is derived in derive.ts.
 */

import { BRAND } from '@stopwatch/core';
import { parseHex } from './color.ts';
import type { Hex } from './color.ts';

export interface ThemeTokens {
  /** The page background. */
  readonly background: Hex;
  /** The time and button text. */
  readonly foreground: Hex;
  /** Focus in results, the ring, clock hands and the start button. */
  readonly accent: Hex;
}

export type PresetId =
  | 'graphite'
  | 'paper'
  | 'deep-sea'
  | 'forest'
  | 'oxblood'
  | 'plum'
  | 'lilac'
  | 'sky'
  | 'sand'
  | 'mint';

export interface Preset extends ThemeTokens {
  readonly id: PresetId;
  /** The name shown in settings (lowercase interface text). */
  readonly label: string;
}

function preset(id: PresetId, background: string, foreground: string, accent: string): Preset {
  return {
    id,
    label: BRAND.copy.themes[id],
    background: parseHex(background),
    foreground: parseHex(foreground),
    accent: parseHex(accent),
  };
}

export const PRESETS: readonly Preset[] = [
  preset('graphite', '#0E0F11', '#ECEAE4', '#35764E'),
  preset('paper', '#F6F5F2', '#1A1B1E', '#4A9E6C'),
  preset('deep-sea', '#0F2B3B', '#DDEDF5', '#237389'),
  preset('forest', '#14301F', '#E6F0DA', '#816819'),
  preset('oxblood', '#3A1418', '#F5E4DF', '#B0472B'),
  preset('plum', '#2A1838', '#EFE3F6', '#963ACB'),
  preset('lilac', '#E2DAF5', '#231A38', '#8F75DC'),
  preset('sky', '#D3E7F5', '#0F2638', '#4190D1'),
  preset('sand', '#F3E3C3', '#2A1E0C', '#B9783C'),
  preset('mint', '#D5F0E3', '#0E2A1E', '#2F9D6C'),
];

export const DEFAULT_PRESET_ID: PresetId = 'graphite';

export function getPreset(id: PresetId): Preset {
  const found = PRESETS.find((p) => p.id === id);
  if (found === undefined) throw new RangeError(`unknown theme preset: ${id}`);
  return found;
}
