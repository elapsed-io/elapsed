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
   * Geometry from the "analog: the shared 260 px dial" frame (canvas version 1795558050-f326): the redesigned
   * stopwatch on the shared dial (plan, Design system), a 300 × 296 drawing whose case is 260 px across, the
   * buttons the shared 26 px below it. In the drawing's own units, one a reference pixel at the case's radius of
   * 130; everything below is in those units.
   */
  widthPx: 300,
  heightPx: 296,
  centre: { x: 150, y: 162 },
  /** The polished case, its hairline rim, and the face. */
  caseRadius: 130,
  rimRadius: 126,
  rimOpacity: 0.08,
  faceRadius: 120,
  /** The ridged crown at 12: its stem, its cap and the ridges across the cap; it dips this far, this fast, when end is pressed. */
  crown: {
    stem: { x: 145, y: 27, width: 10, height: 8 },
    cap: { x: 135, y: 15, width: 30, height: 13, radius: 4 },
    ridges: { firstX: 140, step: 4, count: 6, top: 18, bottom: 25 },
    dip: 4,
    dipMs: 180,
  },
  /** The outer track: sixty ticks from the edge inward, longer and heavier every five. */
  ticks: { outer: 116, major: 109, minor: 112, majorWidth: 1.2, minorWidth: 0.8 },
  /** The numbers 5 to 60, each turned to follow the edge. */
  numbers: { radius: 101, letterSpacingEm: 0.04 },
  /** Slim baton indices, stopping this far short of a small dial in their way. */
  batons: { outer: 87, inner: 72, width: 2.6, opacity: 0.85, clearance: 5 },
  minuteHand: { length: 99, tail: 16, width: 2.4 },
  /** The pin over the hands: a disc in the hands' colour with a hole in the face's. */
  pin: { radius: 5, hole: 1.6 },
  /**
   * A small dial, in shares of its radius (the seconds dial's 36): its face (the background over the dial at
   * this opacity) and rim, ticks from the rim inward (long at each number), its numbers, and its hub. Each share
   * reproduces every coordinate the frame writes, to the tenth of a pixel.
   */
  subdialFill: CONFIG.theme.dialFaceFill,
  subdial: { rimWidth: 1, tickOuter: 34 / 36, longTick: 29.5 / 36, shortTick: 32 / 36, tickWidth: 0.6, numbers: 24.5 / 36, hub: 2.4 },
  labelPx: 10,
  subdialLabelPx: 8.5,
} as const;
