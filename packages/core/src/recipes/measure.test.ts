import { describe, expect, it } from 'vitest';
import HEIGHT from '../../../../docs/recipes/recipes/height.json' with { type: 'json' };
import OCEAN from '../../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import TREE from '../../../../docs/recipes/recipes/tree.json' with { type: 'json' };
import { heightReached, skyColour, skyLitColour, starsOpacity } from '../modes/height.ts';
import { oceanColour, oceanDepth, oceanLitColour, oceanZone } from '../modes/ocean.ts';
import { checkRecipe } from './load.ts';
import { bindingAt, contrastText, cycleShare, environmentColour, focusFor, measureAt, phaseAt, stopsAt, zoneAt } from './measure.ts';
import type { Recipe } from './types.ts';

const load = (value: unknown): Recipe => {
  const result = checkRecipe(value, { builtIn: true });
  if (!result.ok) throw new Error(result.problems.join('; '));
  return result.recipe;
};
const ocean = load(OCEAN);
const height = load(HEIGHT);
const tree = load(TREE);
const MINUTE = 60_000;

describe('a recipe measure', () => {
  it('is what the built modes computed: ocean depth and height', () => {
    for (const minutes of [0, 0.5, 1, 13.3, 60, 729, 800, 2000]) {
      expect(measureAt(ocean.measure, minutes * MINUTE)).toBeCloseTo(oceanDepth(minutes * MINUTE), 9);
      expect(measureAt(height.measure, minutes * MINUTE)).toBeCloseTo(heightReached(minutes * MINUTE), 9);
    }
  });

  it('inverts to the focus that reaches a value', () => {
    expect(focusFor(height.measure, 140)).toBe(MINUTE);
    expect(focusFor(tree.measure, 1)).toBeCloseTo(60 * MINUTE, 6);
  });

  it('names the zone a value is in, as the built modes did', () => {
    for (const depth of [0, 199, 200, 999, 1000, 3999, 4000, 5999, 6000, 10935]) expect(zoneAt(ocean.zones ?? [], depth)?.[0]).toBe(oceanZone(depth));
  });
});

describe('the light-falloff environment', () => {
  it('draws the colours the ocean and height frames compute, and their dimmed results card', () => {
    for (const depth of [0, 3, 6, 50, 200, 340, 1000, 10935]) {
      expect(environmentColour(ocean, depth)).toBe(oceanColour(depth));
      expect(environmentColour(ocean, depth, 0.8)).toBe(oceanLitColour(depth));
    }
    for (const metres of [0, 1500, 8500, 12000, 42000, 72000, 100000]) {
      expect(environmentColour(height, metres)).toBe(skyColour(metres));
      expect(environmentColour(height, metres, 0.65)).toBe(skyLitColour(metres));
    }
  });
});

describe('bindings', () => {
  it('follow their stops, held at the ends, linear or smooth', () => {
    const stops = [
      [0, 0],
      [10, 1],
    ] as const;
    expect(stopsAt(stops, -5)).toBe(0);
    expect(stopsAt(stops, 2.5)).toBe(0.25);
    expect(stopsAt(stops, 2.5, 'smooth')).toBeCloseTo(0.15625, 9);
    expect(stopsAt(stops, 50)).toBe(1);
  });

  it('give height its stars as the built mode faded them', () => {
    const stars = height.layers.find((layer) => layer.type === 'starfield')?.opacity ?? 0;
    for (const metres of [0, 18000, 20000, 30000, 41999, 42000, 90000]) expect(bindingAt(stars, { measure: metres })).toBeCloseTo(starsOpacity(metres), 9);
  });
});

describe('cycles', () => {
  it('turn once a cycle and name their phases', () => {
    const year = tree.cycles?.[0];
    if (year === undefined) throw new Error('no year');
    expect(cycleShare(year, 0)).toBe(0);
    expect(cycleShare(year, 75 * MINUTE)).toBe(0.25);
    expect(phaseAt(year, cycleShare(year, 10 * MINUTE))).toBe('spring');
    expect(phaseAt(year, cycleShare(year, 50 * MINUTE))).toBe('winter');
  });
});

describe('the contrast switch', () => {
  const fallback = { light: '#FFFFFF', dark: '#000000' };
  it('keeps the light text over a dark background', () => {
    expect(contrastText(height.contrast, skyColour(60000), fallback)).toBe('#EEF4FA');
  });

  it('switches to the dark text where the light one fails the rule and the dark meets it', () => {
    expect(contrastText(height.contrast, skyColour(0), fallback)).toBe('#0E2440');
  });

  it('enforces the rule whatever the recipe asks: a light text that fails switches even without auto', () => {
    expect(contrastText({ light: '#FFFFFF', dark: '#0E2440' }, '#F0F0F0', fallback)).toBe('#0E2440');
  });
});
