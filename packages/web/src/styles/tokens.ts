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
/** A share as a percentage, without floating-point noise (0.55 is 55%, not 55.00000000000001%). */
const share = (fraction: number): string => `${String(Math.round(fraction * 10_000) / 100)}%`;
/** A duration of interface motion, scaled by --motion-scale. */
const scaled = (value: number): string => `calc(${ms(value)} * var(--motion-scale))`;
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
    '--focus-ring': px(controls.focusRingPx),
    '--focus-offset': px(controls.focusOffsetPx),

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

    // Interface motion: each duration scaled by one multiplier (Release 2's animation speed setting).
    '--motion-scale': String(motion.durationScale),
    '--tabulating-hold': scaled(motion.tabulatingHold),
    '--tabulating-fade': scaled(motion.tabulatingFadeOut),
    '--results-fade-delay': scaled(motion.resultsFadeInDelay),
    '--results-fade': scaled(motion.resultsFadeIn),
    '--results-rise': px(motion.resultsRisePx),
    '--replay-delay': scaled(motion.replayDelay),
    '--copied-confirmation': ms(motion.copiedConfirmation),
    '--font-block': ms(CONFIG.settings.fontBlockMax),

    '--motion-morph': scaled(motion.startMorph),
    '--motion-fade': scaled(motion.fade),
    '--motion-control': scaled(motion.control),
    '--ease-standard': `cubic-bezier(${motion.standardEasing.join(', ')})`,
    // The start morph's slight spring; where CSS has no linear() easing, the standard ease-out (springBlock).
    '--ease-spring': 'var(--ease-standard)',
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
  const { blurAwayOpacityStart, blurAwayWidthStart, onesBlurWindow, tensBlurWindow, blurAwayFade } = CONFIG.motion;
  const onesLength = onesBlurWindow.end - onesBlurWindow.start;
  const tensLength = tensBlurWindow.end - tensBlurWindow.start;
  const fadeFrom = percent(blurAwayOpacityStart);
  const shiftFrom = percent(blurAwayWidthStart);
  const shift = (name: string, variable: string): string =>
    `  @keyframes ${name} {\n    0% { transform: translateX(0); }\n    ${shiftFrom} { transform: translateX(0); animation-timing-function: ${SMOOTHSTEP}; }\n    100% { transform: translateX(var(${variable})); }\n  }`;
  const cut = (name: string, length: number): string =>
    `  @keyframes ${name} {\n    0% { opacity: 1; }\n    ${percent(1 - blurAwayFade / length)} { opacity: 1; }\n    100% { opacity: 0; }\n  }`;
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

/** Below the results frame's width, a side margin and three stat columns (owner decision, 2026-11-15). */
function narrowBlock(): string {
  const { results } = CONFIG.design;
  return `  @media (max-width: ${String(results.narrowBelowPx - 0.02)}px) {\n${block(':root', {
    '--results-padding-x': px(results.narrowPaddingXPx),
    '--stats-columns': String(results.stats.narrowColumns),
  }).replace(/^/gm, '  ')}\n  }`;
}

/** Durations scaled by --motion-scale, registered as times so script reads them resolved ("0.2s"). */
export const SCALED_DURATIONS = ['--motion-morph', '--motion-fade', '--motion-control', '--tabulating-hold', '--tabulating-fade', '--results-fade-delay', '--results-fade', '--replay-delay'] as const;

function registeredProperties(): string {
  const time = SCALED_DURATIONS.map((name) => `@property ${name} {\n  syntax: "<time>";\n  inherits: true;\n  initial-value: 0s;\n}`);
  return [`@property --motion-scale {\n  syntax: "<number>";\n  inherits: true;\n  initial-value: 1;\n}`, ...time].join('\n');
}

/** The generated stylesheet: design tokens and keyframes in `base`, the default theme in `theme`. */
/**
 * The start morph's slight spring as CSS linear() points: a damped spring (CONFIG.motion.spring) that
 * overshoots a little and settles by the end, which then lands exactly on 1.
 */
export function springEasing(): string {
  const { dampingRatio: zeta, settle, points } = CONFIG.motion.spring;
  const omega = settle / zeta;
  const root = Math.sqrt(1 - zeta * zeta);
  const values = Array.from({ length: points + 1 }, (_, i) => {
    if (i === points) return 1;
    const t = i / points;
    const x = 1 - Math.exp(-settle * t) * (Math.cos(omega * root * t) + (zeta / root) * Math.sin(omega * root * t));
    return Math.round(x * 10_000) / 10_000;
  });
  return `linear(${values.map(String).join(', ')})`;
}

/** The spring where the browser has CSS linear() easing (and so Web Animations accept it too). */
function springBlock(): string {
  return `  @supports (transition-timing-function: linear(0, 1)) {\n${block(':root', { '--ease-spring': springEasing() }).replace(/^/gm, '  ')}\n  }`;
}

export function renderTokensCss(): string {
  const theme = deriveTheme(getPreset(DEFAULT_PRESET_ID));
  return [
    '/* Generated from packages/core/src/config.ts and packages/web/src/theme at build time. */',
    registeredProperties(),
    `@layer base {\n${block(':root', designCustomProperties())}\n${narrowBlock()}\n${springBlock()}\n${blurAwayKeyframes()}\n}`,
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
    '--mode-options-padding': px(p.modeOptions.paddingPx),
    '--mode-options-gap': px(p.modeOptions.gapPx),
    '--mode-options-radius': px(p.modeOptions.radiusPx),
    '--mode-options-title': px(p.modeOptions.titlePx),
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
    '--action-height': px(p.actionButton.heightPx),
    '--action-padding-x': px(p.actionButton.paddingXPx),
    '--action-radius': px(p.actionButton.radiusPx),
    '--action-size': px(p.actionButton.textPx),
    '--action-gap': px(p.actionGapPx),
    '--editor-radius': px(p.editor.radiusPx),
    '--editor-padding-y': px(p.editor.paddingYPx),
    '--editor-padding-x': px(p.editor.paddingXPx),
    '--editor-size': px(p.editor.textPx),
    '--editor-line-height': String(p.editor.lineHeight),
    '--editor-min-lines': String(p.editor.minLines),
    '--editor-max-lines': String(p.editor.maxLines),
    '--confirm-gap': px(p.confirm.gapPx),
    '--confirm-padding': px(p.confirm.paddingPx),
    '--confirm-radius': px(p.confirm.radiusPx),
    '--confirm-size': px(p.confirm.textPx),
    '--confirm-button-gap': px(p.confirm.buttonGapPx),
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

export const MODE_TOKEN_IDS = ['ring', 'timeline', 'analog', 'ocean'] as const;
export type ModeTokenId = (typeof MODE_TOKEN_IDS)[number];

export function isModeTokenId(value: string): value is ModeTokenId {
  return (MODE_TOKEN_IDS as readonly string[]).includes(value);
}

function ringTokens(): string {
  const ring = CONFIG.modes.ring;
  const diameter = 2 * ring.radiusPx + ring.trackPx;
  const [far, near] = ring.tailStops;
  const properties: CustomProperties = {
    '--mode-time-size': String(CONFIG.design.type.ringTimePx),
    '--mode-gap': String(ring.gapPx),
    // Reference pixels, scaled with the time.
    '--ring-box': String(ring.boxPx),
    '--ring-diameter': String(diameter),
    '--ring-inset': String((ring.boxPx - diameter) / 2),
    '--ring-track': String(ring.trackPx),
    '--ring-head': String(ring.headPx),
    '--ring-head-left': String(ring.boxPx / 2 - ring.headPx / 2),
    '--ring-head-top': String(ring.boxPx / 2 - ring.radiusPx - ring.headPx / 2),
    '--ring-tail-far': String(far.at),
    '--ring-tail-far-strength': share(far.strength),
    '--ring-tail-near': String(near.at),
    '--ring-tail-near-strength': share(near.strength),
  };
  return block('[data-mode="ring"]', properties);
}

function timelineTokens(): string {
  const timeline = CONFIG.modes.timeline;
  const properties: CustomProperties = {
    '--mode-time-size': String(CONFIG.design.type.timelineTimePx),
    '--mode-gap': String(timeline.gapPx),
    '--timeline-inner-gap': String(timeline.innerGapPx),
    '--timeline-width': px(timeline.widthPx),
    '--timeline-height': px(timeline.heightPx),
    '--timeline-edge': px(timeline.edgePx),
    '--timeline-fade': share(timeline.fadeShare),
    '--timeline-label-size': px(timeline.labelPx),
  };
  return block('[data-mode="timeline"]', properties);
}

function analogTokens(): string {
  const analog = CONFIG.modes.analog;
  // The frame draws a viewBox of 300 × 310 units into 290 × 300 px: one unit is 290/300 px (the smaller scale),
  // and the drawing sits half of the spare height below the top.
  const viewBox = { width: 300, height: 310 };
  const unit = Math.min(analog.widthPx / viewBox.width, analog.heightPx / viewBox.height);
  // The drawing's own y runs from −10; the box's top is at y = −10.
  const top = (y: number): string => String(y + 10);
  const { centre, subdial, pinRadius } = analog;
  const properties: CustomProperties = {
    '--mode-time-size': String(CONFIG.design.type.ringTimePx),
    '--mode-gap': String(analog.gapPx),
    '--analog-width': String(analog.widthPx),
    '--analog-height': String(analog.heightPx),
    '--analog-unit': String(unit),
    '--analog-top': String((analog.heightPx - viewBox.height * unit) / 2),
    // The hands turn about these points (the drawing's units, measured from the box's top).
    '--analog-centre-x': String(centre.x),
    '--analog-centre-y': top(centre.y),
    '--analog-subdial-x': String(subdial.x),
    '--analog-subdial-y': top(subdial.y),
    '--analog-pin-left': String(centre.x - pinRadius),
    '--analog-pin-top': top(centre.y - pinRadius),
    '--analog-pin-size': String(2 * pinRadius),
    '--analog-label-size': px(analog.labelPx),
    '--analog-hours-label-size': px(analog.hoursLabelPx),
  };
  return block('[data-mode="analog"]', properties);
}

function oceanTokens(): string {
  const ocean = CONFIG.modes.ocean;
  const properties: CustomProperties = {
    '--mode-time-size': String(ocean.timePx),
    '--mode-gap': String(ocean.gapPx),
    '--ocean-text': ocean.palette.text,
    '--ocean-icon': ocean.palette.icon,
    '--ocean-accent': ocean.palette.accent,
    '--ocean-end': ocean.palette.end,
    '--ocean-pause': ocean.palette.pause,
  };
  // The dive profile and the lit card, on :root: a session's replay may be drawn while another mode shows.
  const chart = ocean.results;
  const mark = chart.landmark;
  const { pings, passing } = chart;
  const profile: CustomProperties = {
    '--profile-aspect': `${String(chart.widthPx)} / ${String(chart.heightPx)}`,
    '--profile-min-scale': String(chart.minScaleMetres),
    '--profile-headroom': String(chart.scaleHeadroom),
    '--profile-line': chart.colours.line,
    '--profile-card-text': chart.colours.text,
    '--profile-card-muted': chart.colours.muted,
    '--profile-depth-size': px(chart.depthPx),
    '--profile-zone-size': px(chart.zonePx),
    '--profile-zone-opacity': String(chart.zoneOpacity),
    '--profile-inset': px(chart.textInsetPx),
    '--profile-times-size': px(chart.timesPx),
    '--profile-times-gap': px(chart.timesGapPx),
    '--profile-zone-line-opacity': String(chart.zoneLines.opacity),
    '--profile-zone-line-share': String(chart.zoneLines.scaleShare),
    '--profile-zone-line-min-y': String(chart.zoneLines.minYPx),
    '--profile-height': String(chart.heightPx),
    '--landmark-dot': px(mark.dotPx),
    '--landmark-ring': px(mark.ringPx),
    '--landmark-gap': px(mark.gapPx),
    '--landmark-inset': px(mark.insetPx),
    '--landmark-size': px(mark.textPx),
    '--landmark-pad-y': px(mark.paddingYPx),
    '--landmark-pad-x': px(mark.paddingXPx),
    '--landmark-radius': px(mark.radiusPx),
    '--landmark-border': px(mark.borderPx),
    '--landmark-pop-metres': String(mark.popMetres),
    '--landmark-pop-from': String(mark.popFrom),
    '--landmark-fade-metres': String(mark.fadeMetres),
    '--landmark-rest-delay': ms(mark.restDelayMs),
    '--landmark-rest-fade': ms(mark.restFadeMs),
    '--landmark-dot-colour': mark.colours.dot,
    '--landmark-dot-ring': mark.colours.dotRing,
    '--landmark-text-colour': mark.colours.text,
    '--landmark-fill': mark.colours.fill,
    '--landmark-edge': mark.colours.border,
    '--ping-size': px(2 * pings.toRadiusPx),
    '--ping-colour': pings.colour,
    '--lit-above': String(chart.lit.aboveMetres),
    '--lit-below': String(chart.lit.belowMetres),
    '--lit-black-from': String(chart.lit.blackFromMetres),
    '--passing-from': String(passing.fromPx / passing.cardHeightPx),
    '--passing-travel': String(passing.travelPx / passing.cardHeightPx),
    '--passing-silhouette': passing.colours.silhouette,
    '--passing-deep': passing.colours.deep,
    '--passing-jelly': passing.colours.jelly,
    '--passing-jelly-line': passing.colours.jellyLine,
    '--passing-glow': passing.colours.glow,
  };
  return `${block('[data-mode="ocean"]', properties)}\n${block(':root', profile)}\n${lifeTokens()}`;
}

/** Ocean life's colours and motions (the "ocean depth, paused" frame), from CONFIG.modes.ocean.life. */
function lifeTokens(): string {
  const life = CONFIG.modes.ocean.life;
  const share = (px: number, of: number): string => `${String((px / of) * 100)}%`;
  const sine = (axis: 'X' | 'Y'): string => {
    const steps = 24;
    const frames = Array.from({ length: steps + 1 }, (_, i) => `    ${String((i / steps) * 100)}% { transform: translate${axis}(calc(var(--sine-amp) * ${String(Math.round(Math.sin((2 * Math.PI * i) / steps) * 1e6) / 1e6)})); }`);
    return `  @keyframes life-sine-${axis.toLowerCase()} {\n${frames.join('\n')}\n  }`;
  };
  const colours = block('[data-mode="ocean"]', {
    '--life-enter': ms(life.enterMs),
    '--life-far': life.colours.far,
    '--life-mid': life.colours.mid,
    '--life-near': life.colours.near,
    '--life-bubble': life.colours.bubble,
    '--life-bubble-opacity': String(life.colours.bubbleOpacity),
    '--life-bubble-stroke': px(life.bubbleStrokePx),
  });
  const from = share(life.fromPx, life.frameWidthPx);
  const to = share(life.fromPx + life.spanPx, life.frameWidthPx);
  const riseFrom = share(life.bubbleFromPx, life.frameHeightPx);
  const riseTo = share(life.bubbleFromPx - life.bubbleSpanPx, life.frameHeightPx);
  return [
    colours,
    `  @keyframes life-enter {\n    from { opacity: 0; }\n    to { opacity: 1; }\n  }`,
    `  @keyframes life-travel-right {\n    from { transform: translateX(${from}); }\n    to { transform: translateX(${to}); }\n  }`,
    `  @keyframes life-travel-left {\n    from { transform: translateX(${to}); }\n    to { transform: translateX(${from}); }\n  }`,
    `  @keyframes life-rise {\n    from { transform: translateY(${riseFrom}); }\n    to { transform: translateY(${riseTo}); }\n  }`,
    sine('X'),
    sine('Y'),
  ].join('\n');
}

const MODE_TOKENS: Readonly<Record<ModeTokenId, () => string>> = { ring: ringTokens, timeline: timelineTokens, analog: analogTokens, ocean: oceanTokens };

/** One display mode's tokens, in the `mode` layer. */
export function renderModeTokensCss(mode: ModeTokenId): string {
  const body = MODE_TOKENS[mode]();
  return `/* Generated from packages/core/src/config.ts at build time. */\n@layer mode {\n${body}\n}\n`;
}
