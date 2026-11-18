/**
 * The pieces' own fallbacks (round 2.11, one design system): what a piece or a results view uses when its recipe
 * leaves a size, a duration, a count or a colour out, in one place, so no mode's code holds a value of its own. In
 * a module of its own so each piece carries only these. The config module's rules apply here too (config.ts).
 */
export const PIECES_CONFIG = {
  /** A colour nothing gives (an environment with no colour at a value) is black; shades mix toward black or white. */
  colours: { none: '#000000', shade: '#000000', light: '#FFFFFF' },
  /** The camera keeps the usable path this far short of the right edge (px), and this share of the width. */
  camera: { edgeMarginPx: 20, usable: 0.85, minValue: 1 },
  /** How finely a dive's first stretch is keyframed (the window grows from one spread to two). */
  light: { zoomStepsPerSpread: 48 },
  /** A recipe's results fallbacks: landmarks at most, and per band; the card's opening crossfade (s). */
  results: { landmarksMax: 6, landmarksPerBand: 2, cardCrossSeconds: 0.35 },
  /** A path's line width and its head's size (px), and a dial's cycle (minutes), when a recipe does not say. */
  path: { widthPx: 1, headPx: 6 },
  /**
   * A dial's fallbacks: its cycle (minutes), its ticks, and a subdial's radius, its hand's width and its hand's
   * length as a share of the radius (the analog frame's 39 of 42).
   */
  dial: { cycleMinutes: 720, majorTicks: 12, minorTicks: 60, subdialRadius: 22, subdialHandWidth: 1.2, subdialHandShare: 39 / 42 },
  /** A turning sky goes once round in this many minutes when its recipe does not say. */
  sky: { turnMinutes: 6 },
} as const;
