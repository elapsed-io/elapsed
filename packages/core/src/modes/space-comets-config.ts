/**
 * Interstellar's comets' tunable numbers, in a module of their own so the particles piece carries only these, not
 * the whole mode's (round 2.10); SPACE_CONFIG.comets is this. The config module's rules apply here too (config.ts).
 */

/**
 * Comets while paused and on the results (the paused and results frames): each fades in over the first 16 %
 * of its stay and out over the last 16 %, its tail 0.6 of its head across, its head white with a glow of its
 * colour; they cross 280 to 400 px of the screen, and start well inside it.
 */
export const SPACE_COMETS_CONFIG = {
  fadeShare: 0.16,
  tailShare: 0.6,
  head: '#F4FBFF',
  tailAlpha: 0.85,
  glowAlpha: 0.6,
  cycleSeconds: 180,
  tailRadiusPx: 3,
  /** What a recipe's comets layer leaves out: their stay (s), head and tail sizes, distance crossed (px) and colour. */
  defaults: { lifetimeSeconds: [8, 11], headPx: [4, 8], lengthPx: [50, 110], distancePx: [280, 400], colour: '#D2F0FF' },
} as const;
