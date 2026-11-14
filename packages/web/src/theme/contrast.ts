/**
 * Contrast rules every preset must pass (plan, Decisions > Themes): text at
 * least 4.5:1 and accent graphics at least 2.5:1. "Text" covers the time on
 * the background and each button's label on its own button colour.
 */

import { CONFIG } from '@stopwatch/core';
import { contrastRatio } from './color.ts';
import type { Hex } from './color.ts';
import type { DerivedTheme } from './derive.ts';

export interface ContrastCheck {
  readonly pair: string;
  readonly foreground: Hex;
  readonly background: Hex;
  readonly ratio: number;
  readonly minimum: number;
  readonly passes: boolean;
}

interface PairSpec {
  readonly pair: string;
  readonly foreground: Hex;
  readonly background: Hex;
  readonly minimum: number;
}

function check(spec: PairSpec): ContrastCheck {
  const ratio = contrastRatio(spec.foreground, spec.background);
  return { ...spec, ratio, passes: ratio >= spec.minimum };
}

export function checkThemeContrast(theme: DerivedTheme): readonly ContrastCheck[] {
  const { text, accentGraphic } = CONFIG.theme.minContrast;
  return [
    { pair: 'text on background', foreground: theme.foreground, background: theme.background, minimum: text },
    { pair: 'text on start button', foreground: theme.foreground, background: theme.accent, minimum: text },
    { pair: 'text on pause button', foreground: theme.foreground, background: theme.pause, minimum: text },
    { pair: 'text on end button', foreground: theme.foreground, background: theme.end, minimum: text },
    { pair: 'accent on background', foreground: theme.accent, background: theme.background, minimum: accentGraphic },
  ].map(check);
}
