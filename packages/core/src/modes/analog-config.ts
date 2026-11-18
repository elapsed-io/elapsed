/**
 * The analog stopwatch's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

import { CONFIG } from '../config.ts';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const ANALOG_CONFIG = {
  revolution: 1 * HOUR,
  labelEveryMinutes: 5,
  /** The hours hand turns once in this long. */
  hoursRevolution: 12 * HOUR,
  /**
   * Geometry from the redesigned "analog" frame (canvas version 1794927010-cb9d): a 340 × 336 drawing, 14 px
   * above the buttons, in its own units (one a reference pixel at a radius of 150). Everything below is in
   * those units.
   */
  widthPx: 340,
  heightPx: 336,
  gapPx: 14,
  centre: { x: 170, y: 178 },
  /** The polished case, its hairline rim, and the face. */
  caseRadius: 150,
  rimRadius: 146,
  rimOpacity: 0.08,
  faceRadius: 138,
  /** The ridged crown at 12: its stem, its cap and the ridges across the cap; it dips this far, this fast, when end is pressed. */
  crown: {
    stem: { x: 165, y: 23, width: 10, height: 8 },
    cap: { x: 155, y: 11, width: 30, height: 13, radius: 4 },
    ridges: { firstX: 160, step: 4, count: 6, top: 14, bottom: 21 },
    dip: 4,
    dipMs: 180,
  },
  /** The outer track: sixty ticks from the edge inward, longer and heavier every five. */
  ticks: { outer: 134, major: 127, minor: 130, majorWidth: 1.2, minorWidth: 0.8 },
  /** The numbers 5 to 60, each turned to follow the edge. */
  numbers: { radius: 116, letterSpacingEm: 0.04 },
  /** Slim baton indices, stopping this far short of a small dial in their way. */
  batons: { outer: 100, inner: 83, width: 2.6, opacity: 0.85, clearance: 5 },
  minuteHand: { length: 114, tail: 18, width: 2.5 },
  /** The pin over the hands: a disc in the hands' colour with a hole in the face's. */
  pin: { radius: 5, hole: 1.6 },
  /**
   * A small dial, in shares of its radius (the seconds dial's 42): its face (the background over the dial at
   * this opacity) and rim, ticks from the rim inward (long at each number), its numbers, and its hub.
   */
  subdialFill: CONFIG.theme.dialFaceFill,
  // The long ticks' inner end and the numbers' radius are the frame's own (35.505 and 28.48 of 42 reproduce
  // every coordinate it writes; 35.5 and 28.5 would put four of them 0.1 px off).
  subdial: { rimWidth: 1, tickOuter: 40 / 42, longTick: 35.505 / 42, shortTick: 38 / 42, tickWidth: 0.6, numbers: 28.48 / 42, hub: 2.4 },
  labelPx: 11,
  subdialLabelPx: 9.5,
} as const;
