/**
 * The tree's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const TREE_CONFIG = {
  /**
   * The year's animations are made this many to a task (round 2.10): a few hundred at once would hold the main
   * thread past 50 ms; this many take a few milliseconds.
   */
  animationsPerTask: 40,
  yearPerFocused: 1 * HOUR,
  season: 15 * MINUTE,
  /** Each leaf cluster is offset by up to a quarter season (the frames' offsets, 0 to 0.5, scaled as they scale them). */
  clusterOffsetSeasons: 0.25,
  /**
   * The leaves' colours through the year, in order (the frames' season()): spring from #C2DE8E to #86C060,
   * summer to #3E8B47, autumn through #D9822F to #A9502A. Each cluster is drawn in these five colours,
   * stacked, and the year crossfades them (only opacity animates), which mixes them exactly as the frames do.
   * Each colour's shade is mixed 28 % toward black and its highlight 20 % toward white; an isometric cube's
   * top 22 % toward white and its right side 30 % toward black.
   */
  leaves: ['#C2DE8E', '#86C060', '#3E8B47', '#D9822F', '#A9502A'] as const,
  shade: { side: { dark: 0.28, light: 0.2 }, iso: { top: 0.22, right: 0.3 } },
  /** The isometric field's grass through the year (spring #8DBF5E to #5FA84A, summer, autumn to #A39A4E, winter). */
  grass: ['#8DBF5E', '#5FA84A', '#4E9A45', '#A39A4E', '#8E9A78'] as const,
  grassDark: 0.22,
  /** Snow, falling leaves and leaves on the ground, as the frames colour them; the isometric trunk. */
  colours: { trunk: '#6E4636', snow: '#F4F7FA', fall: '#C8682C', groundLeaf: '#B95A2A', isoTrunk: '#8A3F35', isoFieldLight: '#FFFFFF' },
  /** The tree's views (a mode option): side as default, as the plan's settings catalog says. */
  views: ['side', 'isometric'] as const,
  /** The side view: a 360 × 236 drawing, the time 30 px below it, 12 px apart; the isometric 380 × 320, 8 px apart. */
  side: { widthPx: 360, heightPx: 236, gapPx: 12 },
  iso: { widthPx: 380, heightPx: 320, gapPx: 8 },
  timePx: 30,
  /** The tree's year is drawn as keyframes a minute apart, each minute's change shown in 60 steps of a second. */
  keyframeMinutes: 1,
  stepsPerMinute: 60,
} as const;
