/**
 * Turns the config module and the default theme into CSS custom properties
 * and keyframes (plan, Architecture invariant 8: all colours, sizes, fonts and
 * timings are custom properties). The build writes the result into cascade
 * layers, so stylesheets only read variables and every number lives in one
 * file.
 *
 * - renderTokensCss: design tokens, motion keyframes and the default theme,
 *   loaded with the core tier.
 * - renderModeTokensCss: one display mode's own tokens and keyframes, loaded
 *   only with that mode.
 */

import { CONFIG } from '@stopwatch/core';
import { deriveTheme, themeCustomProperties } from '../theme/derive.ts';
import { DEFAULT_PRESET_ID, getPreset } from '../theme/presets.ts';

type CustomProperties = Readonly<Record<`--${string}`, string>>;

/** The family name of the self-hosted, trimmed Archivo (see assets/fonts/README.md). */
export const DEFAULT_FONT_FAMILY = 'Timer Sans';

/** smoothstep s(p) = 3p² − 2p³ is exactly this cubic Bézier, so CSS can draw the plan's curves without sampling. */
const SMOOTHSTEP = 'cubic-bezier(0.333333, 0, 0.666667, 1)';

const px = (value: number): string => `${String(value)}px`;
const em = (value: number): string => `${String(value)}em`;
const ms = (value: number): string => `${String(value)}ms`;
const percent = (fraction: number): string => `${String(Math.round(fraction * 10_000) / 100)}%`;

export function designCustomProperties(): CustomProperties {
  const { reference, type, controls, icons, paused } = CONFIG.design;
  const { motion } = CONFIG;
  return {
    '--font-family': `"${DEFAULT_FONT_FAMILY}", system-ui, sans-serif`,
    '--font-stretch': `${String(type.fontWidth)}%`,
    '--font-weight-time': String(type.timeWeight),
    '--font-weight-button': String(type.buttonWeight),
    '--font-weight-label': String(type.interfaceWeight.min),

    // The display scales with the window: one reference pixel is
    // min(window width ÷ 720, window height ÷ 450), times the time size setting.
    '--reference-width': String(reference.timer.width),
    '--reference-height': String(reference.timer.height),
    '--time-scale': '1',
    '--time-size': String(type.timePx),
    '--time-gap': String(controls.timeToButtonsPx),
    '--time-letter-spacing': em(type.timeLetterSpacingEm),
    '--colon-tighten': em(type.colonTightenEm),
    '--colon-raise': em(type.colonRaiseEm),
    // The active display mode overrides these two.
    '--mode-time-size': 'var(--time-size)',
    '--mode-gap': 'var(--time-gap)',

    '--paused-for-size': String(type.pausedForPx),
    '--paused-label-size': px(paused.labelPx),
    '--paused-label-gap': px(paused.labelGapPx),
    '--paused-label-tracking': em(paused.labelTrackingEm),

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

    '--motion-morph': ms(motion.startMorph),
    '--ease-standard': `cubic-bezier(${motion.standardEasing.join(', ')})`,
    '--ease-smoothstep': SMOOTHSTEP,
    '--held-blur': px(motion.heldBlurPx),
    '--held-opacity': String(motion.heldOpacity),
    '--blur-away-max': px(motion.blurAwayMaxPx),
    '--blur-ones-start': ms(motion.onesBlurWindow.start),
    '--blur-ones-window': ms(motion.onesBlurWindow.end - motion.onesBlurWindow.start),
    '--blur-tens-start': ms(motion.tensBlurWindow.start),
    '--blur-tens-window': ms(motion.tensBlurWindow.end - motion.tensBlurWindow.start),
  };
}

function block(selector: string, properties: CustomProperties): string {
  const lines = Object.entries(properties).map(([name, value]) => `    ${name}: ${value};`);
  return `  ${selector} {\n${lines.join('\n')}\n  }`;
}

/**
 * The seconds blur-away (plan, Design system > Motion). Within each window,
 * with progress p and smoothstep s: blur 14·s(p) px, opacity 1 − s((p − 0.3)/0.7),
 * width 1 − s((p − 0.55)/0.45). Width is never animated (only transform, opacity
 * and filter move): the shrinking width is drawn as a translation of the whole
 * time by half the width removed, which re-centres it identically.
 *
 * With reduced motion there is no blur: each digit cuts out with a short
 * crossfade as its window ends, and the time re-centres in one step.
 */
function blurAwayKeyframes(): string {
  const { blurAwayOpacityStart, blurAwayWidthStart, onesBlurWindow, tensBlurWindow, startMorph } = CONFIG.motion;
  const onesLength = onesBlurWindow.end - onesBlurWindow.start;
  const tensLength = tensBlurWindow.end - tensBlurWindow.start;
  const fadeFrom = percent(blurAwayOpacityStart);
  const shiftFrom = percent(blurAwayWidthStart);
  const shift = (name: string, variable: string): string =>
    `  @keyframes ${name} {\n    0% { transform: translateX(0); }\n    ${shiftFrom} { transform: translateX(0); animation-timing-function: ${SMOOTHSTEP}; }\n    100% { transform: translateX(var(${variable})); }\n  }`;
  const cut = (name: string, length: number): string =>
    `  @keyframes ${name} {\n    0% { opacity: 1; }\n    ${percent(1 - startMorph / length)} { opacity: 1; }\n    100% { opacity: 0; }\n  }`;
  const jump = (name: string, variable: string): string =>
    `  @keyframes ${name} {\n    0%, 99.99% { transform: translateX(0); }\n    100% { transform: translateX(var(${variable})); }\n  }`;
  return [
    `  @keyframes time-blur-away-blur {\n    0% { filter: blur(0); animation-timing-function: ${SMOOTHSTEP}; }\n    100% { filter: blur(var(--blur-away-max)); }\n  }`,
    `  @keyframes time-blur-away-fade {\n    0% { opacity: 1; }\n    ${fadeFrom} { opacity: 1; animation-timing-function: ${SMOOTHSTEP}; }\n    100% { opacity: 0; }\n  }`,
    shift('time-blur-away-shift-ones', '--time-ones-shift'),
    shift('time-blur-away-shift-tens', '--time-tens-shift'),
    cut('time-cut-ones', onesLength),
    cut('time-cut-tens', tensLength),
    jump('time-jump-ones', '--time-ones-shift'),
    jump('time-jump-tens', '--time-tens-shift'),
  ].join('\n');
}

/** The generated stylesheet: design tokens and keyframes in `base`, the default theme in `theme`. */
export function renderTokensCss(): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  return [
    '/* Generated from packages/core/src/config.ts and packages/web/src/theme at build time. */',
    `@layer base {\n${block(':root', designCustomProperties())}\n${blurAwayKeyframes()}\n}`,
    `@layer theme {\n${block(':root', themeCustomProperties(theme))}\n}`,
    '',
  ].join('\n');
}

export const MODE_TOKEN_IDS = ['ring', 'timeline'] as const;
export type ModeTokenId = (typeof MODE_TOKEN_IDS)[number];

export function isModeTokenId(value: string): value is ModeTokenId {
  return (MODE_TOKEN_IDS as readonly string[]).includes(value);
}

function ringTokens(): string {
  const ring = CONFIG.modes.ring;
  const properties: CustomProperties = {
    '--mode-time-size': String(CONFIG.design.type.ringTimePx),
    '--mode-gap': String(ring.gapPx),
    '--ring-box': String(ring.boxPx),
    '--ring-revolution': ms(ring.revolution),
  };
  return [
    block('[data-mode="ring"]', properties),
    '  @keyframes ring-turn {\n    from { transform: rotate(0deg); }\n    to { transform: rotate(360deg); }\n  }',
  ].join('\n');
}

function timelineTokens(): string {
  const timeline = CONFIG.modes.timeline;
  const pxPerMinute = 100 / timeline.minutesPer100Px;
  const start = timeline.widthPx / 2;
  const travel = (CONFIG.session.maxFocus / 60_000) * pxPerMinute;
  const properties: CustomProperties = {
    '--mode-time-size': String(CONFIG.design.type.timelineTimePx),
    '--mode-gap': String(timeline.gapPx),
    '--timeline-width': String(timeline.widthPx),
    '--timeline-height': String(timeline.heightPx),
    '--timeline-label-size': px(timeline.labelPx),
    '--timeline-duration': ms(CONFIG.session.maxFocus),
  };
  return [
    block('[data-mode="timeline"]', properties),
    `  @keyframes timeline-scroll {\n    from { transform: translateX(${px(start)}); }\n    to { transform: translateX(${px(start - travel)}); }\n  }`,
  ].join('\n');
}

/** One display mode's tokens and keyframes, in the `mode` layer. */
export function renderModeTokensCss(mode: ModeTokenId): string {
  const body = mode === 'ring' ? ringTokens() : timelineTokens();
  return `/* Generated from packages/core/src/config.ts at build time. */\n@layer mode {\n${body}\n}\n`;
}
