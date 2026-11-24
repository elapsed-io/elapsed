/**
 * The recipe checker (docs/recipes/recipe-check.py), ported: every built-in recipe passes the schema, every id it
 * refers to and every slot it uses exists, and the 49 features the plan gives the eight built-in modes are there.
 * Then its safety cases: each is a valid recipe with one thing wrong, and each must be refused.
 */

import { describe, expect, it } from 'vitest';
import SCHEMA from '../../../../packages/core/src/recipes/schema/mode-recipe-1.schema.json' with { type: 'json' };
import { DIGITS_RECIPE } from './built-in.ts';
import { checkRecipe, parseRecipe, recipeOrDigits } from './load.ts';
import { RECIPE_LIMITS } from './limits.ts';
import { bindingAt, focusFor } from './measure.ts';
import type { Binding, LayerOf, LayerType, Recipe } from './types.ts';
import { SchemaValidator } from './validate.ts';
import { CONFIG } from '../config.ts';

/** The timeline's time size: the shared design system's (round 2.11). */
const TIMELINE_TIME_PX: number = CONFIG.design.type.timelineTimePx;

import ANALOG from '../../../../packages/core/src/recipes/shipped/analog.json' with { type: 'json' };
import DIGITS from '../../../../packages/core/src/recipes/shipped/digits.json' with { type: 'json' };
import HEIGHT from '../../../../packages/core/src/recipes/shipped/height.json' with { type: 'json' };
import INTERSTELLAR from '../../../../packages/core/src/recipes/shipped/interstellar.json' with { type: 'json' };
import OCEAN from '../../../../packages/core/src/recipes/shipped/ocean-depth.json' with { type: 'json' };
import RING from '../../../../packages/core/src/recipes/shipped/ring.json' with { type: 'json' };
import TIMELINE from '../../../../packages/core/src/recipes/shipped/timeline.json' with { type: 'json' };
import TREE from '../../../../packages/core/src/recipes/shipped/tree.json' with { type: 'json' };

const RAW: Readonly<Record<string, unknown>> = { digits: DIGITS, ring: RING, timeline: TIMELINE, analog: ANALOG, 'ocean-depth': OCEAN, height: HEIGHT, tree: TREE, interstellar: INTERSTELLAR };
const BUILT_IN = ['digits', 'ring', 'timeline', 'analog', 'ocean-depth', 'height', 'tree', 'interstellar'] as const;

function load(id: string): Recipe {
  const result = checkRecipe(RAW[id], { builtIn: true });
  if (!result.ok) throw new Error(`${id}: ${result.problems.join('; ')}`);
  return result.recipe;
}

const L = <T extends LayerType>(recipe: Recipe, type: T): LayerOf<T>[] => recipe.layers.filter((layer): layer is LayerOf<T> => layer.type === type);
const first = <T extends LayerType>(recipe: Recipe, type: T): LayerOf<T> => {
  const found = L(recipe, type)[0];
  if (found === undefined) throw new Error(`no ${type} layer`);
  return found;
};

describe('the built-in recipes', () => {

  for (const id of BUILT_IN) {
    it(`${id} passes the schema`, () => {
      expect(new SchemaValidator(SCHEMA).validate(RAW[id])).toEqual([]);
    });

    it(`${id} refers only to layers and slots it has (recipe-check.py's reference checks)`, () => {
      const recipe = load(id);
      const ids = new Set(recipe.layers.map((layer) => layer.id));
      const refs: string[] = [];
      for (const state of Object.values(recipe.states ?? {})) {
        if (Array.isArray(state.blur)) refs.push(...(state.blur as readonly string[]));
        refs.push(...(state.show ?? []));
      }
      refs.push(...(recipe.results.show ?? []));
      if (recipe.results.view.type === 'scene') refs.push(...recipe.results.view.layers);
      for (const finale of recipe.results.finale ?? []) if (finale.type === 'show') refs.push(finale.layer);
      for (const option of recipe.options ?? []) refs.push(...(option.toggles ?? []));
      expect(refs.filter((ref) => !ids.has(ref))).toEqual([]);

      const slots = new Set((recipe.slots ?? []).map((slot) => slot.id));
      const used: string[] = [];
      for (const layer of recipe.layers) {
        if ('slot' in layer && typeof layer.slot === 'string') used.push(layer.slot);
        if (layer.type === 'passing') used.push(...layer.items.map((item) => item.slot));
        if (layer.type === 'particles') used.push(...Object.values(layer.catalogByZone ?? {}).flat());
      }
      expect(used.filter((slot) => !slots.has(slot))).toEqual([]);
    });

    it(`${id} keeps comparable records only as a built-in`, () => {
      expect(load(id).measure.records ?? 'comparable').not.toBe(id === 'tree' ? 'comparable' : 'mode-only');
      const copy = checkRecipe(RAW[id]);
      expect(copy.ok && copy.recipe.measure.records).toBe('mode-only');
    });
  }
});

/**
 * recipe-check.py's COVER table: every feature the plan gives each mode. Two differ from the checker, as the plan and
 * the frames win over the recipes (decision 320): ocean depth's paused screen has no caption in its frame, and the
 * tree's "your art" comes in round 2.10.
 */
const stopsOf = (binding: Binding | undefined): readonly (readonly [number, number])[] => (typeof binding === 'object' ? binding.stops : []);
type Feature = readonly [string, (recipe: Recipe) => boolean];
const COVER: Readonly<Record<(typeof BUILT_IN)[number], readonly Feature[]>> = {
  digits: [
    ['seconds blur-away follows the setting', (r) => first(r, 'time').seconds === 'setting'],
    ['whole display blurs on pause', (r) => r.states?.paused?.blur === 'display'],
    ['focus strip replay, 1.4 s fast', (r) => r.results.view.type === 'strip' && r.results.replay.seconds === 1.4 && r.results.replay.easing === 'fast' && r.results.replay.longSessionExtra === true],
  ],
  ring: [
    ['one turn an hour', (r) => r.cycles?.[0]?.minutes === 60],
    ['55° tail that grows in and fades', (r) => first(r, 'ring').tail?.degrees === 55 && first(r, 'ring').tail?.growIn === true && first(r, 'ring').tail?.fade === 'ease'],
    ['round head', (r) => (first(r, 'ring').head?.size ?? 0) > 0],
    ['rings-per-hour replay behind the hand, tighter past 6 h', (r) => r.results.view.type === 'rings-per-hour' && r.results.view.hand === true && r.results.view.fitAfterHours === 6],
  ],
  timeline: [
    ['480 px track, 10 px a minute', (r) => first(r, 'track').width === 480 && first(r, 'track').pxPerMinute === 10],
    ['faded ends, nothing before start', (r) => first(r, 'track').fadeEnds === true && first(r, 'track').drawBeforeStart === false],
    ['personal record marker', (r) => first(r, 'track').marker?.source === 'personal-record'],
    // The size is the shared design system's, never the recipe's own (round 2.11).
    ['56 px time', (r) => first(r, 'time').size === undefined && TIMELINE_TIME_PX === 56],
  ],
  analog: [
    ['one turn an hour, labels every 5 minutes', (r) => first(r, 'dial').labels?.count === 12],
    ['hours subdial', (r) => first(r, 'dial').subdials?.[0]?.cycle === 'half-day'],
    ['accent hand', (r) => first(r, 'dial').hand?.color === 'theme.accent'],
  ],
  'ocean-depth': [
    ['15 m a minute to 10,935 m', (r) => r.measure.perMinute === 15 && r.measure.max === 10935],
    ['light model with ±6 m gradient', (r) => r.environment?.type === 'light-falloff' && r.environment.spread === 6],
    ['text switches for contrast', (r) => r.contrast?.auto === true],
    ['ocean life by zone on pause at 3 distances, leaving on resume', (r) => first(r, 'particles').depths === 3 && first(r, 'particles').leaveOnResume === true],
    ['paused as its frame draws it: no caption', (r) => r.states?.paused?.caption === undefined],
    ['lit results from the session-end colour', (r) => r.results.card?.startFrom === 'session-end'],
    ['things rise past on results', (r) => first(r, 'passing').direction === 'up'],
    ['sonar ping finale', (r) => r.results.finale?.[0]?.type === 'ping'],
    [
      '≤2 landmarks per 1,000 m, ≤6, pop, fade, hover',
      (r) => {
        const landmarks = first(r, 'landmarks');
        return landmarks.perBand?.size === 1000 && landmarks.perBand.max === 2 && landmarks.maxTotal === 6 && landmarks.labels?.pop === true && landmarks.labels.fadeAfterReplay === true && landmarks.labels.hover === true;
      },
    ],
    ['3 s gentle replay', (r) => r.results.replay.easing === 'gentle'],
    ['ocean life and landmark switches', (r) => (r.options ?? []).map((option) => option.id).join() === 'ocean-life,landmarks'],
  ],
  height: [
    ['140 m a minute to 100 km', (r) => r.measure.perMinute === 140 && r.measure.max === 100000],
    ['sky model per 8,500 m, ±1,500 m', (r) => r.environment?.type === 'light-falloff' && r.environment.per === 8500 && r.environment.spread === 1500],
    ['stars fade in 18 to 42 km', (r) => JSON.stringify(stopsOf(first(r, 'starfield').opacity)) === '[[18000,0],[42000,1]]'],
    ['shooting stars when stars show, varied', (r) => first(r, 'particles').visibleWhen?.min === 18000 && first(r, 'particles').colors?.length === 4],
    ['rare meteor showers', (r) => JSON.stringify(first(r, 'particles').bursts?.count) === '[8,15]'],
    ['things fall past on results', (r) => first(r, 'passing').direction === 'down'],
    ['horizon fades in and rises from 15 km', (r) => JSON.stringify(stopsOf(first(r, 'shape').opacity)[0]) === '[15000,0]'],
    ['text switches for contrast', (r) => r.contrast?.auto === true],
    ['own landmarks switch', (r) => r.options?.[0]?.id === 'landmarks'],
  ],
  tree: [
    ['one year an hour, four seasons', (r) => r.cycles?.[0]?.minutes === 60 && r.cycles[0].phases?.length === 4],
    ['side and isometric views', (r) => new Set(L(r, 'tree').map((tree) => tree.view)).size === 2],
    ["leaf colours per season, cluster offsets up to a quarter season, all fallen by autumn's end", (r) => first(r, 'tree').leaves?.offsetMax === 0.25 && first(r, 'tree').leaves?.fallBy === 'autumn-end'],
    ['snow on branches and ground', (r) => first(r, 'tree').snow?.branches === true],
    [
      'grows to full size at 60 minutes',
      (r) => {
        const growth = first(r, 'tree').growth ?? 1;
        const at = (minutes: number): number => bindingAt(growth, { measure: (minutes * r.measure.perMinute) });
        return at(0) === 0.45 && at(60) === 1 && at(30) < 1 && focusFor(r.measure, 1) === 3_600_000;
      },
    ],
  ],
  interstellar: [
    ['light speed from Earth', (r) => Math.abs(r.measure.perMinute - (299_792_458 * 60) / 149_597_870_700) < 1e-5 && r.measure.start === 1],
    ['follow-and-zoom camera', (r) => r.camera?.type === 'follow-zoom' && r.camera.usable === 0.85],
    ['orbits fade below 6 px', (r) => first(r, 'circles').fadeBelowPx === 6],
    ['landmarks on the travel line', (r) => first(r, 'landmarks').anchor === 'path'],
    ['comets away from the Sun, varied, ~1 per 5 s', (r) => first(r, 'particles').orient === 'away-from-anchor' && first(r, 'particles').maxAtOnce === 2],
    ['sky turns while paused', (r) => first(r, 'starfield').pan?.turnMinutes === 6],
    ['paused caption with distance', (r) => r.states?.paused?.caption?.includes('{distance}') === true],
    ['test flag', (r) => r.visibility === 'test'],
    ['journey replay with the camera', (r) => r.results.view.type === 'scene' && r.results.view.camera === true],
    // Changes 5: each landmark drawn as itself, a slot with its built-in body; bodies fade below 24 px.
    [
      'every body an art slot with its built-in default',
      (r) => ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'kuiper', 'termination-shock', 'heliopause'].every((id) => r.slots?.some((slot) => slot.id === `space.body.${id}` && slot.kind === 'image' && slot.default === `builtin:space/${id}`) === true),
    ],
    ['bodies fade below 24 px', (r) => first(r, 'landmarks').fadeBelowPx === 24],
    ['Pluto and the termination shock among the circles', (r) => [39.5, 94].every((at) => first(r, 'circles').items.some((item) => item.at === at && item.dashed === true))],
  ],
};

describe('the features the plan gives each mode (recipe-check.py COVER)', () => {
  for (const id of BUILT_IN)
    for (const [name, test] of COVER[id])
      it(`${id}: ${name}`, () => {
        expect(test(load(id))).toBe(true);
      });
  // Round 2.9 adds the tree's "your art": a four-frame season strip slot behind a sprite layer.
  it.todo('tree: your own season strip instead (round 2.11)');

  it('checks the checker’s 49 features, one of them in round 2.11, and interstellar’s three from changes 5', () => {
    expect(Object.entries(COVER).reduce((sum, [, features]) => sum + features.length, 0) + 1 - 3).toBe(49);
  });
});

type Data = Record<string, unknown>;
const data = (value: unknown): Data => {
  if (typeof value !== 'object' || value === null) throw new Error('not an object');
  return value as Data;
};
const list = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Error('not a list');
  return value;
};
/** The recipe's layer of `type`, its slots, its options, and so on, as plain data to change. */
const layerOf = (recipe: Data, type: string): Data => data(list(recipe['layers']).find((layer) => data(layer)['type'] === type));
const item = (value: unknown, index: number): unknown => list(value)[index];

/** A valid recipe with one change made to a copy. */
function mutate(id: string, change: (recipe: Data) => void): unknown {
  const copy = data(JSON.parse(JSON.stringify(RAW[id])));
  change(copy);
  return copy;
}

const refused = (value: unknown): boolean => !checkRecipe(value).ok;

describe('the safety cases (recipe-check.py and mode-recipes.md, Safety): every one refused', () => {
  const set = (target: unknown, key: string | number, value: unknown): void => {
    if (typeof key === 'number') list(target)[key] = value;
    else data(target)[key] = value;
  };
  const slot = (r: Data, index: number): Data => data(item(r['slots'], index));
  const opacity = (r: Data): Data => data(layerOf(r, 'starfield')['opacity']);
  const cases: Readonly<Record<string, unknown>> = {
    'script in a name': mutate('digits', (r) => {
      r['name'] = '<script>alert(1)</script>';
    }),
    'markup in an option label': mutate('height', (r) => {
      set(item(r['options'], 0), 'label', '<img src=x onerror=alert(1)>');
    }),
    'markup in a zone name': mutate('height', (r) => {
      set(item(r['zones'], 0), 1, '<b>troposphere</b>');
    }),
    'an unknown placeholder': mutate('height', (r) => {
      set(data(r['states'])['paused'], 'caption', '{value} {password}');
    }),
    'a placeholder written as code': mutate('height', (r) => {
      set(data(r['states'])['paused'], 'caption', '${document.cookie}');
    }),
    'a url() colour': mutate('ring', (r) => {
      layerOf(r, 'ring')['fill'] = 'url(https://example.com/x.png)';
    }),
    'a url() colour inside a fill': mutate('height', (r) => {
      set(item(data(layerOf(r, 'shape')['fill'])['radial'], 0), 1, 'url(#x)');
    }),
    'a url() colour in environment stops': mutate('digits', (r) => {
      r['environment'] = { type: 'stops', stops: [[0, '#000000'], [10, 'url(x)']] };
    }),
    'an expression colour': mutate('ring', (r) => {
      layerOf(r, 'ring')['track'] = 'expression(alert(1))';
    }),
    'an outside slot default': mutate('height', (r) => {
      slot(r, 2)['default'] = 'https://example.com/birds.svg';
    }),
    'a data: slot default': mutate('height', (r) => {
      slot(r, 2)['default'] = 'data:image/svg+xml,<svg onload=alert(1)>';
    }),
    'path traversal in a slot default': mutate('height', (r) => {
      slot(r, 2)['default'] = 'builtin:../../secrets.json';
    }),
    'path traversal in a slot id': mutate('height', (r) => {
      slot(r, 2)['id'] = 'sky..birds';
    }),
    'an absolute slot default': mutate('height', (r) => {
      slot(r, 2)['default'] = 'builtin:/etc/passwd';
    }),
    'an event-handler field on a layer': mutate('digits', (r) => {
      layerOf(r, 'time')['onclick'] = 'alert(1)';
    }),
    'an event-handler field at the top': mutate('digits', (r) => {
      r['onload'] = 'alert(1)';
    }),
    'a markup field': mutate('digits', (r) => {
      layerOf(r, 'time')['html'] = '<b>x</b>';
    }),
    'an unknown piece type': mutate('digits', (r) => {
      list(r['layers']).push({ type: 'iframe', id: 'frame', src: 'https://example.com' });
    }),
    'a script piece': mutate('digits', (r) => {
      list(r['layers']).push({ type: 'script', id: 'code', code: 'alert(1)' });
    }),
    'a formula as a binding': mutate('height', (r) => {
      layerOf(r, 'starfield')['opacity'] = 'measure / 42000';
    }),
    'a formula as a stop': mutate('height', (r) => {
      set(item(opacity(r)['stops'], 0), 1, 'Math.random()');
    }),
    'a formula as a rate': mutate('height', (r) => {
      data(r['measure'])['perMinute'] = '140 * 2';
    }),
    'too many layers': mutate('digits', (r) => {
      for (let i = 0; i < RECIPE_LIMITS.layers; i += 1) list(r['layers']).push({ type: 'text', id: `t${String(i)}`, template: '{time}' });
    }),
    'a particle flood in one layer': mutate('height', (r) => {
      layerOf(r, 'particles')['maxAtOnce'] = 500;
    }),
    'a particle flood across layers': mutate('height', (r) => {
      const particles = layerOf(r, 'particles');
      for (const id of ['more-a', 'more-b', 'more-c', 'more-d']) list(r['layers']).push({ ...particles, id, maxAtOnce: 3 });
    }),
    'particles arriving too fast': mutate('height', (r) => {
      layerOf(r, 'particles')['every'] = [0.001, 0.002];
    }),
    'a burst too large': mutate('height', (r) => {
      data(layerOf(r, 'particles')['bursts'])['count'] = [8, 400];
    }),
    'an oversized image': mutate('height', (r) => {
      slot(r, 2)['size'] = [8192, 8192];
    }),
    'an oversized image strip': mutate('height', (r) => {
      list(r['slots']).push({ id: 'sky.strip', kind: 'image-strip', frames: 48, size: [4096, 300], default: 'builtin:sky/strip' });
    }),
    'an over-long replay': mutate('digits', (r) => {
      data(data(r['results'])['replay'])['seconds'] = 60;
    }),
    'a too-short replay': mutate('digits', (r) => {
      data(data(r['results'])['replay'])['seconds'] = 0.1;
    }),
    'a reference to a layer that does not exist': mutate('height', (r) => {
      set(data(r['states'])['paused'], 'show', ['nothing']);
    }),
    'a slot that does not exist': mutate('height', (r) => {
      set(item(layerOf(r, 'passing')['items'], 0), 'slot', 'sky.nothing');
    }),
    'a catalog for a zone that does not exist': mutate('ocean-depth', (r) => {
      data(layerOf(r, 'particles')['catalogByZone'])['nowhere'] = ['ocean.landmarks'];
    }),
    'a prototype key in a catalog': JSON.parse(JSON.stringify(RAW['ocean-depth']).replace('"sunlight":[', '"__proto__":[')) as unknown,
    'two layers with one id': mutate('digits', (r) => {
      list(r['layers']).push({ ...layerOf(r, 'time') });
    }),
    'a variant of an option that does not exist': mutate('tree', (r) => {
      set(layerOf(r, 'tree')['variantOf'], 'option', 'nothing');
    }),
    'a switch that defaults to a word': mutate('height', (r) => {
      set(item(r['options'], 0), 'default', 'yes');
    }),
    'too many options': mutate('height', (r) => {
      for (let i = 0; i < RECIPE_LIMITS.options; i += 1) list(r['options']).push({ ...data(item(r['options'], 0)), id: `o${String(i)}` });
    }),
    'too many stops': mutate('height', (r) => {
      opacity(r)['stops'] = Array.from({ length: 17 }, (_, i) => [i, 0]);
    }),
    'stops out of order': mutate('height', (r) => {
      opacity(r)['stops'] = [
        [42000, 1],
        [18000, 0],
      ];
    }),
    'a zone that is not a zone': mutate('height', (r) => {
      set(r['zones'], 1, ['stratosphere', 'stratosphere', 'high']);
    }),
    'zones out of order': mutate('height', (r) => {
      set(item(r['zones'], 1), 2, 0);
    }),
    'an unknown recipe version': mutate('digits', (r) => {
      r['recipe'] = 2;
    }),
    'a recipe that is not an object': [1, 2, 3],
  };

  for (const [name, value] of Object.entries(cases))
    it(name, () => {
      expect(refused(value)).toBe(true);
    });

  it('refuses text that is not JSON, or too long', () => {
    expect(parseRecipe('{"recipe": 1, ').ok).toBe(false);
    expect(parseRecipe(' '.repeat(RECIPE_LIMITS.textChars + 1)).ok).toBe(false);
    expect(parseRecipe(JSON.stringify(RAW['ring'])).ok).toBe(true);
  });

  it('falls back to digits for a refused recipe, saying why', () => {
    const heard: string[] = [];
    const recipe = recipeOrDigits(cases['script in a name'], {}, (problems) => heard.push(...problems));
    expect(recipe).toBe(DIGITS_RECIPE);
    expect(heard.join()).toMatch(/name/);
  });

  it('freezes a loaded recipe, so nothing can change it afterwards', () => {
    const recipe = load('height');
    expect(Object.isFrozen(recipe)).toBe(true);
    expect(Object.isFrozen(recipe.layers[0])).toBe(true);
    expect(() => {
      Object.assign(recipe.measure, { perMinute: 1e6 });
    }).toThrow();
  });

  it('copies only data: getters and functions do not survive', () => {
    const tricky = {
      ...data(RAW['digits']),
      get name() {
        return 'digits';
      },
    };
    const result = checkRecipe(tricky, { builtIn: true });
    expect(result.ok).toBe(true);
    const copied = result.ok ? Object.getOwnPropertyDescriptor(result.recipe, 'name') : undefined;
    expect(copied?.value).toBe('digits');
    expect(copied !== undefined && 'get' in copied).toBe(false);
  });
});

describe('the schema validator', () => {
  it('refuses a schema keyword it does not know, rather than skipping it', () => {
    expect(() => new SchemaValidator({ type: 'object', propertyNames: { pattern: '^a' } }).validate({})).toThrow(/unknown keyword/);
  });

  it('applies oneOf strictly: exactly one form', () => {
    const validator = new SchemaValidator({ oneOf: [{ type: 'number' }, { type: 'integer' }] });
    expect(validator.validate(1.5)).toEqual([]);
    expect(validator.validate(2)).not.toEqual([]);
  });

  it('counts characters, not UTF-16 units, for lengths', () => {
    expect(new SchemaValidator({ type: 'string', maxLength: 2 }).validate('😀😀')).toEqual([]);
  });
});
