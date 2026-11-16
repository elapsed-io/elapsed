import { CONFIG, checkRecipe } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';
import { describe, expect, it } from 'vitest';
import HEIGHT from '../../../../../docs/recipes/recipes/height.json' with { type: 'json' };
import OCEAN from '../../../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import { optionValues, resultsLayers } from '../recipe/recipe-mode.ts';
import { Slots } from '../recipe/slots.ts';
import { profileSpec } from './profile.ts';

const load = (value: unknown): Recipe => {
  const result = checkRecipe(value, { builtIn: true });
  if (!result.ok) throw new Error(result.problems.join('; '));
  return result.recipe;
};

async function spec(recipe: Recipe, art: Record<string, () => Promise<never>>) {
  return profileSpec(recipe, resultsLayers(recipe, optionValues(recipe)), new Slots(recipe, { art }));
}

describe('the profile view from a recipe', () => {
  it('passes the ocean frame’s things where the frame puts them', async () => {
    const ocean = load(OCEAN);
    const built = await spec(ocean, { 'passing/': async () => (await import('../../art/ocean/passing.ts')).OCEAN_PASSING as never });
    expect(built.passing.things.map(({ key, from, span, peak, leftPx }) => ({ key, from, span, peak, leftPx }))).toEqual(CONFIG.modes.ocean.results.passing.things.map(({ key, from, span, peak, leftPx }) => ({ key, from, span, peak, leftPx })));
    expect(built.chart.zoneLines.names).toEqual(['twilight zone', 'midnight zone', 'abyssal zone']);
    expect(built.valueClass).toBe('profile__depth');
    expect(built.lit.crossfadeMs).toBe(CONFIG.modes.ocean.results.lit.crossfadeMs);
  });

  it('passes the height frame’s things, the clouds at the frame’s sizes', async () => {
    const height = load(HEIGHT);
    const results = async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS as never;
    const built = await spec(height, { 'passing/': results, 'sky/stars-card': results });
    expect(built.passing.things).toEqual(CONFIG.modes.height.results.passing.things);
    expect(built.direction).toBe('up');
    expect(built.chart.zoneLines.names).toEqual(['stratosphere', 'mesosphere', 'thermosphere']);
  });
});
