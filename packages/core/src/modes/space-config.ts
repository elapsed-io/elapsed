/**
 * Interstellar's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

import { SPACE_COMETS_CONFIG } from './space-comets-config.ts';

export const SPACE_CONFIG = {
  /**
   * Light speed (plan, Display modes): c × 60 s ÷ 1 AU = 0.12024 AU a focused minute, from Earth's orbit (1 AU).
   * The frames' own figure.
   */
  auPerMinute: 0.12024,
  startAu: 1,
  /**
   * The camera (the "interstellar, running" frame, 720 × 450): the Sun fixed at (70, 392), the traveller heading
   * −28° (−17° on results), pixels per AU = the usable path ÷ max(distance, 1.6 AU). The usable path is 85 % of
   * the way along the heading to 20 px short of the screen's right edge (606.5 px at 720 × 450).
   */
  camera: { sunX: 70, sunY: 392, headingDegrees: -28, resultsHeadingDegrees: -17, usableShare: 0.85, edgeMarginPx: 20, minAu: 1.6 },
  /** The orbits and boundaries, in AU; those from Pluto out dashed. A ring fades out between 9 and 3 px. */
  rings: [0.39, 0.72, 1.0, 1.52, 5.2, 9.54, 19.2, 30.1, 39.5, 50, 94, 120] as const,
  dashedFromAu: 39.5,
  ringFade: { fullPx: 9, gonePx: 3, opacity: 0.55, colour: '#7A86B0', widthPx: 0.9, dash: [3, 4] as const },
  /**
   * The landmarks past Earth, each drawn as itself where the travel line crosses it (owner, changes 5): a body
   * fades in from 24 px to 38 px of orbit radius, once reached; its name 9 px right and 19 px below, shown only
   * at least 70 px clear of the next name kept further out. Earth folds into the Sun's glow as the camera pulls
   * back (fully shown above 17 px per AU, gone below 9).
   */
  landmarks: [
    { id: 'mars', au: 1.52 },
    { id: 'jupiter', au: 5.2 },
    { id: 'saturn', au: 9.54 },
    { id: 'uranus', au: 19.2 },
    { id: 'neptune', au: 30.1 },
    { id: 'pluto', au: 39.5 },
    { id: 'kuiper', au: 50 },
    { id: 'termination-shock', au: 94 },
    { id: 'heliopause', au: 120 },
  ] as const,
  /** Where the trip starts: Earth, drawn last of the bodies, without a name. */
  start: { id: 'earth', au: 1 },
  /**
   * The bodies' colours, by their art's tones (art/space/bodies.ts; the frames'): fills, and the strokes of the
   * rings, the atmosphere and Neptune's cloud.
   */
  bodies: {
    'earth-sea': '#3F78D8',
    'earth-land': '#6FBF73',
    'earth-air': '#9CC9FF',
    mars: '#C8573A',
    'mars-cap': '#F4EDE6',
    jupiter: '#D9B58C',
    'jupiter-band': '#B6855E',
    'jupiter-spot': '#C4573B',
    saturn: '#E4CC93',
    'saturn-ring': '#D9C38E',
    uranus: '#9ED8DE',
    'uranus-ring': '#BFE8EC',
    neptune: '#4D72D6',
    'neptune-spot': '#2A3E8C',
    'neptune-cloud': '#E6F0FF',
    pluto: '#CDAE8C',
    'pluto-heart': '#F4E7D6',
    'kuiper-a': '#B9C9DD',
    'kuiper-b': '#A7B9D0',
    'kuiper-c': '#C8D6E6',
    shock: '#C3AEF0',
    'shock-ring': '#C3AEF0',
    heliopause: '#8FB4FF',
    'heliopause-ring': '#8FB4FF',
  },
  bodyStrokes: ['earth-air', 'saturn-ring', 'uranus-ring', 'neptune-cloud', 'shock-ring', 'heliopause-ring'] as const,
  bodyFade: { gonePx: 24, spanPx: 14 },
  earthFade: { gonePxPerAu: 9, spanPxPerAu: 8 },
  label: { dxPx: 9, dyPx: 19, textPx: 11, minGapPx: 70, shownAbove: 0.3, colour: '#C9D3F0' },
  sun: { glowRadiusPx: 10, glowColour: '#FFE7B0', glowOpacity: 0.16, radiusPx: 4, colour: '#FFF1CF' },
  route: { colour: '#C9D3F0', widthPx: 1.3, opacity: 0.7, headRadiusPx: 3.5, headColour: '#FFFFFF' },
  /** The space behind everything, and the palette over it (the frames'). */
  background: '#03040A',
  palette: { text: '#E8ECF6', icon: '#8A90A6', pause: '#23263A', end: '#A8403D', label: '#9AA6C8', caption: '#B9C6DE' },
  /** The sky (plan): the HYG stars projected about RA 5.5 h, Dec +6°, 8 px a degree; star radius max(0.7, 2.7 − 0.42 m). */
  projection: { rightAscensionHours: 5.5, declinationDegrees: 6, pxPerDegree: 8 },
  starRadius: { minPx: 0.7, basePx: 2.7, perMagnitudePx: 0.42 },
  /**
   * The sky (the frames): the canvas catalog and its faint stars at 55 % on the timer, 45 % behind the results
   * card; a star's opacity 1 − 0.1 m (at most 1); a glow three times its radius at 8 % for stars brighter than
   * magnitude 1. While paused it turns once in 6 minutes (the strip of every catalog star, warm from B−V 0.95,
   * as Pollux), crossfading from the still view over 2 s.
   */
  sky: { opacity: 0.55, resultsOpacity: 0.45, opacityPerMagnitude: 0.1, glowBelowMagnitude: 1, glowScale: 3, glowOpacity: 0.08, white: '#EAF0FF', warm: '#FFD2A6', faint: '#DCE4FF', warmFromColourIndex: 0.95, crossfadeMs: 2000 },
  /**
   * Comets while paused and on the results (the paused and results frames): each fades in over the first 16 %
   * of its stay and out over the last 16 %, its tail 0.6 of its head across, its head white with a glow of its
   * colour; they cross 280 to 400 px of the screen, and start well inside it.
   */
  comets: SPACE_COMETS_CONFIG,
  /**
   * The results (the "results: interstellar" frame): the map 600 × 208, the Sun at (34, 178), heading −17°,
   * 476.8 px of usable path; the distance line 12 px from the left and 10 px from the top. The card is space
   * from edge to edge, its text and icons in the frame's colours.
   */
  results: {
    widthPx: 600,
    heightPx: 208,
    sunX: 34,
    sunY: 178,
    usablePx: 476.8,
    distanceLeftPx: 12,
    distanceTopPx: 10,
    distancePx: 11,
    gapPx: 14,
    card: { text: '#E8ECF6', muted: '#9AA4C0', icon: '#9AA4C0' },
  },
  oortCloudAu: { min: 2000, max: 100_000 },
  proximaCentauriAu: 268_000,
} as const;
