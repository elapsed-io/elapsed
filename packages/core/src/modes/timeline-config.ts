/**
 * The timeline's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

export const TIMELINE_CONFIG = {
  minutesPer100Px: 10,
  tickEveryMinutes: 5,
  labelEveryMinutes: 10,
  /**
   * Geometry from the revised timeline frame, in CSS pixels: never scaled,
   * so lines and ticks stay on whole pixels. The track never grows past
   * its frame width; on narrow windows less of it shows.
   */
  widthPx: 480,
  heightPx: 64,
  lineYPx: 20,
  lineHeightPx: 2,
  tickWidthPx: 1,
  minorTickPx: 5,
  majorTickPx: 8,
  labelYPx: 46,
  labelPx: 11,
  /** Both ends fade out over this share of the track. */
  fadeShare: 0.14,
  /** On windows narrower than the track, it keeps this far from each edge. */
  edgePx: 16,
  /** The time sits 18 px above the track; the track 30 px above the buttons. */
  innerGapPx: 18,
  gapPx: 30,
} as const;
