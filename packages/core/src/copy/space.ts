/**
 * Interstellar's copy (plan, Architecture invariant 12; round 2.10): in a module of its own, so only the
 * download that shows it carries it. The brand module's rules apply (brand.ts): every user-facing string lives in
 * the brand module and these copy modules, lowercase.
 */

export const SPACE_COPY = {
  /** The bodies on the map (the frames' own names); Earth, where the trip starts, is never named on it. */
  bodies: {
    earth: 'earth',
    mars: 'mars',
    jupiter: 'jupiter',
    saturn: 'saturn',
    uranus: 'uranus',
    neptune: 'neptune',
    pluto: 'pluto',
    kuiper: 'kuiper belt edge',
    'termination-shock': 'termination shock',
    heliopause: 'heliopause',
  },
  /** The results map, read on request (the frame's own words). */
  map: 'journey outward from the sun at light speed',
} as const;

/** The settings panel (the five Release 1 settings frames). */
