/**
 * Height's tunable numbers (plan, Design system > Display modes; Architecture invariant 11), in a module of
 * their own so that only the download that draws the mode carries them (round 2.10). The config module's rules
 * apply here too (config.ts).
 */

import { HEIGHT_METEORS_CONFIG } from './height-meteors-config.ts';

export const HEIGHT_CONFIG = {
  metresPerFocusedMinute: 140,
  maxHeightMetres: 100_000,
  /** The sky: linear RGB × e^(−K·h / 8,500 m), across ±1,500 m of the screen (plan, Display modes). */
  groundLinearRgb: [0.078, 0.275, 0.597] as readonly [number, number, number],
  attenuation: [1.25, 1.1, 0.95] as readonly [number, number, number],
  scaleHeightMetres: 8500,
  gradientHalfSpanMetres: 1500,
  /** The running sky is drawn with a stop every this many metres (the light model's curve, not a straight line). */
  gradientStepMetres: 100,
  /** Stars fade in (smoothstep) from 18 km to 42 km. */
  starsFadeMetres: { start: 18_000, end: 42_000 },
  landmarksPerBand: 2,
  landmarkBandMetres: 10_000,
  /** Where each layer of the atmosphere ends (metres); the thermosphere runs to the top. */
  layers: { troposphere: 12_000, stratosphere: 50_000, mesosphere: 85_000 },
  /**
   * The landmarks a replay may show, by height (the "results: height (build this one)" frame to 25 km, then to the
   * Kármán line; names in the brand module).
   */
  landmarks: [
    [828, 'burjKhalifa'],
    [5100, 'highestTown'],
    [8849, 'everest'],
    [11_000, 'airliner'],
    [11_300, 'highestBird'],
    [18_300, 'concorde'],
    [19_000, 'armstrongLimit'],
    [25_000, 'ozoneLayer'],
    // To the Kármán line (owner, changes 3): the meteors' band (about 80 to 100 km) at its middle.
    [38_969, 'baumgartner'],
    [41_422, 'eustace'],
    [50_000, 'stratopause'],
    [53_000, 'highestBalloon'],
    [80_000, 'astronautWings'],
    [83_000, 'noctilucent'],
    [90_000, 'meteors'],
    [100_000, 'karman'],
  ] as const,
  /** The height tile's preview (the Release 2 display frame): a mountain, its summit, and a star. */
  tile: { mountain: 'muted', summit: 'text', star: 'accent' } as const,
  /** The height frames' own colours for the time, the icons (dimmer while paused) and the buttons over the sky. */
  palette: { text: '#EEF4FA', icon: '#C9DCEE', iconPaused: '#9AA6C8', accent: '#35764E', end: '#A8403D', pause: '#2A4A6A', label: '#B9C6DE' },
  timePx: 104,
  gapPx: 22,
  /** The stars: the frames' own field, tinted (the "height, full climb" frame). */
  stars: { faint: '#DCE4FF', white: '#EAF0FF', warm: '#FFD2A6' },
  /**
   * While paused, once stars are visible: shooting stars, a few at a time, each about a second, at random
   * intervals of 7 to 15 s; each 60 to 130 px long, 1 to 2 px thick, white, pale gold, pale green or pale
   * blue, streaking 110 to 220 px down a 15° to 40° slope; each shows for the frame's first 7 % of its period
   * (bright from 1.5 %). Rarely, once every 3 minutes of pause and first at a random moment of them, a shower:
   * 8 to 15 from one point within 3 s, each showing for 1.17 s (bright from 0.27 s) and radiating at 95° to
   * 170°. Each is drawn once, at random, when the pause starts, and moved by CSS alone (the "height, paused"
   * frame's own keyframes).
   */
  meteors: HEIGHT_METEORS_CONFIG,
  /** The climb profile on the results (the "results: height (build this one)" frame). */
  results: {
    widthPx: 600,
    heightPx: 190,
    /** The height scale is at least 2,000 m, and 15 % above the climb so far (it zooms out as the climb goes up). */
    minScaleMetres: 2000,
    scaleHeadroom: 1.15,
    /** Dashed lines where the stratosphere, mesosphere and thermosphere begin, named 5 px above, 6 px from the left. */
    zoneLines: { heights: [12_000, 50_000, 85_000] as const, opacity: 0.35, dash: '2 5', labelAbovePx: 5, labelLeftPx: 6, minYPx: 16, scaleShare: 0.98 },
    /** The height reached (22 px, light) and its layer (11 px, 80 %) at the bottom right, 4 px in. */
    valuePx: 22,
    zonePx: 11,
    zoneOpacity: 0.8,
    textInsetPx: 4,
    valueBaselinePx: 160,
    zoneBaselinePx: 178,
    lineWidthPx: 2,
    headRadiusPx: 4,
    timesPx: 11,
    timesGapPx: 6,
    colours: { line: '#FFFFFF', text: '#F4F8FB', muted: 'rgba(232,242,250,0.74)' },
    /** As ocean depth's (its frame's own numbers): popping over 1,400 m, fading in over 1,500 m. */
    landmark: { max: 6, popMetres: 1400, fadeMetres: 1500 },
    /**
     * The card takes the sky at the height the replay has reached: the light model dimmed to 65 %, from
     * 1,500 m above to 1,500 m below, never below the ground; past about 72 km every colour is black. It
     * opens in the colour the session ended in and crosses to the ground's over 0.35 s as the replay begins.
     */
    lit: { dim: 0.65, aboveMetres: 1500, belowMetres: 1500, blackFromMetres: 72_000, crossfadeMs: 350, stepMetres: 100 },
    /**
     * Things passing as the replay climbs past their heights, falling past you (placeholder silhouettes through
     * the asset registry): each falls from −90 px to 550 px of a 520 px card while the climb goes from `from`
     * to `from + span` metres, at most `peak` opaque, `leftPx` from the card's left at its reference width,
     * drawn at its art's own size or `sizePx` (the clouds, whose art is drawn larger).
     */
    passing: {
      cardHeightPx: 520,
      cardWidthPx: 720,
      fromPx: -90,
      travelPx: -640,
      things: [
        { key: 'passing/birds', from: 0, span: 2600, peak: 0.8, leftPx: 500 },
        { key: 'passing/cloud', from: 600, span: 5400, peak: 0.9, leftPx: 80, sizePx: [170, 76] as const },
        { key: 'passing/cloud-faint', from: 2500, span: 9000, peak: 0.85, leftPx: 430, sizePx: [220, 99] as const },
        { key: 'passing/airliner', from: 8800, span: 4000, peak: 0.95, leftPx: 250 },
        { key: 'passing/weather-balloon', from: 15_000, span: 19_000, peak: 0.95, leftPx: 560 },
      ],
      colours: { silhouette: '#0E2440', cloud: '#FFFFFF', contrail: 'rgba(255,255,255,0.6)', balloon: '#EDEFF3', rigging: '#C9D3E0' },
    },
  },
} as const;
