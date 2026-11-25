import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import DIGITS from '../../../packages/core/src/recipes/shipped/digits.json' with { type: 'json' };
import { checkRecipes } from './plugins.ts';

/** Runs the plugin's build start as Vite would, collecting what it refuses. */
function build(folder?: string): string[] {
  const errors: string[] = [];
  const plugin = checkRecipes(folder);
  const start = plugin.buildStart as (this: { error: (message: string) => never }) => void;
  start.call({
    error: (message: string) => {
      errors.push(message);
      throw new Error(message);
    },
  });
  return errors;
}

describe('built-in recipes are checked when the site is built (round 2.8)', () => {
  it('passes the recipes the site ships', () => {
    expect(build()).toEqual([]);
  });

  it('stops the build on a recipe the loader would refuse, naming it and its problems', () => {
    const folder = mkdtempSync(join(tmpdir(), 'recipes-'));
    try {
      writeFileSync(join(folder, 'bad.json'), JSON.stringify({ ...DIGITS, name: '<script>' }));
      expect(() => build(`${folder}/`)).toThrow(/built-in recipe bad\.json is refused: .*name/);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
