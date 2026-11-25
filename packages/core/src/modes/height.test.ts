import { describe, expect, it } from 'vitest';
import { contrast, parseHexColour } from './light.ts';
import { HEIGHT_LANDMARKS, atmosphereLayer, heightReached, pickHeightLandmarks, skyColour, skyLitColour, spreadHeightLandmarks, starsOpacity } from './height.ts';
import { HEIGHT_CONFIG } from './height-config.ts';
import { HEIGHT_COPY } from '../copy/height.ts';

const MINUTE = 60_000;
const HEIGHT = HEIGHT_CONFIG;

/** The frames' own formula (ModeHeight.dc.html's sky(); the results frame's col() with its 0.65), written out again. */
function frameColour(z: number, dim = 1): string {
  return (
    '#' +
    [0.078, 0.275, 0.597]
      .map((v, i) => {
        let x = dim * v * Math.exp((-([1.25, 1.1, 0.95][i] ?? 0) * Math.max(0, Math.min(z, 100000))) / 8500);
        x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** The first whole metre from which `colour` keeps `ratio` against the sky all the way up. */
function passesFrom(colour: string, ratio: number): number {
  const rgb = parseHexColour(colour);
  let from = 0;
  for (let height = 0; height <= HEIGHT.maxHeightMetres; height += 1) if (contrast(rgb, parseHexColour(skyColour(height))) < ratio) from = height + 1;
  return from;
}

describe('height', () => {
  it('climbs 140 m a focused minute and stops at 100 km', () => {
    expect(heightReached(0)).toBe(0);
    expect(heightReached(MINUTE)).toBe(140);
    expect(heightReached(30_000)).toBe(70);
    expect(heightReached(84 * MINUTE)).toBe(11_760);
    expect(heightReached(714 * MINUTE)).toBe(99_960);
    expect(heightReached(715 * MINUTE)).toBe(100_000);
    expect(heightReached(2000 * MINUTE)).toBe(100_000);
    expect(heightReached(-MINUTE)).toBe(0);
  });

  it('colours the sky by the plan’s light model, exactly as the frames do', () => {
    for (const height of [-1500, 0, 1, 1500, 8500, 12_000, 18_000, 31_240, 42_000, 72_000, 100_000, 101_500]) {
      expect(skyColour(height), String(height)).toBe(frameColour(height));
      expect(skyLitColour(height), String(height)).toBe(frameColour(height, 0.65));
    }
    // The sky at the ground is a clear blue; space is black.
    expect(skyColour(0)).toBe('#4f8fcb');
    expect(skyColour(100_000)).toBe('#000000');
    expect(skyLitColour(72_000)).toBe('#000000');
    expect(skyLitColour(60_000)).not.toBe('#000000');
  });

  it('names the layer of the atmosphere at each height', () => {
    expect([0, 11_999, 12_000, 31_240, 49_999, 50_000, 84_999, 85_000, 100_000].map(atmosphereLayer)).toEqual([
      'troposphere',
      'troposphere',
      'stratosphere',
      'stratosphere',
      'stratosphere',
      'mesosphere',
      'mesosphere',
      'thermosphere',
      'thermosphere',
    ]);
    for (const layer of ['troposphere', 'stratosphere', 'mesosphere', 'thermosphere'] as const) expect(HEIGHT_COPY.layers[layer]).toMatch(/^[a-z]+$/);
  });

  it('shows the stars between 18 and 42 km, as the frames fade them', () => {
    for (const height of [0, 17_999, 18_000, 20_000, 30_000, 41_000, 42_000, 100_000]) expect(starsOpacity(height), String(height)).toBeCloseTo(sm((height - 18_000) / 24_000), 12);
    expect(starsOpacity(18_000)).toBe(0);
    expect(starsOpacity(42_000)).toBe(1);
  });

  it('keeps the time readable over the sky at every height (large text, at least 3:1)', () => {
    expect(passesFrom(HEIGHT.palette.text, 3)).toBe(0);
  });

  it('keeps the button labels at 4.5:1 on their fills, and pins where the frames’ icon and label colours pass over the sky', () => {
    const text = parseHexColour(HEIGHT.palette.text);
    expect(contrast(text, parseHexColour(HEIGHT.palette.pause))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, parseHexColour(HEIGHT.palette.end))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, parseHexColour(HEIGHT.palette.accent))).toBeGreaterThanOrEqual(4.5);
    // The frames' colours, drawn over the sky at 1 h 24 min and 31 km: the icons reach 3:1 and the paused
    // labels 4.5:1 only some way up (a question for the owner, round 2.5).
    expect(contrast(parseHexColour(HEIGHT.palette.icon), parseHexColour(skyColour(0)))).toBeCloseTo(2.44, 2);
    expect(passesFrom(HEIGHT.palette.icon, 3)).toBe(1937);
    expect(passesFrom(HEIGHT.palette.label, 4.5)).toBe(8654);
  });

  it('names every landmark in the brand module, at most two per 10 km band, only from the catalog', () => {
    for (const landmark of HEIGHT_LANDMARKS) expect(HEIGHT_COPY.landmarks[landmark.id]).toMatch(/^[\p{Ll}’ ,:]+$/u);
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let run = 0; run < 200; run += 1) {
      const picked = pickHeightLandmarks(random);
      const perBand = new Map<number, number>();
      for (const landmark of picked) {
        expect(HEIGHT_LANDMARKS).toContain(landmark);
        const band = Math.floor(landmark.height / 10_000);
        perBand.set(band, (perBand.get(band) ?? 0) + 1);
      }
      // Every 10 km band with a landmark gives one or two: to 25 km, then on to the Kármán line (owner, changes 3).
      expect([...perBand.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 8, 9, 10]);
      expect(Math.max(...perBand.values())).toBeLessThanOrEqual(2);
      expect(picked.map((landmark) => landmark.height)).toEqual([...picked.map((landmark) => landmark.height)].sort((a, b) => a - b));
      expect(spreadHeightLandmarks(picked, 6, random).length).toBe(Math.min(6, picked.length));
    }
  });
});
