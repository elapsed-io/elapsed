/**
 * Ocean life's tunable numbers, in a module of their own so the particles piece carries only these, not
 * the whole mode's (round 2.10); OCEAN_CONFIG.life is this. The config module's rules apply here too (config.ts).
 */

/**
 * Ocean life while paused (particles.ts): arrivals at random as its recipe sets out, at three distances as the
 * "ocean depth, paused" frame draws them (rows 150, 300 and 390 px of a 720 × 450 screen; fish at 0.3, 0.55
 * and 1.25 of 54 × 22 px; drifting 7, 13 and 26 px/s), fish wiggling 4 px across and bobbing 3 px; bubbles
 * rising from 470 px and swaying 6 px.
 */
export const OCEAN_LIFE_CONFIG = {
  frameWidthPx: 720,
  frameHeightPx: 450,
  wigglePx: 4,
  wiggleRate: 1.1,
  bobPx: 3,
  bobRate: 0.9,
  bubbleFromPx: 470,
  bubbleSwayPx: 6,
  bubbleSwayRate: 1.4,
  bubbleStrokePx: 1.2,
  /** The three distances, far to near: their rows, their fish's scales, and how fast they drift (px/s). */
  rowsPx: [150, 300, 390],
  scales: [0.3, 0.55, 1.25],
  speedsPxPerSecond: [7, 13, 26],
  /** How long an arrival stays when its recipe does not say, in seconds; each fades in and out over fadeSeconds. */
  lifetimeSeconds: [8, 20],
  fadeSeconds: 2,
  /** How long a drawn schedule of arrivals runs before it repeats, in seconds. */
  cycleSeconds: 180,
  /** A column of bubbles: how fast it rises (px/s), how far its bubbles sway apart, their spacing and radii (px). */
  bubbles: { speedPxPerSecond: [22, 38], spreadPx: 12, spacingPx: [26, 48], radiusPx: [2.5, 6] },
  colours: { far: '#0B2A63', mid: '#1B4C82', near: '#3D7EA6', bubble: '#7FB3CC', bubbleOpacity: 0.5 },
} as const;
