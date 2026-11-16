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
  const { reference, type, controls, icons, paused, checkIn, notice, ending, results } = CONFIG.design;
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
    '--paused-missed-size': px(paused.missedPx),
    '--paused-missed-gap': px(paused.missedGapPx),
    '--check-in-size': px(checkIn.textPx),

    '--notice-gap': px(notice.gapPx),
    '--notice-icon-size': px(notice.iconPx),
    '--notice-icon-stroke': String(notice.iconStrokeWidth),
    '--notice-heading-size': px(notice.headingPx),
    '--notice-time-size': String(notice.timePx),
    '--notice-body-size': px(notice.bodyPx),
    '--notice-body-line-height': String(notice.bodyLineHeight),
    '--notice-body-width': px(notice.bodyMaxWidthPx),

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

    '--ending-text-size': px(ending.textPx),
    '--ending-text-tracking': em(ending.textTrackingEm),
    '--ending-gap': px(ending.gapPx),
    '--ending-bar-width': px(controls.endingBar.width),
    '--ending-bar-height': px(controls.endingBar.height),
    '--ending-bar-radius': px(ending.barRadiusPx),
    '--ending-spacer': px(ending.spacerPx),
    '--ending-countdown': ms(CONFIG.session.endingCountdown),

    '--results-padding-y': px(results.paddingYPx),
    '--results-padding-x': px(results.paddingXPx),
    '--results-gap': px(results.gapPx),
    '--results-ring-gap': px(results.ringGapPx),
    '--results-label-size': px(results.labelPx),
    '--results-label-tracking': em(results.labelTrackingEm),
    '--results-label-gap': px(results.labelGapPx),
    '--results-headline-size': String(type.resultsHeadlinePx),
    '--strip-width': px(results.strip.widthPx),
    '--strip-bar-height': px(results.strip.barHeightPx),
    '--strip-bar-radius': px(results.strip.barRadiusPx),
    '--strip-bar-inset': px(results.strip.barInsetPx),
    '--strip-track-height': px(results.strip.trackHeightPx),
    '--strip-track-top': px(results.strip.trackTopPx),
    '--strip-label-row': px(results.strip.labelRowPx),
    '--strip-gap': px(results.strip.gapPx),
    '--stats-columns': String(results.stats.columns),
    '--stats-gap': px(results.stats.gapPx),
    '--stats-label-size': px(results.stats.labelPx),
    '--stats-value-size': px(results.stats.valuePx),
    '--stats-inner-gap': px(results.stats.innerGapPx),
    '--stats-ring-columns': String(results.stats.ringColumns),
    '--stats-ring-width': px(results.stats.ringWidthPx),
    '--results-icon-size': px(icons.resultsIconPx),
    '--results-icon-box': px(icons.resultsBoxPx),
    '--results-actions-gap': px(results.actions.gapPx),
    '--results-actions-block-gap': px(results.actions.blockGapPx),
    '--results-ring-size': px(results.ring.sizePx),
    '--results-ring-row-gap': px(results.ring.rowGapPx),
    '--results-ring-column-gap': px(results.ring.columnGapPx),
    '--legend-gap': px(results.ring.legend.gapPx),
    '--legend-item-gap': px(results.ring.legend.itemGapPx),
    '--legend-focus-size': px(results.ring.legend.focusPx),
    '--legend-pause-size': px(results.ring.legend.pausePx),
    '--legend-radius': px(results.ring.legend.radiusPx),

    '--tabulating-hold': ms(motion.tabulatingHold),
    '--tabulating-fade': ms(motion.tabulatingFadeOut),
    '--results-fade-delay': ms(motion.resultsFadeInDelay),
    '--results-fade': ms(motion.resultsFadeIn),
    '--results-rise': px(motion.resultsRisePx),
    '--copied-confirmation': ms(motion.copiedConfirmation),
    '--font-block': ms(CONFIG.settings.fontBlockMax),

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

/** The plan's replay easing, the cubic ease-in-out, as a CSS linear() function sampled evenly. */
export function replayEasing(samples: number = CONFIG.motion.replayEasingSamples): string {
  const cubic = (q: number): number => (q < 0.5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2);
  const points = Array.from({ length: samples + 1 }, (_, i) => String(Math.round(cubic(i / samples) * 10_000) / 10_000));
  return `linear(${points.join(', ')})`;
}

/** Below the results frame's width, a side margin and three stat columns (owner decision, 2026-11-15). */
function narrowBlock(): string {
  const { results } = CONFIG.design;
  return `  @media (max-width: ${String(results.narrowBelowPx - 0.02)}px) {\n${block(':root', {
    '--results-padding-x': px(results.narrowPaddingXPx),
    '--stats-columns': String(results.stats.narrowColumns),
  }).replace(/^/gm, '  ')}\n  }`;
}

/** The generated stylesheet: design tokens and keyframes in `base`, the default theme in `theme`. */
export function renderTokensCss(): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  return [
    '/* Generated from packages/core/src/config.ts and packages/web/src/theme at build time. */',
    `@layer base {\n${block(':root', { ...designCustomProperties(), '--ease-replay': replayEasing() })}\n${narrowBlock()}\n${blurAwayKeyframes()}\n}`,
    `@layer theme {\n${block(':root', themeCustomProperties(theme))}\n}`,
    '',
  ].join('\n');
}

/** The settings panel's sizes (the five Release 1 settings frames), loaded with the panel. */
export function settingsCustomProperties(): CustomProperties {
  const p = CONFIG.design.settings;
  return {
    // The panel is always drawn in the default font, whatever font the timer uses, so it stays readable.
    '--settings-font-family': `"${DEFAULT_FONT_FAMILY}", system-ui, sans-serif`,
    '--settings-font-stretch': `${String(CONFIG.design.type.fontWidth)}%`,
    '--settings-width': px(CONFIG.design.screens.settingsPanelWidthPx),
    '--settings-padding-y': px(p.paddingYPx),
    '--settings-padding-x': px(p.paddingXPx),
    '--settings-gap': px(p.gapPx),
    '--settings-title-size': px(p.titlePx),
    '--settings-header-gap': px(p.headerGapPx),
    '--settings-saved-size': px(p.savedPx),
    '--settings-saved-icon': px(p.savedIconPx),
    '--settings-saved-stroke': String(p.savedIconStroke),
    '--settings-saved-gap': px(p.savedGapPx),
    '--settings-saved-shown': ms(CONFIG.settings.savedShown),
    '--settings-close-box': px(p.closeBoxPx),
    '--settings-close-icon': px(p.closeIconPx),
    '--settings-search-height': px(p.search.heightPx),
    '--settings-search-padding-x': px(p.search.paddingXPx),
    '--settings-search-radius': px(p.search.radiusPx),
    '--settings-search-size': px(p.search.textPx),
    '--settings-search-icon': px(p.search.iconPx),
    '--settings-search-gap': px(p.search.gapPx),
    '--settings-row-height': px(p.row.heightPx),
    '--settings-row-size': px(p.row.textPx),
    '--settings-row-padding-x': px(p.row.paddingXPx),
    '--settings-chevron': px(p.row.chevronPx),
    '--settings-body-gap': px(p.body.gapPx),
    '--settings-body-padding-top': px(p.body.paddingTopPx),
    '--settings-body-padding-x': px(p.body.paddingXPx),
    '--settings-body-padding-bottom': px(p.body.paddingBottomPx),
    '--settings-label-size': px(p.labelPx),
    '--settings-help-size': px(p.helpPx),
    '--settings-item-gap': px(p.itemGapPx),
    '--settings-group-gap': px(p.groupGapPx),
    '--settings-control-gap': px(p.controlGapPx),
    '--segmented-radius': px(p.segmented.radiusPx),
    '--segmented-padding': px(p.segmented.paddingPx),
    '--segmented-height': px(p.segmented.heightPx),
    '--segmented-padding-x': px(p.segmented.paddingXPx),
    '--segmented-button-radius': px(p.segmented.buttonRadiusPx),
    '--segmented-size': px(p.segmented.textPx),
    '--slider-width': px(p.slider.widthPx),
    '--slider-height': px(p.slider.heightPx),
    '--slider-radius': px(p.slider.radiusPx),
    '--slider-thumb': px(p.slider.thumbPx),
    '--slider-end-size': px(p.slider.endPx),
    '--slider-value-size': px(p.slider.valuePx),
    '--slider-value-width': px(p.slider.valueWidthPx),
    '--slider-gap': px(p.slider.gapPx),
    '--toggle-width': px(p.toggle.widthPx),
    '--toggle-height': px(p.toggle.heightPx),
    '--toggle-knob': px(p.toggle.knobPx),
    '--toggle-inset': px(p.toggle.insetPx),
    '--toggle-travel': px(p.toggle.widthPx - p.toggle.knobPx - 2 * p.toggle.insetPx),
    '--shortcuts-size': px(p.shortcuts.textPx),
    '--shortcuts-gap': px(p.shortcuts.gapPx),
    '--tiles-columns': String(p.tiles.columns),
    '--tiles-gap': px(p.tiles.gapPx),
    '--tile-padding-top': px(p.tiles.paddingTopPx),
    '--tile-padding-bottom': px(p.tiles.paddingBottomPx),
    '--tile-radius': px(p.tiles.radiusPx),
    '--tile-gap': px(p.tiles.innerGapPx),
    '--tile-size': px(p.tiles.textPx),
    '--tile-preview-width': px(p.tiles.previewWidthPx),
    '--tile-preview-height': px(p.tiles.previewHeightPx),
    '--tile-digits-size': px(p.tiles.previewDigitsPx),
    '--themes-columns': String(p.themes.columns),
    '--themes-gap': px(p.themes.gapPx),
    '--theme-card-height': px(p.themes.swatchHeightPx),
    '--theme-card-radius': px(p.themes.radiusPx),
    '--theme-card-sample': px(p.themes.samplePx),
    '--theme-card-bar-width': px(p.themes.barWidthPx),
    '--theme-card-bar-height': px(p.themes.barHeightPx),
    '--theme-card-bar-radius': px(p.themes.barRadiusPx),
    '--theme-card-name': px(p.themes.namePx),
    '--theme-card-gap': px(p.themes.innerGapPx),
    '--theme-card-outline': px(p.themes.outlinePx),
    '--theme-card-outline-offset': px(p.themes.outlineOffsetPx),
    '--colors-label-width': px(p.colors.labelWidthPx),
    '--colors-swatch': px(p.colors.swatchPx),
    '--colors-swatch-radius': px(p.colors.swatchRadiusPx),
    '--colors-size': px(p.colors.textPx),
    '--colors-gap': px(p.colors.gapPx),
    '--fonts-columns': String(p.fonts.columns),
    '--fonts-gap': px(p.fonts.gapPx),
    '--font-tile-height': px(p.fonts.heightPx),
    '--font-tile-radius': px(p.fonts.radiusPx),
    '--font-tile-padding-x': px(p.fonts.paddingXPx),
    '--font-tile-size': px(p.fonts.textPx),
    '--settings-selected-border': px(p.selectedBorderPx),
    '--settings-focus-ring': px(p.focusRingPx),
    '--settings-focus-offset': px(p.focusOffsetPx),
    '--settings-reset-size': px(p.resetPx),
    '--clear-height': px(p.clearButton.heightPx),
    '--clear-padding-x': px(p.clearButton.paddingXPx),
    '--clear-radius': px(p.clearButton.radiusPx),
    '--clear-size': px(p.clearButton.textPx),
    '--settings-footer-gap': px(p.footer.gapPx),
    '--settings-footer-padding-top': px(p.footer.paddingTopPx),
    '--settings-footer-size': px(p.footer.textPx),
    '--settings-footer-link-gap': px(p.footer.linkGapPx),
  };
}

/** The panel's tokens, in the `base` layer, loaded with the panel's chunk. */
export function renderSettingsTokensCss(): string {
  return `/* Generated from packages/core/src/config.ts at build time. */\n@layer base {\n${block(':root', settingsCustomProperties())}\n}\n`;
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
