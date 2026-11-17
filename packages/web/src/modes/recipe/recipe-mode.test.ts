import { DIGITS_RECIPE, checkRecipe } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';
import { describe, expect, it } from 'vitest';
import HEIGHT from '../../../../../docs/recipes/recipes/height.json' with { type: 'json' };
import OCEAN from '../../../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import RING from '../../../../../docs/recipes/recipes/ring.json' with { type: 'json' };
import TREE from '../../../../../docs/recipes/recipes/tree.json' with { type: 'json' };
import { DIGITS_LIBRARY, builtInMode } from '../built-in/built-in.ts';
import { bindingCss } from './binding-css.ts';
import { captionText, displayLayers, optionValues, resultsLayers } from './recipe-mode.ts';

const load = (value: unknown): Recipe => {
  const result = checkRecipe(value, { builtIn: true });
  if (!result.ok) throw new Error(result.problems.join('; '));
  return result.recipe;
};
const ids = (layers: readonly { readonly id: string }[]): string[] => layers.map((layer) => layer.id);

describe('a mode built from its recipe', () => {
  it('draws its built-in recipe as the build checked it (round 2.8: refused recipes stop the build, build/recipes.test.ts)', () => {
    const mode = builtInMode('ring', RING, { pieces: {}, view: DIGITS_LIBRARY.view })();
    expect(mode.id).toBe('ring');
    expect(mode.replayLayout).toBe('ring');
    expect(mode.replayTiming.durationMs).toBe(RING.results.replay.seconds * 1000);
    expect(Object.isFrozen(RING.layers)).toBe(true);
    expect(DIGITS_RECIPE.id).toBe('digits');
  });

  it('takes its replay and its results layout from the recipe', () => {
    const mode = builtInMode('ocean', OCEAN, { pieces: {}, view: DIGITS_LIBRARY.view })();
    expect(mode.replayTiming).toEqual({ durationMs: 3000, easing: [0.33, 1, 0.68, 1], longSessionExtra: true });
    expect(mode.replayLayout).toBe('chart');
  });
});

describe('options', () => {
  const ocean = load(OCEAN);
  const tree = load(TREE);

  it('take what the site holds where the recipe offers it, else the default', () => {
    expect(optionValues(ocean, {})).toEqual({ 'ocean-life': true, landmarks: true });
    expect(optionValues(ocean, { 'ocean-life': false, landmarks: 'no', other: true })).toEqual({ 'ocean-life': false, landmarks: true });
    expect(optionValues(tree, { 'tree-view': 'isometric' })).toEqual({ 'tree-view': 'isometric' });
    expect(optionValues(tree, { 'tree-view': 'sideways' })).toEqual({ 'tree-view': 'side' });
  });

  it('choose between variants and switch layers off', () => {
    expect(ids(displayLayers(tree, { 'tree-view': 'side' }))).toEqual(['tree-side', 'time']);
    expect(ids(displayLayers(tree, { 'tree-view': 'isometric' }))).toEqual(['tree-isometric', 'time']);
    expect(ids(displayLayers(ocean, { 'ocean-life': false, landmarks: true }))).toEqual(['time']);
    expect(ids(resultsLayers(ocean, { 'ocean-life': true, landmarks: false }))).toEqual(['passing']);
  });

  it('draw the results scene as its frame does, whichever view the timer shows', () => {
    expect(ids(resultsLayers(tree, { 'tree-view': 'isometric' }))).toEqual(['tree-side']);
  });
});

describe('captions', () => {
  it('fill only the recipe placeholders, as text', () => {
    const height = load(HEIGHT);
    const template = height.states?.paused?.caption ?? '';
    expect(captionText(height, template, 31_240)).toBe('31,240 m · stratosphere');
    expect(captionText(height, template, 0)).toBe('0 m · troposphere');
  });
});

describe('bindings as CSS', () => {
  it('are stops of the value, linear or smoothstepped, and numbers only', () => {
    expect(bindingCss(0.5, 'var(--pd)')).toBe('0.5');
    expect(
      bindingCss(
        {
          by: 'measure',
          stops: [
            [0, 0.45],
            [1, 1],
          ],
          ease: 'linear',
        },
        'var(--x)',
      ),
    ).toBe('calc(0.45 + 0.55 * clamp(0, (var(--x) - 0) / 1, 1))');
    expect(
      bindingCss(
        {
          by: 'measure',
          stops: [
            [15000, 530],
            [23000, 460],
          ],
          ease: 'smooth',
        },
        'var(--pd)',
      ),
    ).toBe('calc(530 + -70 * clamp(0, (var(--pd) - 15000) / 8000, 1) * clamp(0, (var(--pd) - 15000) / 8000, 1) * (3 - 2 * clamp(0, (var(--pd) - 15000) / 8000, 1)))');
  });
});

describe('the manifests', () => {
  it('declare the art each recipe’s slots hold, and the tree piece’s own drawing', async () => {
    const { MODE_MANIFESTS, recipeArt } = await import('../manifests.ts');
    const files: Record<string, unknown> = {
      digits: (await import('../../../../../docs/recipes/recipes/digits.json', { with: { type: 'json' } })).default,
      ring: RING,
      timeline: (await import('../../../../../docs/recipes/recipes/timeline.json', { with: { type: 'json' } })).default,
      analog: (await import('../../../../../docs/recipes/recipes/analog.json', { with: { type: 'json' } })).default,
      ocean: OCEAN,
      height: HEIGHT,
      tree: TREE,
      calendar: (await import('../../../../../docs/recipes/recipes/calendar.json', { with: { type: 'json' } })).default,
    };
    for (const manifest of MODE_MANIFESTS) {
      const own = recipeArt(files[manifest.id] as object);
      expect([...manifest.art].sort().filter((key) => manifest.id !== 'tree' || !key.startsWith('tree/')), manifest.id).toEqual(own.sort());
    }
  });
});
