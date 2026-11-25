/**
 * Applies the appearance settings as CSS custom properties (plan,
 * Architecture invariant 8): one constructed stylesheet in the `theme`
 * cascade layer, adopted by the document, holding the derived theme colours,
 * the chosen font, the time size and the animation speed (--motion-scale). It is never an inline style, so custom
 * CSS in the `user` layer (round 7) still overrides all of it, and nothing in
 * it is HTML.
 */

import { CONFIG } from '@stopwatch/core';
import type { Settings, ThemeColors } from '@stopwatch/core';
import { parseHex } from '../theme/color.ts';
import { deriveTheme, themeCustomProperties } from '../theme/derive.ts';
import { getPreset } from '../theme/presets.ts';
import type { ThemeTokens } from '../theme/presets.ts';

/** The theme's three colours: the user's, or the preset's. */
export function themeTokens(settings: Settings): ThemeTokens {
  const colors = settings.colors;
  if (colors !== null) return { background: parseHex(colors.background), foreground: parseHex(colors.foreground), accent: parseHex(colors.accent) };
  return getPreset(settings.theme);
}

/** A preset's colours as stored settings colours (lowercase #rrggbb). */
export function presetColors(settings: Settings): ThemeColors {
  const tokens = getPreset(settings.theme);
  const hex = (value: string): `#${string}` => value.toLowerCase() as `#${string}`;
  return { background: hex(tokens.background), foreground: hex(tokens.foreground), accent: hex(tokens.accent) };
}

export interface AppearanceInput {
  readonly settings: Settings;
  /** The font-family stack of the font in use (the chosen one once it has loaded). */
  readonly fontFamily: string;
  readonly fontStretch: string;
}

export function appearanceCss({ settings, fontFamily, fontStretch }: AppearanceInput): string {
  const properties: Record<string, string> = {
    ...themeCustomProperties(deriveTheme(themeTokens(settings))),
    '--font-family': fontFamily,
    '--font-stretch': fontStretch,
    '--time-scale': String(settings.timeSize / CONFIG.settings.timeSizePercent.default),
    '--motion-scale': String(CONFIG.motion.speeds[settings.animationSpeed]),
  };
  const lines = Object.entries(properties).map(([name, value]) => `    ${name}: ${value};`);
  return `@layer theme {\n  :root {\n${lines.join('\n')}\n  }\n}\n`;
}

export class AppearanceSheet {
  readonly #doc: Document;
  readonly #sheet: CSSStyleSheet;
  #text = '';

  constructor(doc: Document) {
    this.#doc = doc;
    const view = doc.defaultView;
    if (view === null) throw new Error('the document has no window');
    this.#sheet = new view.CSSStyleSheet();
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, this.#sheet];
  }

  apply(input: AppearanceInput): void {
    const text = appearanceCss(input);
    if (text === this.#text) return;
    this.#text = text;
    this.#sheet.replaceSync(text);
    this.#doc.documentElement.dataset['scheme'] = deriveTheme(themeTokens(input.settings)).scheme;
  }
}
