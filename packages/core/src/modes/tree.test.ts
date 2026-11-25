import { describe, expect, it } from 'vitest';
import { parseHexColour } from './light.ts';
import { grassColour, grassWeights, leafColour, leafScale, leafState, seasonPhase, shares, stackedColour, weather, yearPhase } from './tree.ts';
import TREE_RECIPE from '../../../../packages/core/src/recipes/shipped/tree.json' with { type: 'json' };
import { checkRecipe } from '../recipes/load.ts';
import { bindingAt, measureAt } from '../recipes/measure.ts';
import { TREE_CONFIG } from './tree-config.ts';

const MINUTE = 60_000;
const TREE = TREE_CONFIG;

// The frames' own functions (ModeTree.dc.html: sm, mix, season, weather), written out again so the module is
// checked against them.
const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hx = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number): string => {
  const A = hx(a);
  const B = hx(b);
  return `#${A.map((v, i) => Math.round(v + ((B[i] ?? 0) - v) * t)
    .toString(16)
    .padStart(2, '0')).join('')}`;
};
function frameSeason(g0: number, o: number): { col: string; p: number } {
  const g = ((g0 % 4) + 4) % 4;
  if (g < 1) return { p: sm((g - o * 0.8) / 0.35), col: mix('#C2DE8E', '#86C060', sm(g)) };
  if (g < 2) return { p: 1, col: mix('#86C060', '#3E8B47', sm((g - 1) / 0.4)) };
  if (g < 3) {
    const turn = sm((g - 2 - o * 0.5) / 0.35);
    return { col: mix(mix('#3E8B47', '#D9822F', turn), '#A9502A', sm((g - 2.5) / 0.4)), p: 1 - sm((g - 2.4 - o * 0.5) / 0.35) };
  }
  return { p: 0, col: '#A9502A' };
}
function frameWeather(g0: number): { snow: number; fall: number; ground: number; grass: string } {
  const g = ((g0 % 4) + 4) % 4;
  return {
    snow: sm((g - 3.05) / 0.2) * (1 - sm((g - 3.75) / 0.2)),
    fall: sm((g - 2.4) / 0.15) * (1 - sm((g - 2.95) / 0.08)),
    ground: sm((g - 2.5) / 0.2) * (1 - sm((g - 3.1) / 0.2)),
    grass: g < 1 ? mix('#8DBF5E', '#5FA84A', g) : g < 2 ? '#4E9A45' : g < 3 ? mix('#4E9A45', '#A39A4E', sm((g - 2) / 0.6)) : '#8E9A78',
  };
}

const PHASES = Array.from({ length: 401 }, (_, i) => i / 100);
const OFFSETS = [0, 0.01, 0.1, 0.22, 0.33, 0.46, 0.49];

describe('tree', () => {
  it('runs a season every 15 focused minutes, a year every hour', () => {
    expect(seasonPhase(0)).toBe(0);
    expect(seasonPhase(15 * MINUTE)).toBe(1);
    expect(seasonPhase(84 * MINUTE)).toBe(5.6);
    expect(yearPhase(5.6)).toBeCloseTo(1.6, 12);
    expect(yearPhase(4)).toBe(0);
  });

  it('gives each cluster the frames’ colour and presence through the year', () => {
    for (const offset of OFFSETS) {
      for (const phase of PHASES) {
        const frame = frameSeason(phase, offset);
        expect(leafColour(phase, offset), `${String(phase)} ${String(offset)}`).toBe(frame.col);
        expect(leafState(phase, offset).presence).toBeCloseTo(frame.p, 12);
      }
    }
  });

  it('stacks the five leaf colours so the crossfade shows the frames’ mix, within the frames’ own rounding', () => {
    for (const offset of OFFSETS) {
      for (const phase of PHASES) {
        const stacked = stackedColour(TREE.leaves, leafState(phase, offset).weights);
        const frame = parseHexColour(frameSeason(phase, offset).col);
        // The frames round each of their nested mixes; the stack does not: at most a level apart per mix.
        for (const i of [0, 1, 2]) expect(Math.abs((stacked[i] ?? 0) - (frame[i] ?? 0)), `${String(phase)} ${String(offset)}`).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('splits a stack into shares that add up to 1 and add up to the stack’s colour', () => {
    for (const offset of OFFSETS) {
      for (const phase of PHASES) {
        const weights = leafState(phase, offset).weights;
        const parts = shares(weights);
        expect(parts.reduce((sum, part) => sum + part, 0)).toBeCloseTo(1, 12);
        const added = [0, 1, 2].map((i) => parts.reduce((sum, part, k) => sum + part * (parseHexColour(TREE.leaves[k] ?? '#000000')[i] ?? 0), 0));
        const stacked = stackedColour(TREE.leaves, weights);
        for (const i of [0, 1, 2]) expect(added[i]).toBeCloseTo(stacked[i] ?? 0, 9);
      }
    }
  });

  it('keeps the weights between 0 and 1, and changes them only where the leaves are gone', () => {
    for (const offset of OFFSETS) {
      let previous = leafState(0, offset);
      for (const phase of PHASES.slice(1)) {
        const state = leafState(phase, offset);
        for (const weight of state.weights) {
          expect(weight).toBeGreaterThanOrEqual(0);
          expect(weight).toBeLessThanOrEqual(1);
        }
        // Continuous from one hundredth of a season to the next, except where the year begins again (leafless).
        const jump = Math.max(...state.weights.map((weight, i) => Math.abs(weight - (previous.weights[i] ?? 0))));
        if (jump > 0.2) expect(state.presence + previous.presence).toBe(0);
        previous = state;
      }
    }
  });

  it('draws clusters from 35 % (side) or 30 % (isometric) of their size, full when present', () => {
    expect(leafScale(0, 'side')).toBe(0.35);
    expect(leafScale(1, 'side')).toBe(1);
    expect(leafScale(0, 'isometric')).toBe(0.3);
    expect(leafScale(1, 'isometric')).toBe(1);
  });

  it('brings snow, falling leaves and fallen leaves as the frames do, and the grass’s colour', () => {
    for (const phase of PHASES) {
      const frame = frameWeather(phase);
      const site = weather(phase);
      expect(site.snow).toBeCloseTo(frame.snow, 12);
      expect(site.fall).toBeCloseTo(frame.fall, 12);
      expect(site.ground).toBeCloseTo(frame.ground, 12);
      expect(grassColour(phase)).toBe(frame.grass);
      const stacked = stackedColour(TREE.grass, grassWeights(phase));
      const grass = parseHexColour(frame.grass);
      for (const i of [0, 1, 2]) expect(Math.abs((stacked[i] ?? 0) - (grass[i] ?? 0))).toBeLessThanOrEqual(0.5);
    }
    // The leaves are all gone before winter begins, and winter has snow.
    for (const offset of OFFSETS) expect(leafState(2.999, offset).presence).toBeLessThan(0.001);
    expect(weather(3.4).snow).toBe(1);
  });

  it('grows the results tree from 45 % to full size at 60 focused minutes (its recipe\'s growth binding)', () => {
    const result = checkRecipe(TREE_RECIPE, { builtIn: true });
    if (!result.ok) throw new Error(result.problems.join('; '));
    const recipe = result.recipe;
    const growth = recipe.layers.find((layer) => layer.type === 'tree')?.growth ?? 1;
    const treeGrowth = (focusedMs: number): number => bindingAt(growth, { measure: measureAt(recipe.measure, focusedMs) });
    expect(treeGrowth(0)).toBe(0.45);
    expect(treeGrowth(30 * MINUTE)).toBeCloseTo(0.725, 12);
    expect(treeGrowth(60 * MINUTE)).toBe(1);
    expect(treeGrowth(167 * MINUTE)).toBe(1);
  });
});
