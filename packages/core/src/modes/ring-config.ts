/**
 * The ring's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const RING_CONFIG = {
  revolution: 1 * HOUR,
  trackPx: 8,
  /** The tail: up to 55° long, one smooth conic gradient fading from the accent at the head to nothing. */
  tailDegrees: 55,
  /** The gradient's stops, from the far end: the accent at these shares of full strength, at these shares of the tail's length. */
  tailStops: [
    { at: 0.45, strength: 0.15 },
    { at: 0.75, strength: 0.55 },
  ],
  /** Geometry at reference, from the ring frame: a 280 px box, the ring's centre line at 112 px, an 8 px round head. */
  boxPx: 280,
  radiusPx: 112,
  headPx: 8,
  /** The ring sits 20 px above the buttons. */
  gapPx: 20,
} as const;
