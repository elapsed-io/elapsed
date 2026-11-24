import { describe, expect, it } from 'vitest';
import LIBRARY from './library.ts?raw';
import { CAMERA_SOURCE, ENVIRONMENT_SOURCES, MODE_BUILD, PIECE_SOURCES, VIEW_SOURCES } from '../sources.ts';
import { MODE_MANIFESTS } from '../manifests.ts';

const RECIPES: Readonly<Record<string, unknown>> = import.meta.glob('../../../../../packages/core/src/recipes/shipped/*.json', { eager: true, import: 'default' });
const web = (relative: string): string => relative.replace(/^\.\.\//, 'src/modes/').replace(/^\.\//, 'src/modes/recipe/');

describe('the build’s list of what each mode fetches', () => {
  it('names the modules the library fetches, and no others', () => {
    const library = LIBRARY;
    const fetched = new Set([...library.matchAll(/import\('([^']+)'\)/g), ...library.matchAll(/from '(\.\.\/pieces\/[^']+)'/g)].map((match) => web(match[1] ?? '')));
    const listed = new Set([...Object.values(PIECE_SOURCES), ...Object.values(ENVIRONMENT_SOURCES), ...Object.values(VIEW_SOURCES), CAMERA_SOURCE]);
    expect([...fetched].sort()).toEqual([...listed].sort());
  });

  it('knows every mode’s recipe and whether it draws its own environment, as its descriptor says', async () => {
    const { BUILT_IN_MODES } = await import('./built-in-modes.test-helper.ts');
    expect(Object.keys(MODE_BUILD).sort()).toEqual(MODE_MANIFESTS.map((manifest) => manifest.id).sort());
    for (const mode of BUILT_IN_MODES) {
      const build = MODE_BUILD[mode.id];
      expect(build?.environment, mode.id).toBe(mode.environment !== false);
      const file = RECIPES[`../../../${build?.recipe ?? ''}`];
      expect(file, mode.id).toBeDefined();
      expect(file, mode.id).toEqual(mode.recipe);
    }
  });
});
