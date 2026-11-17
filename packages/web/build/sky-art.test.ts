import { describe, expect, it } from 'vitest';
import { cardImage, faintTile, gnomonic, stillImage, stripImage } from './sky-art.ts';
import type { SkyLook } from './sky-art.ts';

const LOOK: SkyLook = { white: '#EAF0FF', warm: '#FFD2A6', faint: '#DCE4FF', opacityPerMagnitude: 0.1, glowBelowMagnitude: 1, glowScale: 3, glowOpacity: 0.08, warmFromColourIndex: 0.95 };
const PROJECTION = { ra: 5.5, dec: 6, pxPerDegree: 8 };
const SIZES = { min: 0.7, at0: 2.7, perMagnitude: -0.42 };
const circles = (svg: string): { cx: number; cy: number; r: number }[] =>
  [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map((match) => ({ cx: Number(match[1]), cy: Number(match[2]), r: Number(match[3]) }));

describe('the skies the build draws', () => {
  it('project the still view about its centre, as the site drew it before (round 2.9)', () => {
    expect(gnomonic(5.5, 6, PROJECTION, 360, 225)).toEqual([360, 225]);
    // Right ascension grows to the left, declination up.
    const [x, y] = gnomonic(6, 10, PROJECTION, 0, 0) ?? [0, 0];
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
    expect(gnomonic(17.5, -6, PROJECTION, 0, 0)).toBeNull();
  });

  it('place the still view from the centre: each star where the projection put it, its glow inside the image', () => {
    const image = stillImage([[5.5, 6, 0.5, true]], PROJECTION, SIZES, LOOK);
    const [glow, star] = circles(image.svg);
    expect(star?.cx).toBeCloseTo(-image.x, 1);
    expect(star?.cy).toBeCloseTo(-image.y, 1);
    expect(glow?.r).toBeCloseTo(3 * (2.7 - 0.42 * 0.5), 1);
    expect(image.x).toBeLessThanOrEqual(-(glow?.r ?? 0));
    expect(image.svg).toContain('fill="#FFD2A6"');
  });

  it('draw the faint tile and the card at their frames’ sizes', () => {
    expect(faintTile([[10, 20, 0.5, 0.3]], { width: 720, height: 450 }, LOOK)).toMatchObject({ width: 720, height: 450 });
    const card = cardImage([[5.5, 6, 2, false]], [[1, 2, 0.5, 0.2]], { width: 720, height: 520 }, PROJECTION, SIZES, LOOK);
    expect(circles(card.svg).at(-1)).toMatchObject({ cx: 360, cy: 260 });
  });

  it('draw the whole sky one turn wide, the view’s centre at its middle, a star across an edge on both edges', () => {
    const strip = stripImage(
      [
        [5.5, 6, 2, 0.1],
        [17.5, 0, 3, 1.2],
        [5.5, 90, 4, 0.5],
        [5.5, -90, 4, 0.5],
        [1, 1, 6, 0.5],
      ],
      PROJECTION,
      SIZES,
      5,
      LOOK,
      'credit',
    );
    expect(strip.width).toBe(2880);
    expect(strip.x).toBe(-1440);
    const drawn = circles(strip.svg);
    // The centre star at the middle of the strip and on the centre row.
    expect(drawn[0]).toMatchObject({ cx: 1440, cy: strip.centreY });
    // Half a turn away: on both edges, so two strips side by side join.
    expect(drawn.filter((circle) => circle.cy === strip.centreY + 6 * 8).map((circle) => circle.cx).sort((a, b) => a - b)).toEqual([0, 2880]);
    // The poles inside the image; fainter than magnitude 5 left out.
    expect(Math.min(...drawn.map((circle) => circle.cy - circle.r))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...drawn.map((circle) => circle.cy + circle.r))).toBeLessThanOrEqual(strip.height);
    expect(drawn).toHaveLength(5);
    expect(strip.svg).toContain('<!-- credit -->');
  });
});
