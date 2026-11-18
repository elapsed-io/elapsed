/**
 * Height's shooting stars' tunable numbers, in a module of their own so the particles piece carries only these, not
 * the whole mode's (round 2.10); HEIGHT_CONFIG.meteors is this. The config module's rules apply here too (config.ts).
 */

/**
 * While paused, once stars are visible: shooting stars, a few at a time, each about a second, at random
 * intervals of 7 to 15 s; each 60 to 130 px long, 1 to 2 px thick, white, pale gold, pale green or pale
 * blue, streaking 110 to 220 px down a 15° to 40° slope; each shows for the frame's first 7 % of its period
 * (bright from 1.5 %). Rarely, once every 3 minutes of pause and first at a random moment of them, a shower:
 * 8 to 15 from one point within 3 s, each showing for 1.17 s (bright from 0.27 s) and radiating at 95° to
 * 170°. Each is drawn once, at random, when the pause starts, and moved by CSS alone (the "height, paused"
 * frame's own keyframes).
 */
export const HEIGHT_METEORS_CONFIG = {
  count: 7,
  periodSeconds: { min: 7, max: 15 },
  peakShare: 0.015,
  endShare: 0.07,
  lengthPx: { min: 60, max: 130 },
  thicknessPx: { min: 1, max: 2 },
  radiusPx: 1,
  travelPx: { min: 110, max: 220 },
  angleDegrees: { min: 15, max: 40 },
  startArea: { leftPx: 100, rightPx: 520, topPx: 40, bottomPx: 150 },
  colours: ['rgba(255,255,255,0.95)', 'rgba(255,236,190,0.95)', 'rgba(200,255,220,0.95)', 'rgba(220,232,255,0.95)'] as const,
  shower: {
    count: { min: 8, max: 15 },
    periodSeconds: 180,
    withinSeconds: 3,
    peakSeconds: 0.27,
    endSeconds: 1.17,
    spreadPx: 25,
    angleDegrees: { min: 95, max: 170 },
    travelPx: { min: 60, max: 230 },
    radiantArea: { leftPx: 440, rightPx: 620, topPx: 40, bottomPx: 90 },
  },
  frameWidthPx: 720,
  frameHeightPx: 450,
} as const;
