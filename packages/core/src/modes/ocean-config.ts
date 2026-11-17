/**
 * Ocean depth's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

import { OCEAN_LIFE_CONFIG } from './ocean-life-config.ts';

export const OCEAN_CONFIG = {
  metresPerFocusedMinute: 15,
  maxDepthMetres: 10_935,
  surfaceLinearRgb: [0.0232, 0.212, 0.392] as readonly [number, number, number],
  attenuationPerMetre: [0.3, 0.06, 0.023] as readonly [number, number, number],
  gradientHalfSpanMetres: 6,
  landmarksPerBand: 2,
  landmarkBandMetres: 1000,
  /**
   * Ocean life while paused (particles.ts): arrivals at random as its recipe sets out, at three distances as the
   * "ocean depth, paused" frame draws them (rows 150, 300 and 390 px of a 720 × 450 screen; fish at 0.3, 0.55
   * and 1.25 of 54 × 22 px; drifting 7, 13 and 26 px/s), fish wiggling 4 px across and bobbing 3 px; bubbles
   * rising from 470 px and swaying 6 px.
   */
  life: OCEAN_LIFE_CONFIG,
  /** The ocean depth tile's preview (the Release 2 display frame): water from top to bottom, and its wave. */
  tile: { top: '#2E7FA8', bottom: '#05122A', wave: '#BFE3F2' },
  /** The ocean frames' own colours for the time, the icons and the buttons over the water. */
  palette: { text: '#DCE8EE', icon: '#9EC3D6', accent: '#35764E', end: '#A8403D', pause: '#1E3E57' },
  /** The time is 104 px at reference, 22 px above the buttons. */
  timePx: 104,
  gapPx: 22,
  /** Where each zone ends (metres); the hadal zone runs to the bottom. */
  zones: { sunlight: 200, twilight: 1000, midnight: 4000, abyssal: 6000 },
  /** The landmarks a replay may show, by depth (names in the brand module). */
  landmarks: [
    [40, 'scuba'],
    [332, 'scubaRecord'],
    [564, 'emperorPenguin'],
    [828, 'burjKhalifa'],
    [1280, 'leatherback'],
    [1642, 'baikal'],
    [1857, 'grandCanyon'],
    [2250, 'spermWhale'],
    [2388, 'elephantSeal'],
    [2992, 'beakedWhale'],
    [3688, 'averageOcean'],
    [3800, 'titanic'],
    [4791, 'bismarck'],
    [5000, 'maunaLoa'],
    [6000, 'hadal'],
    [6865, 'deepestWreck'],
    [8336, 'deepestFish'],
    [8376, 'puertoRico'],
    [8849, 'everest'],
    [10_935, 'challengerDeep'],
  ] as const,
  /** The dive profile on the results (the "results: ocean depth (build this one)" frame). */
  results: {
    widthPx: 600,
    heightPx: 190,
    /** The depth scale is at least this deep, and 15 % deeper than the dive so far (it zooms out as the dive goes down). */
    minScaleMetres: 200,
    scaleHeadroom: 1.15,
    /** Dashed lines where the twilight, midnight and abyssal zones begin, named 5 px above, 6 px from the left. */
    zoneLines: { depths: [200, 1000, 4000] as const, opacity: 0.35, dash: '2 5', labelAbovePx: 5, labelLeftPx: 6, minYPx: 16, scaleShare: 0.98 },
    /** The depth reached (22 px, light) and its zone (11 px, 80 %) at the top right, 4 px in. */
    depthPx: 22,
    zonePx: 11,
    zoneOpacity: 0.8,
    textInsetPx: 4,
    depthBaselinePx: 22,
    zoneBaselinePx: 40,
    lineWidthPx: 2,
    headRadiusPx: 4,
    /** The start and end clock times, 11 px, 6 px below the chart. */
    timesPx: 11,
    timesGapPx: 6,
    colours: { line: '#FFFFFF', text: '#F4F8FB', muted: 'rgba(232,242,250,0.74)' },
    /**
     * At most six landmarks a session, spread along the path. Each is a 7 px dot on the path where the dive
     * reached it, and a label 9 px beside it (to the left once the dot is past 330 px), kept 12 px inside the
     * chart. The label pops in (from 60 % with an overshoot over 90 m) and fades in over 120 m as the dive
     * passes; 1.1 s after the replay it fades out over 0.5 s, leaving the dots.
     */
    landmark: {
      max: 6,
      dotPx: 7,
      ringPx: 1.5,
      gapPx: 9,
      flipAfterPx: 330,
      insetPx: 12,
      textPx: 11,
      paddingYPx: 2,
      paddingXPx: 8,
      radiusPx: 10,
      borderPx: 1,
      popMetres: 90,
      popFrom: 0.6,
      fadeMetres: 120,
      restDelayMs: 1100,
      restFadeMs: 500,
      colours: { dot: '#F2C46B', dotRing: 'rgba(0,0,0,0.5)', text: '#FFF4DC', fill: 'rgba(6,14,26,0.72)', border: 'rgba(255,255,255,0.18)' },
    },
    /** Two soft sonar pings from the deepest point as the replay ends: 5 to 75 px over 1.4 s, 0.55 s apart. */
    pings: { count: 2, lagMs: 550, durationMs: 1400, fromRadiusPx: 5, toRadiusPx: 75, opacity: 0.8, strokePx: 1.5, colour: '#BFE9FF' },
    /**
     * The card takes the light at the depth the replay has reached: the light model dimmed to 80 %, from
     * 20 m above to 60 m below; past about 340 m every colour is black. It opens in the colour the session
     * ended in and crosses to the surface's over 0.35 s as the replay begins.
     */
    lit: { dim: 0.8, aboveMetres: 20, belowMetres: 60, blackFromMetres: 340, crossfadeMs: 350 },
    /**
     * Things passing as the replay crosses their zone, rising past you (placeholder silhouettes through the
     * asset registry): each rises from 560 px to −100 px of a 520 px card while the dive goes from `from` to
     * `from + span` metres, at most `peak` opaque, `leftPx` from the card's left at its reference width.
     */
    passing: {
      cardHeightPx: 520,
      cardWidthPx: 720,
      fromPx: 560,
      travelPx: 660,
      things: [
        { key: 'passing/fish-school', from: 0, span: 260, peak: 0.55, leftPx: 470 },
        { key: 'passing/sea-turtle', from: 40, span: 380, peak: 0.5, leftPx: 90 },
        { key: 'passing/whale', from: 220, span: 1030, peak: 0.45, leftPx: 380 },
        { key: 'passing/jellyfish', from: 320, span: 830, peak: 0.9, leftPx: 150 },
        { key: 'passing/squid-lights', from: 900, span: 1750, peak: 1, leftPx: 520 },
      ],
      colours: { silhouette: '#0B2235', deep: '#06182A', jelly: 'rgba(170,210,255,0.55)', jellyLine: 'rgba(170,210,255,0.45)', glow: '#8FE6FF' },
    },
  },
} as const;
