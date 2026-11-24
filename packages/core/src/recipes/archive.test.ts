/**
 * The owner's recipe archive (docs/recipes), checked as recipe-check.py checks it, as permanent tests (owner,
 * 2026-11-24: "Keep recipe-check.py's validation, feature checks and safety tests as permanent tests"). The checker
 * writes the archive's schema and its eight recipes; these tests run its checks on what it wrote, with the site's
 * own validator (no dependency): every recipe passes the archive's schema; every id it refers to and every slot it
 * uses exists; at most six scenery layers and one subject; beams that cannot overlap; a subject's stages at least
 * a minute of the measure apart; and the 64 features the plan gives the eight modes. Then:
 *
 * - the standard modes' recipes in the archive are the ones the site ships (for the standard modes the frames are
 *   the source of truth, and the corrected recipes were written back into the archive; plan version 13);
 * - every recipe the site ships passes the archive's schema too, so the site's own schema (what its pieces draw)
 *   is never wider than the archive's;
 * - the archive's safety cases: each a valid recipe with one thing wrong, refused by the archive's schema.
 */

import { describe, expect, it } from 'vitest';
import ARCHIVE_SCHEMA from '../../../../docs/recipes/mode-recipe-1.schema.json' with { type: 'json' };
import ANALOG from '../../../../docs/recipes/recipes/analog.json' with { type: 'json' };
import DIGITS from '../../../../docs/recipes/recipes/digits.json' with { type: 'json' };
import HEIGHT from '../../../../docs/recipes/recipes/height.json' with { type: 'json' };
import INTERSTELLAR from '../../../../docs/recipes/recipes/interstellar.json' with { type: 'json' };
import OCEAN from '../../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import RING from '../../../../docs/recipes/recipes/ring.json' with { type: 'json' };
import TIMELINE from '../../../../docs/recipes/recipes/timeline.json' with { type: 'json' };
import TREE from '../../../../docs/recipes/recipes/tree.json' with { type: 'json' };
import SHIPPED_ANALOG from '../../../../packages/core/src/recipes/shipped/analog.json' with { type: 'json' };
import SHIPPED_DIGITS from '../../../../packages/core/src/recipes/shipped/digits.json' with { type: 'json' };
import SHIPPED_HEIGHT from '../../../../packages/core/src/recipes/shipped/height.json' with { type: 'json' };
import SHIPPED_INTERSTELLAR from '../../../../packages/core/src/recipes/shipped/interstellar.json' with { type: 'json' };
import SHIPPED_OCEAN from '../../../../packages/core/src/recipes/shipped/ocean-depth.json' with { type: 'json' };
import SHIPPED_RING from '../../../../packages/core/src/recipes/shipped/ring.json' with { type: 'json' };
import SHIPPED_TIMELINE from '../../../../packages/core/src/recipes/shipped/timeline.json' with { type: 'json' };
import SHIPPED_TREE from '../../../../packages/core/src/recipes/shipped/tree.json' with { type: 'json' };
import { SchemaValidator, jsonEqual } from './validate.ts';

const ARCHIVE: Readonly<Record<string, unknown>> = { digits: DIGITS, ring: RING, timeline: TIMELINE, analog: ANALOG, 'ocean-depth': OCEAN, height: HEIGHT, tree: TREE, interstellar: INTERSTELLAR };
const SHIPPED: Readonly<Record<string, unknown>> = {
  digits: SHIPPED_DIGITS,
  ring: SHIPPED_RING,
  timeline: SHIPPED_TIMELINE,
  analog: SHIPPED_ANALOG,
  'ocean-depth': SHIPPED_OCEAN,
  height: SHIPPED_HEIGHT,
  tree: SHIPPED_TREE,
  interstellar: SHIPPED_INTERSTELLAR,
};
const IDS = Object.keys(ARCHIVE);
const STANDARD = ['digits', 'ring', 'timeline', 'analog'];

type Data = Readonly<Record<string, unknown>>;
const isData = (value: unknown): value is Data => typeof value === 'object' && value !== null && !Array.isArray(value);
const data = (value: unknown): Data => {
  if (!isData(value)) throw new Error('not an object');
  return value;
};
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
/** The value at a path of keys and indexes, or undefined. */
function at(value: unknown, ...path: readonly (string | number)[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof key === 'number') current = list(current)[key];
    else current = isData(current) ? current[key] : undefined;
    if (current === undefined) return undefined;
  }
  return current;
}
const num = (value: unknown): number => (typeof value === 'number' ? value : Number.NaN);
/** A recipe's layers of one type, in order (recipe-check.py's L). */
const L = (recipe: unknown, type: string): Data[] => list(at(recipe, 'layers')).filter(isData).filter((layer) => layer['type'] === type);
const byId = (layers: readonly Data[], id: string): Data | undefined => layers.find((layer) => layer['id'] === id);
const same = (a: unknown, b: unknown): boolean => jsonEqual(a, b);

describe("the owner's recipe archive (recipe-check.py's checks)", () => {
  const validator = new SchemaValidator(ARCHIVE_SCHEMA);

  for (const id of IDS) {
    const recipe = ARCHIVE[id];

    it(`${id} passes the archive's schema`, () => {
      expect(validator.validate(recipe)).toEqual([]);
    });

    it(`${id} refers only to layers it has, and uses only slots it declares`, () => {
      const ids = new Set(list(at(recipe, 'layers')).map((layer) => at(layer, 'id')));
      const refs: unknown[] = [];
      for (const state of Object.values(isData(at(recipe, 'states')) ? data(at(recipe, 'states')) : {})) {
        const blur = at(state, 'blur');
        if (Array.isArray(blur)) refs.push(...list(blur));
        refs.push(...list(at(state, 'show')));
      }
      refs.push(...list(at(recipe, 'results', 'show')), ...list(at(recipe, 'results', 'view', 'layers')));
      refs.push(...list(at(recipe, 'results', 'finale')).filter((finale) => at(finale, 'type') === 'show').map((finale) => at(finale, 'layer')));
      for (const option of list(at(recipe, 'options'))) refs.push(...list(at(option, 'toggles')));
      expect(refs.filter((ref) => !ids.has(ref))).toEqual([]);

      const slots = new Set(list(at(recipe, 'slots')).map((slot) => at(slot, 'id')));
      const used: unknown[] = [];
      for (const layer of list(at(recipe, 'layers'))) {
        used.push(at(layer, 'slot'));
        for (const item of list(at(layer, 'items'))) if (isData(item) && 'slot' in item) used.push(item['slot']);
        const catalog = at(layer, 'catalogByZone');
        if (isData(catalog)) for (const entries of Object.values(catalog)) used.push(...list(entries));
      }
      expect(used.filter((slot) => slot !== undefined && !slots.has(slot))).toEqual([]);
    });

    it(`${id} keeps within the budgets: six scenery layers, one subject, beams apart, stages a minute apart`, () => {
      expect(L(recipe, 'scenery').length).toBeLessThanOrEqual(6);
      expect(L(recipe, 'subject').length).toBeLessThanOrEqual(1);
      for (const layer of list(at(recipe, 'layers'))) {
        if (at(layer, 'shape') !== 'beam' || at(layer, 'noOverlap') !== true) continue;
        const gap = (num(at(layer, 'spread', 1)) - num(at(layer, 'spread', 0))) / (num(at(layer, 'lanes')) - 1);
        expect(num(at(layer, 'widths', 1))).toBeLessThan(gap);
      }
      const stages = L(recipe, 'subject')
        .flatMap((subject) => list(subject['stages']).map((stage) => num(at(stage, 'from'))))
        .sort((a, b) => a - b);
      const perMinute = num(at(recipe, 'measure', 'perMinute'));
      for (let index = 1; index < stages.length; index += 1) expect(num(stages[index]) - num(stages[index - 1])).toBeGreaterThanOrEqual(perMinute);
    });
  }

  for (const [id, features] of Object.entries(COVER()))
    for (const [name, test] of features)
      it(`${id}: ${name}`, () => {
        expect(test(ARCHIVE[id])).toBe(true);
      });

  it('checks the 64 features recipe-check.py checks', () => {
    expect(Object.values(COVER()).reduce((sum, features) => sum + features.length, 0)).toBe(64);
  });
});

describe('the archive and the site', () => {
  for (const id of STANDARD)
    it(`the standard ${id} recipe is the one the site ships (the frames win)`, () => {
      expect(same(ARCHIVE[id], SHIPPED[id])).toBe(true);
    });

  const validator = new SchemaValidator(ARCHIVE_SCHEMA);
  for (const id of IDS)
    it(`the shipped ${id} recipe passes the archive's schema: the site's schema is no wider`, () => {
      expect(validator.validate(SHIPPED[id])).toEqual([]);
    });
});

describe("the archive's safety cases: each refused by its schema", () => {
  const validator = new SchemaValidator(ARCHIVE_SCHEMA);
  /** A part of a copied recipe, to change. */
  const record = (value: unknown): Record<string, unknown> => {
    if (!isData(value)) throw new Error('not an object');
    return value;
  };
  const mutate = (id: string, change: (recipe: Record<string, unknown>) => void): unknown => {
    const copy = JSON.parse(JSON.stringify(ARCHIVE[id])) as Record<string, unknown>;
    change(copy);
    return copy;
  };
  const layer = (recipe: Record<string, unknown>, type: string): Record<string, unknown> => {
    const found = list(recipe['layers']).find((candidate) => at(candidate, 'type') === type);
    return record(found);
  };
  // mode-recipes.md, Safety: "The checker's negative tests (...) must all be rejected; keep them as tests", and the
  // cinematic additions' (a streamer flood, a 1000 Hz wingbeat, a flood of glare ghosts, a 5000 px tilt, unknown
  // flight fields, too many stages); and a flight pattern step that is both a flap and a glide, or neither.
  const CASES: readonly (readonly [string, () => unknown])[] = [
    ['a script in a name', () => mutate('ring', (r) => (r['name'] = '<script>alert(1)</script>'))],
    ['an unknown placeholder', () => mutate('ocean-depth', (r) => (record(r['states'])['paused'] = { caption: '{constructor}' }))],
    ['a url() colour', () => mutate('ring', (r) => (layer(r, 'ring')['fill'] = 'url(https://example.com/x)'))],
    ['a slot default from outside the site', () => mutate('tree', (r) => (r['slots'] = [{ id: 'tree.strip', kind: 'image-strip', default: 'https://example.com/x.png' }]))],
    ['an event-handler field', () => mutate('digits', (r) => (layer(r, 'time')['onclick'] = 'alert(1)'))],
    ['an unknown piece type', () => mutate('digits', (r) => (r['layers'] = [...list(r['layers']), { type: 'script', id: 'x' }]))],
    ['a formula', () => mutate('tree', (r) => (layer(r, 'tree')['growth'] = { by: 'measure', stops: [[0, 0.45], [60, 1]], formula: 'x*2' }))],
    ['too many layers', () => mutate('digits', (r) => (r['layers'] = Array.from({ length: 25 }, (_, index) => ({ type: 'time', id: `t${String(index)}` }))))],
    ['a particle flood', () => mutate('interstellar', (r) => (layer(r, 'particles')['maxAtOnce'] = 500))],
    ['path traversal in a slot id', () => mutate('tree', (r) => (r['slots'] = [{ id: '../../etc', kind: 'image-strip', default: 'builtin:tree/strip' }]))],
    ['an oversized image', () => mutate('tree', (r) => (r['slots'] = [{ id: 'tree.strip', kind: 'image-strip', default: 'builtin:tree/strip', size: [10000, 10000] }]))],
    ['an over-long replay', () => mutate('digits', (r) => (record(r['results'])['replay'] = { seconds: 60, easing: 'fast' }))],
    ['a streamer flood', () => mutate('height', (r) => (record(record(list(layer(r, 'subject')['stages'])[0])['streamers'])['count'] = 50))],
    ['a 1000 Hz wingbeat', () => mutate('height', (r) => (record(layer(r, 'subject')['flight'])['flapHz'] = 1000))],
    ['a flood of glare ghosts', () => mutate('height', (r) => (layer(r, 'glare')['ghosts'] = Array.from({ length: 20 }, () => [10, 10, 10])))],
    ['a 5000 px tilt', () => mutate('height', (r) => (record(record(r['camera'])['tilt'])['px'] = 5000))],
    ['an unknown flight field', () => mutate('height', (r) => (record(layer(r, 'subject')['flight'])['hover'] = true))],
    ['too many stages', () => mutate('height', (r) => (layer(r, 'subject')['stages'] = Array.from({ length: 7 }, (_, index) => ({ from: 11300 + index * 1000 }))))],
    ['a flight pattern step that is both a flap and a glide', () => mutate('height', (r) => (record(layer(r, 'subject')['flight'])['pattern'] = [{ flap: 1, glide: 60 }]))],
    ['a flight pattern step that is neither', () => mutate('height', (r) => (record(layer(r, 'subject')['flight'])['pattern'] = [{}]))],
  ];
  for (const [name, make] of CASES)
    it(name, () => {
      expect(validator.validate(make())).not.toEqual([]);
    });
});

/** recipe-check.py's COVER: every feature the plan gives each mode, as the checker tests it. */
function COVER(): Readonly<Record<string, readonly (readonly [string, (recipe: unknown) => boolean])[]>> {
  const first = (r: unknown, type: string): Data => L(r, type)[0] ?? {};
  return {
    digits: [
      ['seconds blur-away follows the setting', (r) => first(r, 'time')['seconds'] === 'setting'],
      ['whole display blurs on pause', (r) => at(r, 'states', 'paused', 'blur') === 'display'],
      ['focus strip replay, 1.4 s fast', (r) => at(r, 'results', 'view', 'type') === 'strip' && same(at(r, 'results', 'replay'), { seconds: 1.4, easing: 'fast', longSessionExtra: true })],
    ],
    ring: [
      ['one turn an hour', (r) => at(r, 'cycles', 0, 'minutes') === 60],
      ['55° tail that grows in and fades', (r) => same(first(r, 'ring')['tail'], { degrees: 55, growIn: true, fade: 'ease' })],
      ['round head', (r) => num(at(first(r, 'ring'), 'head', 'size')) > 0],
      ['the shared 260 px dial', (r) => 2 * num(first(r, 'ring')['radius']) + num(first(r, 'ring')['thickness']) === 260],
      ['rings-per-hour replay behind the hand, tighter past 6 h', (r) => same(at(r, 'results', 'view'), { type: 'rings-per-hour', hand: true, fitAfterHours: 6 })],
    ],
    timeline: [
      ['compact 360 px track, 10 px a minute', (r) => first(r, 'track')['width'] === 360 && first(r, 'track')['pxPerMinute'] === 10],
      ['faded ends, nothing before start', (r) => first(r, 'track')['fadeEnds'] === true && first(r, 'track')['drawBeforeStart'] === false],
      ['personal record marker', (r) => at(first(r, 'track'), 'marker', 'source') === 'personal-record'],
      ['the shared 48 px time above the track', (r) => !('size' in first(r, 'time')) && first(r, 'time')['position'] === 'top'],
    ],
    analog: [
      ['one turn an hour, labels every 5 minutes', (r) => at(first(r, 'dial'), 'labels', 'count') === 12],
      ['hours subdial', (r) => at(first(r, 'dial'), 'subdials', 0, 'cycle') === 'half-day'],
      ['accent hand', (r) => at(first(r, 'dial'), 'hand', 'color') === 'theme.accent'],
      ['the shared 260 px dial', (r) => first(r, 'dial')['radius'] === 130],
    ],
    'ocean-depth': [
      ['idle: calm water whose middle is where the dive begins', (r) => same(at(byId(L(r, 'shape'), 'calm'), 'fill', 'linear', 1), [0.45, '#1F6485'])],
      ['idle: a glow drifting and breathing on slow loops', (r) => at(byId(L(r, 'shape'), 'glow'), 'x', 'by') === 'cycle:glow-drift'],
      ['idle: marine snow in three depths, sinking and swaying', (r) => same(at(byId(L(r, 'particles'), 'snow'), 'field', 'crossSeconds'), [90, 60, 38])],
      ['the light model dimmed for readable text, the same idle and running', (r) => at(r, 'environment', 'dim') === 0.6],
      ['15 m a minute to 10,935 m', (r) => at(r, 'measure', 'perMinute') === 15 && at(r, 'measure', 'max') === 10935],
      ['light model with ±6 m gradient', (r) => at(r, 'environment', 'spread') === 6],
      ['text switches for contrast', (r) => at(r, 'contrast', 'auto') === true],
      [
        'ocean life by zone on pause at 3 distances, leaving on resume',
        (r) => at(byId(L(r, 'particles'), 'ocean-life'), 'depths') === 3 && at(byId(L(r, 'particles'), 'ocean-life'), 'leaveOnResume') === true,
      ],
      ['paused caption', (r) => String(at(r, 'states', 'paused', 'caption')).includes('{zone}')],
      ['lit results from the session-end colour', (r) => at(r, 'results', 'card', 'startFrom') === 'session-end'],
      ['things rise past on results', (r) => first(r, 'passing')['direction'] === 'up'],
      ['sonar ping finale', (r) => at(r, 'results', 'finale', 0, 'type') === 'ping'],
      [
        '≤2 landmarks per 1,000 m, ≤6, pop, fade, hover',
        (r) => {
          const landmarks = first(r, 'landmarks');
          return same(landmarks['perBand'], { size: 1000, max: 2 }) && landmarks['maxTotal'] === 6 && ['pop', 'fadeAfterReplay', 'hover'].every((key) => at(landmarks, 'labels', key) === true);
        },
      ],
      ['3 s gentle replay', (r) => at(r, 'results', 'replay', 'easing') === 'gentle'],
      ['ocean life and landmark switches', (r) => same(list(at(r, 'options')).map((option) => at(option, 'id')), ['ocean-life', 'landmarks'])],
    ],
    height: [
      ['140 m a minute to 100 km', (r) => at(r, 'measure', 'perMinute') === 140 && at(r, 'measure', 'max') === 100000],
      ['painted sky by altitude', (r) => at(r, 'environment', 'by') === 'measure' && list(at(r, 'environment', 'stops')).length === 7],
      ['camera follows the falcon, critically damped', (r) => at(r, 'camera', 'type') === 'rig' && same(at(r, 'camera', 'follow'), { subject: 'falcon', damping: 0.9 })],
      ['camera tilts up 170 px over 2.5 s, deepening the sky', (r) => at(r, 'camera', 'tilt', 'px') === 170 && at(r, 'camera', 'tilt', 'over') === 2.5 && at(r, 'camera', 'tilt', 'skyShift') === 2600],
      ['sun lives in the sky and moves only with the tilt', (r) => first(r, 'shape')['space'] === 'sky'],
      ['four landscape layers at their distances, repeating sideways', (r) => same(L(r, 'scenery').map((layer) => layer['distance']), [40, 19, 13.5, 10]) && L(r, 'scenery').every((layer) => layer['tileX'] === true)],
      ['landscape fades into haze from 90 to 310 m', (r) => L(r, 'scenery').every((layer) => same(at(layer, 'opacity', 'stops'), [[90, 1], [310, 0]]))],
      ['falcon, one colour, about 20 px', (r) => same(first(r, 'subject')['art'], { preset: 'falcon', color: '#2B303B' }) && first(r, 'subject')['size'] === 20],
      ['enters from the left half a second after start', (r) => num(at(first(r, 'subject'), 'entry', 'from', 0)) < 0 && at(first(r, 'subject'), 'entry', 'delay') === 0.5],
      ['keeps its speed, turns into a thermal, climbs at the measure', (r) => same(first(r, 'subject')['motion'], { forwardSpeed: 200, forwardDecay: 3, climbFrom: 'measure', climbRamp: 2 })],
      [
        '2.2 beats a second, 1 s flapping per 60 s gliding, steady position',
        (r) => at(first(r, 'subject'), 'flight', 'flapHz') === 2.2 && same(at(first(r, 'subject'), 'flight', 'pattern'), [{ flap: 1 }, { glide: 60 }]) && at(first(r, 'subject'), 'flight', 'steady') === true,
      ],
      ['small irregular corrections while gliding', (r) => num(at(first(r, 'subject'), 'flight', 'glideWobble')) > 0],
      [
        'above 11,300 m: a glowing white angel with three streamers',
        (r) => at(first(r, 'subject'), 'stages', 0, 'from') === 11300 && at(first(r, 'subject'), 'stages', 0, 'color') === '#FFFFFF' && at(first(r, 'subject'), 'stages', 0, 'streamers', 'count') === 3,
      ],
      ['glare in circles, tied to the tilt', (r) => first(r, 'glare')['trigger'] === 'tilt' && list(first(r, 'glare')['ghosts']).length === 6],
      ['paused: the scene freezes', (r) => at(r, 'states', 'paused', 'freeze') === true],
      ['stars above 18 km', (r) => same(at(first(r, 'starfield'), 'opacity', 'stops'), [[18000, 0], [42000, 1]])],
      ['results kept: profile, lit card, things passing, horizon, landmarks', (r) => same(at(r, 'results', 'view'), { type: 'profile', direction: 'up' }) && same(at(r, 'results', 'show'), ['stars', 'passing', 'horizon', 'landmarks'])],
      ['own landmarks switch', (r) => at(r, 'options', 0, 'id') === 'landmarks'],
    ],
    tree: [
      ['one year an hour, four seasons', (r) => at(r, 'cycles', 0, 'minutes') === 60 && list(at(r, 'cycles', 0, 'phases')).length === 4],
      ['side and isometric views', (r) => same([...new Set(L(r, 'tree').map((layer) => layer['view']))].sort(), ['isometric', 'side'])],
      ["leaf colours per season, cluster offsets up to a quarter season, all fallen by autumn's end", (r) => at(first(r, 'tree'), 'leaves', 'offsetMax') === 0.25 && at(first(r, 'tree'), 'leaves', 'fallBy') === 'autumn-end'],
      ['snow on branches and ground', (r) => at(first(r, 'tree'), 'snow', 'branches') === true],
      ['grows to full size at 60 minutes', (r) => same(list(at(first(r, 'tree'), 'growth', 'stops')).at(-1), [60, 1])],
      ['your own season strip instead', (r) => first(r, 'sprite')['frames'] === 4 && at(r, 'slots', 0, 'kind') === 'image-strip'],
    ],
    interstellar: [
      ['light speed from Earth', (r) => at(r, 'measure', 'perMinute') === 0.1202 && at(r, 'measure', 'start') === 1],
      ['follow-and-zoom camera', (r) => at(r, 'camera', 'type') === 'follow-zoom' && at(r, 'camera', 'usable') === 0.85],
      ['orbits fade below 6 px', (r) => first(r, 'circles')['fadeBelowPx'] === 6],
      ['landmarks on the travel line', (r) => first(r, 'landmarks')['anchor'] === 'path'],
      ['comets away from the Sun, varied, ~1 per 5 s', (r) => first(r, 'particles')['orient'] === 'away-from-anchor' && first(r, 'particles')['maxAtOnce'] === 2],
      ['sky turns while paused', (r) => at(first(r, 'starfield'), 'pan', 'turnMinutes') === 6],
      ['paused caption with distance', (r) => String(at(r, 'states', 'paused', 'caption')).includes('{distance}')],
      ['test flag', (r) => at(r, 'visibility') === 'test'],
      ['journey replay with the camera', (r) => at(r, 'results', 'view', 'camera') === true],
    ],
  };
}
