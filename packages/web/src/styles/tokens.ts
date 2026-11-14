/**
 * Turns the config module and the default theme into CSS custom properties
 * (plan, Architecture invariant 8: all colours, sizes, fonts and timings are
 * custom properties). The build writes the result into the `base` and `theme`
 * cascade layers, so stylesheets only ever read variables and the numbers
 * live in one file.
 */

import { CONFIG } from '@stopwatch/core';
import { deriveTheme, themeCustomProperties } from '../theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../theme/presets.ts';

type CustomProperties = Readonly<Record<`--${string}`, string>>;

/** The family name of the self-hosted, trimmed Archivo (see assets/fonts/README.md). */
export const DEFAULT_FONT_FAMILY = 'Timer Sans';

const px = (value: number): string => `${String(value)}px`;
const em = (value: number): string => `${String(value)}em`;

export function designCustomProperties(): CustomProperties {
  const { reference, type, controls, icons } = CONFIG.design;
  return {
    '--font-family': `"${DEFAULT_FONT_FAMILY}", system-ui, sans-serif`,
    '--font-stretch': `${String(type.fontWidth)}%`,
    '--font-weight-time': String(type.timeWeight),
    '--font-weight-button': String(type.buttonWeight),

    // The timer scales with the window: one reference pixel is
    // min(window width ÷ 720, window height ÷ 450), times the time size setting.
    '--reference-width': String(reference.timer.width),
    '--reference-height': String(reference.timer.height),
    '--time-scale': '1',
    '--time-size': String(type.timePx),
    '--time-gap': String(controls.timeToButtonsPx),
    '--time-letter-spacing': em(type.timeLetterSpacingEm),
    '--colon-tighten': em(type.colonTightenEm),
    '--colon-raise': em(type.colonRaiseEm),

    '--button-height': px(controls.buttonHeightPx),
    '--button-padding-x': px(controls.buttonPaddingXPx),
    '--button-radius': px(controls.buttonRadiusPx),
    '--button-gap': px(controls.buttonGapPx),
    '--button-font-size': px(type.buttonPx),
    '--tap-target': px(controls.tapTargetPx),

    '--icon-stroke': String(icons.strokeWidth),
    '--icon-size': px(icons.cornerIconPx),
    '--icon-box': px(icons.cornerBoxPx),
    '--icon-inset': px(icons.cornerInsetPx),
    '--icon-gap': px(icons.cornerGapPx),
  };
}

function block(selector: string, properties: CustomProperties): string {
  const lines = Object.entries(properties).map(([name, value]) => `    ${name}: ${value};`);
  return `  ${selector} {\n${lines.join('\n')}\n  }`;
}

/** The generated stylesheet: design tokens in `base`, the default theme in `theme`. */
export function renderTokensCss(): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  return [
    '/* Generated from packages/core/src/config.ts and packages/web/src/theme at build time. */',
    `@layer base {\n${block(':root', designCustomProperties())}\n}`,
    `@layer theme {\n${block(':root', themeCustomProperties(theme))}\n}`,
    '',
  ].join('\n');
}
