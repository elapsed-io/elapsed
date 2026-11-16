/**
 * The one place where theme colours are derived (plan, Architecture invariant
 * 8). A theme is three tokens; every other colour comes from them here.
 */

import { CONFIG } from '@stopwatch/core';
import { contrastRatio, mix, parseHex, relativeLuminance } from './color.ts';
import type { Hex } from './color.ts';
import type { ThemeTokens } from './presets.ts';

/** Fixed colours that depend only on whether the theme is dark or light. */
export const FIXED_COLOURS = {
  end: { dark: parseHex('#A8403D'), light: parseHex('#E28A86') },
  recordMarker: { dark: parseHex('#8C7A52'), light: parseHex('#8A6D2E') },
} as const;

export interface DerivedTheme extends ThemeTokens {
  readonly scheme: 'dark' | 'light';
  /** Labels and icons. */
  readonly muted: Hex;
  /** Dividers and the ring track. */
  readonly faint: Hex;
  /** Cards and empty bars. */
  readonly track: Hex;
  /** The pause and cancel buttons. */
  readonly pause: Hex;
  /** The end button. */
  readonly end: Hex;
  /** The personal record marker. */
  readonly recordMarker: Hex;
}

export function isLightBackground(background: Hex): boolean {
  return relativeLuminance(background) >= CONFIG.theme.lightBackgroundLuminance;
}

/**
 * Muted text and icons: the foreground mixed toward the background by at most
 * `mix.muted`, stepping back toward the foreground until it has text contrast
 * (4.5:1) against both the background and the panel it also sits on. The
 * design canvas computes it with the same steps, so frames and site agree.
 */
export function mutedColour(foreground: Hex, background: Hex, panel: Hex): Hex {
  const minimum = CONFIG.theme.minContrast.text;
  let fraction: number = CONFIG.theme.mix.muted;
  let colour = mix(foreground, background, fraction);
  while (fraction > 0 && (contrastRatio(colour, background) < minimum || contrastRatio(colour, panel) < minimum)) {
    fraction -= CONFIG.theme.mutedStep;
    colour = mix(foreground, background, fraction);
  }
  return colour;
}

export function deriveTheme(tokens: ThemeTokens): DerivedTheme {
  const { background, foreground, accent } = tokens;
  const scheme = isLightBackground(background) ? 'light' : 'dark';
  const toward = (fraction: number): Hex => mix(foreground, background, fraction);
  const track = toward(CONFIG.theme.mix.track);
  return {
    background,
    foreground,
    accent,
    scheme,
    muted: mutedColour(foreground, background, track),
    faint: toward(CONFIG.theme.mix.faint),
    track,
    pause: toward(CONFIG.theme.mix.pause),
    end: FIXED_COLOURS.end[scheme],
    recordMarker: FIXED_COLOURS.recordMarker[scheme],
  };
}

/**
 * The CSS custom properties a derived theme sets. These names are part of the
 * published styling surface for custom CSS, so they change only with a
 * migration note.
 */
export function themeCustomProperties(theme: DerivedTheme): Readonly<Record<`--${string}`, string>> {
  return {
    '--color-background': theme.background,
    '--color-foreground': theme.foreground,
    '--color-accent': theme.accent,
    '--color-muted': theme.muted,
    '--color-faint': theme.faint,
    '--color-track': theme.track,
    '--color-pause': theme.pause,
    '--color-end': theme.end,
    '--color-record': theme.recordMarker,
    '--color-scheme': theme.scheme,
  };
}
