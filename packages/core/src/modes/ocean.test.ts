import { describe, expect, it } from 'vitest';
import { attenuated, contrast, hex, parseHexColour } from './light.ts';
import { OCEAN_LANDMARKS, oceanColour, oceanDepth, oceanLitColour, oceanZone, pickLandmarks, spreadLandmarks } from './ocean.ts';
import { OCEAN_CONFIG } from './ocean-config.ts';
import { OCEAN_COPY } from '../copy/ocean.ts';

const MINUTE = 60_000;
const OCEAN = OCEAN_CONFIG;

/** The frames' own formula (ModeOcean.dc.html), written out again so the module is checked against it. */
function frameColour(z: number): string {
  const surf = [0.0232, 0.212, 0.392];
  const K = [0.3, 0.06, 0.023];
  return (
    '#' +
    surf
      .map((v, i) => {
        let x = v * Math.exp(-(K[i] ?? 0) * Math.min(z, 10935));
        x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

describe('ocean depth', () => {
  it('goes down 15 m a focused minute and stops at 10,935 m', () => {
    expect(oceanDepth(0)).toBe(0);
    expect(oceanDepth(6 * MINUTE)).toBe(90);
    expect(oceanDepth(30_000)).toBe(7.5);
    expect(oceanDepth(729 * MINUTE)).toBe(10_935);
    expect(oceanDepth(2000 * MINUTE)).toBe(10_935);
    expect(oceanDepth(-MINUTE)).toBe(0);
  });

  it('colours the water by the plan’s light model, exactly as the frames do', () => {
    for (const depth of [0, 1, 6, 20, 84, 96, 200, 1000, 4000, 10_935, 12_000]) expect(oceanColour(depth), String(depth)).toBe(frameColour(depth));
    expect(oceanColour(-6)).toBe(oceanColour(0));
    // The surface is a bright blue, and the deep is all but black.
    expect(oceanColour(0)).toBe('#2a7fa8');
    expect(oceanColour(10_935)).toBe('#000000');
  });

  it('names the zone at each depth', () => {
    expect([0, 199, 200, 999, 1000, 3999, 4000, 5999, 6000, 10_935].map(oceanZone)).toEqual(['sunlight', 'sunlight', 'twilight', 'twilight', 'midnight', 'midnight', 'abyssal', 'abyssal', 'hadal', 'hadal']);
    for (const zone of ['sunlight', 'twilight', 'midnight', 'abyssal', 'hadal'] as const) expect(OCEAN_COPY.zones[zone]).toMatch(/^[a-z ]+ zone$/);
  });

  it('keeps the time readable over the water at every depth (large text, at least 3:1)', () => {
    const text = parseHexColour(OCEAN.palette.text);
    const worst = Math.min(...Array.from({ length: 11_000 }, (_, depth) => contrast(text, parseHexColour(oceanColour(depth)))));
    expect(worst).toBeGreaterThanOrEqual(3);
  });

  it('keeps the corner icons at 3:1 over the water from 6 m down, and the button labels at 4.5:1 on their fills', () => {
    const icon = parseHexColour(OCEAN.palette.icon);
    const text = parseHexColour(OCEAN.palette.text);
    const worst = Math.min(...Array.from({ length: 10_930 }, (_, step) => contrast(icon, parseHexColour(oceanColour(6 + step)))));
    expect(worst).toBeGreaterThanOrEqual(3);
    // Nearer the surface the frames' icon colour falls to 2.39:1 (a question for the owner, round 2.3).
    expect(contrast(icon, parseHexColour(oceanColour(0)))).toBeCloseTo(2.39, 2);
    expect(contrast(text, parseHexColour(OCEAN.palette.pause))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, parseHexColour(OCEAN.palette.end))).toBeGreaterThanOrEqual(4.5);
  });

  it('names every landmark in the brand module, at most two per 1,000 m band, only from the catalog', () => {
    for (const landmark of OCEAN_LANDMARKS) expect(OCEAN_COPY.landmarks[landmark.id]).toMatch(/^[a-z’ ,]+$/);
    let seed = 1;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let run = 0; run < 200; run += 1) {
      const picked = pickLandmarks(random);
      const perBand = new Map<number, number>();
      for (const landmark of picked) {
        expect(OCEAN_LANDMARKS).toContain(landmark);
        const band = Math.floor(landmark.depth / 1000);
        perBand.set(band, (perBand.get(band) ?? 0) + 1);
      }
      expect(Math.max(...perBand.values())).toBeLessThanOrEqual(2);
      expect(Math.min(...perBand.values())).toBeGreaterThanOrEqual(1);
      expect(picked.map((landmark) => landmark.depth)).toEqual([...picked.map((landmark) => landmark.depth)].sort((a, b) => a - b));
    }
  });

  it('lights the results card with the same model, dimmed to 80 %, black past about 340 m', () => {
    expect(oceanLitColour(0)).toBe(hex(attenuated(OCEAN.surfaceLinearRgb.map((v) => v * 0.8) as [number, number, number], OCEAN.attenuationPerMetre, 0)));
    expect(oceanLitColour(340)).toBe('#000000');
    expect(oceanLitColour(10_935)).toBe('#000000');
    expect(oceanLitColour(100)).not.toBe('#000000');
  });

  it('keeps at most six landmarks, spread along the path, dropping one of the closest pair', () => {
    let calls = 0;
    const random = (): number => (calls++ % 2 === 0 ? 0.25 : 0.75);
    const all = OCEAN_LANDMARKS.slice(0, 12);
    const kept = spreadLandmarks(all, 6, random);
    expect(kept).toHaveLength(6);
    expect(kept.map((landmark) => landmark.depth)).toEqual([...kept.map((landmark) => landmark.depth)].sort((a, b) => a - b));
    for (const landmark of kept) expect(all).toContain(landmark);
    // Spread: no two kept are closer than the closest pair of the twelve was.
    const gaps = (list: readonly { depth: number }[]): number[] => list.slice(1).map((landmark, i) => landmark.depth - (list[i]?.depth ?? 0));
    expect(Math.min(...gaps(kept))).toBeGreaterThanOrEqual(Math.min(...gaps(all)));
    expect(spreadLandmarks(all.slice(0, 4), 6, random)).toHaveLength(4);
  });
});
