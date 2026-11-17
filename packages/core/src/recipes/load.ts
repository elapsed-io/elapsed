/**
 * The recipe loader (plan-release-2, round 2.7): a recipe is checked when it loads (built-in recipes when the site
 * is built, built-in.ts), against the schema (docs/recipes/mode-recipe-1.schema.json) and then against what a schema cannot say: every id it
 * refers to exists, tuples hold what they should, colours inside them are colours, slot defaults are built-in
 * assets with no way out of their folder, and nothing exceeds the runtime limits (limits.ts). A recipe that fails
 * is refused whole; the site shows digits instead (recipeOrDigits).
 *
 * A loaded recipe is a deep copy, frozen, so nothing that held the original can change it afterwards.
 */

import SCHEMA from '../../../../docs/recipes/mode-recipe-1.schema.json' with { type: 'json' };
import { DIGITS_RECIPE, deepFreeze } from './built-in.ts';
import { CALENDAR_PLACES } from './calendar.ts';
import { RECIPE_LIMITS as LIMITS } from './limits.ts';
import type { Binding, Recipe } from './types.ts';
import { SchemaValidator } from './validate.ts';

export type RecipeResult = { readonly ok: true; readonly recipe: Recipe } | { readonly ok: false; readonly problems: readonly string[] };

export interface LoadOptions {
  /**
   * A built-in recipe (shipped with the site). Only these keep `comparable` records; anything else is
   * `mode-only` whatever it says (plan-release-2, round 2.7, Records).
   */
  readonly builtIn?: boolean;
}

/** Built on first use, so a page that loads no recipe but its built-in ones never builds it. */
let validator: SchemaValidator | null = null;

const ID = /^[a-z][a-z0-9-]{0,31}$/;
const COLOUR = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const TOKENS = new Set(['theme.bg', 'theme.text', 'theme.accent', 'theme.muted', 'theme.faint', 'theme.track', 'theme.gray', 'theme.end', 'theme.pr', 'theme.red', 'contrast.text', 'contrast.muted']);
const LABEL = /^[^<>{}]{0,48}$/;
/** A built-in asset's path: folders and a file name of lowercase letters, digits and hyphens, one extension at most. */
const BUILTIN = /^builtin:([a-z0-9-]+\/){0,4}[a-z0-9-]+(\.[a-z0-9]+)?$/;

const isColour = (value: unknown): boolean => typeof value === 'string' && (COLOUR.test(value) || TOKENS.has(value));
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The ids each kind of reference may name, collected once. */
interface Names {
  readonly layers: ReadonlySet<string>;
  readonly options: ReadonlyMap<string, Recipe['options'] extends readonly (infer O)[] | undefined ? O : never>;
  readonly slots: ReadonlyMap<string, NonNullable<Recipe['slots']>[number]>;
  readonly cycles: ReadonlySet<string>;
  readonly phases: ReadonlySet<string>;
  readonly zones: ReadonlySet<string>;
}

function semanticProblems(recipe: Recipe): string[] {
  const problems: string[] = [];
  const fail = (message: string): void => {
    problems.push(message);
  };
  const unique = (what: string, ids: readonly string[]): Set<string> => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) fail(`${what} ${id} appears twice`);
      seen.add(id);
    }
    return seen;
  };

  // Tuples the schema only counts: zones, phases, colour stops.
  const zones = recipe.zones ?? [];
  zones.forEach((zone, i) => {
    const [id, name, from] = zone as readonly unknown[];
    if (typeof id !== 'string' || !ID.test(id)) fail(`zone ${String(i)} has no valid id`);
    if (typeof name !== 'string' || !LABEL.test(name)) fail(`zone ${String(i)} has no valid name`);
    if (!isNumber(from)) fail(`zone ${String(i)} has no start`);
    const before = zones[i - 1]?.[2];
    if (isNumber(from) && isNumber(before) && from <= before) fail(`zone ${String(i)} starts before the zone above it ends`);
  });
  const phases: string[] = [];
  for (const cycle of recipe.cycles ?? [])
    for (const [i, phase] of (cycle.phases ?? []).entries()) {
      const [id, from, to] = phase as readonly unknown[];
      if (typeof id !== 'string' || !ID.test(id)) fail(`cycle ${cycle.id} phase ${String(i)} has no valid id`);
      else phases.push(id);
      if (!isNumber(from) || !isNumber(to) || from < 0 || to > 1 || from >= to) fail(`cycle ${cycle.id} phase ${String(i)} is not a share of the cycle`);
    }
  const environment = recipe.environment;
  if (environment?.type === 'stops')
    environment.stops.forEach((stop, i) => {
      const [at, colour] = stop as readonly unknown[];
      if (!isNumber(at) || !isColour(colour)) fail(`environment stop ${String(i)} is not a value and a colour`);
      const before = environment.stops[i - 1]?.[0];
      if (isNumber(at) && isNumber(before) && at <= before) fail(`environment stop ${String(i)} is out of order`);
    });

  const names: Names = {
    layers: unique('layer', recipe.layers.map((layer) => layer.id)),
    options: new Map((recipe.options ?? []).map((option) => [option.id, option])),
    slots: new Map((recipe.slots ?? []).map((slot) => [slot.id, slot])),
    cycles: unique('cycle', (recipe.cycles ?? []).map((cycle) => cycle.id)),
    phases: new Set(phases),
    zones: unique('zone', zones.map((zone) => zone[0])),
  };
  unique('option', (recipe.options ?? []).map((option) => option.id));
  unique('slot', (recipe.slots ?? []).map((slot) => slot.id));

  const calendars = new Set((recipe.cycles ?? []).filter((entry) => entry.calendar !== undefined).map((entry) => entry.id));
  const layer = (where: string, id: string): void => {
    if (!names.layers.has(id)) fail(`${where} names a layer that does not exist: ${id}`);
  };
  const cycle = (where: string, id: string): void => {
    if (!names.cycles.has(id)) fail(`${where} names a cycle that does not exist: ${id}`);
  };
  const slot = (where: string, id: string): void => {
    if (!names.slots.has(id)) fail(`${where} names a slot that does not exist: ${id}`);
  };
  const phase = (where: string, id: string): void => {
    if (!names.phases.has(id)) fail(`${where} names a phase that does not exist: ${id}`);
  };
  const range = (where: string, value: readonly number[] | undefined, min = 0): void => {
    if (value === undefined) return;
    const [low, high] = value;
    if (value.length !== 2 || !isNumber(low) || !isNumber(high) || low > high || low < min) fail(`${where} is not a range from ${String(min)} up`);
  };
  const binding = (where: string, value: Binding | undefined): void => {
    if (value === undefined || typeof value === 'number') return;
    if (value.by.startsWith('cycle:')) cycle(where, value.by.slice('cycle:'.length));
    value.stops.forEach(([at], i) => {
      const before = value.stops[i - 1]?.[0];
      if (before !== undefined && at <= before) fail(`${where} stop ${String(i)} is out of order`);
    });
  };

  // States, results and options name layers.
  for (const [state, treatment] of Object.entries(recipe.states ?? {})) {
    if (Array.isArray(treatment.blur)) for (const id of treatment.blur as readonly string[]) layer(`${state} blur`, id);
    for (const id of treatment.show ?? []) layer(`${state} show`, id);
  }
  for (const id of recipe.results.show ?? []) layer('results show', id);
  if (recipe.results.view.type === 'scene') for (const id of recipe.results.view.layers) layer('results view', id);
  for (const finale of recipe.results.finale ?? []) if (finale.type === 'show') layer('finale', finale.layer);
  for (const option of recipe.options ?? []) {
    for (const id of option.toggles ?? []) layer(`option ${option.id}`, id);
    if (option.kind === 'switch' && typeof option.default !== 'boolean') fail(`option ${option.id} is a switch with a default that is not on or off`);
    if (option.kind === 'segmented') {
      const choices = option.choices ?? [];
      if (choices.length < 2) fail(`option ${option.id} offers fewer than two choices`);
      if (typeof option.default !== 'string' || !choices.includes(option.default)) fail(`option ${option.id} defaults to a choice it does not offer`);
    }
  }
  if (recipe.icon?.startsWith('slot:') === true) slot('icon', recipe.icon.slice('slot:'.length));

  // Slots: built-in defaults only, inside their folder; images within the size limit.
  for (const entry of recipe.slots ?? []) {
    if (!BUILTIN.test(entry.default)) fail(`slot ${entry.id} has a default that is not a built-in asset`);
    const [width, height] = entry.size ?? [0, 0];
    if (width > LIMITS.imagePx || height > LIMITS.imagePx) fail(`slot ${entry.id} is larger than ${String(LIMITS.imagePx)} px`);
    if (entry.kind === 'image-strip' && (entry.frames ?? 1) * width > LIMITS.imagePx) fail(`slot ${entry.id} is a strip wider than ${String(LIMITS.imagePx)} px`);
    if (entry.kind !== 'image-strip' && entry.frames !== undefined && entry.frames !== 1) fail(`slot ${entry.id} has frames but is not a strip`);
  }

  // Layers: what each refers to, and what each may cost.
  let particlesAtOnce = 0;
  for (const item of recipe.layers) {
    const where = `layer ${item.id}`;
    binding(`${where} opacity`, item.opacity);
    if (item.variantOf !== undefined) {
      const option = names.options.get(item.variantOf.option);
      if (option === undefined) fail(`${where} is a variant of an option that does not exist: ${item.variantOf.option}`);
      else if (option.kind === 'switch' ? typeof item.variantOf.value !== 'boolean' : !(option.choices ?? []).includes(String(item.variantOf.value)))
        fail(`${where} is a variant for a value its option does not offer`);
    }
    switch (item.type) {
      case 'ring':
        cycle(where, item.cycle);
        break;
      case 'dial':
        cycle(where, item.cycle);
        if (calendars.has(item.cycle)) fail(`${where} turns its main hand by a calendar`);
        for (const subdial of item.subdials ?? []) {
          cycle(`${where} subdial`, subdial.cycle);
          const calendar = calendars.has(subdial.cycle);
          // A calendar subdial says which part it shows, and only a calendar subdial does.
          if (calendar !== (subdial.part !== undefined)) fail(`${where} has a subdial whose part and cycle do not agree`);
          const places = subdial.part === undefined || subdial.part === 'moon' ? undefined : CALENDAR_PLACES[subdial.part];
          if (subdial.names !== undefined && places !== undefined && subdial.names.length !== places) fail(`${where} names ${String(subdial.names.length)} places where its part has ${String(places)}`);
        }
        break;
      case 'tree':
        cycle(where, item.year);
        binding(`${where} growth`, item.growth);
        if (item.snow?.phase !== undefined) phase(`${where} snow`, item.snow.phase);
        break;
      case 'sprite': {
        slot(where, item.slot);
        const strip = names.slots.get(item.slot);
        if (strip !== undefined && (strip.kind !== 'image-strip' || (strip.frames ?? 1) !== item.frames)) fail(`${where} needs an image strip of ${String(item.frames)} frames`);
        if (item.frameBy !== undefined && 'cycle' in item.frameBy) cycle(where, item.frameBy.cycle);
        if (item.frameBy !== undefined && 'zone' in item.frameBy && names.zones.size === 0) fail(`${where} follows zones the recipe does not have`);
        binding(`${where} scale`, item.scale);
        break;
      }
      case 'passing':
        for (const passing of item.items) {
          slot(where, passing.slot);
          if (passing.to <= passing.from) fail(`${where} has an item that ends before it starts`);
        }
        break;
      case 'particles': {
        if (item.slot !== undefined) slot(where, item.slot);
        for (const [zone, slots] of Object.entries(item.catalogByZone ?? {})) {
          if (!names.zones.has(zone)) fail(`${where} has a catalog for a zone that does not exist: ${zone}`);
          for (const id of slots) slot(where, id);
        }
        if (item.shape === 'image' && item.slot === undefined && item.catalogByZone === undefined) fail(`${where} draws images but names none`);
        if (item.visibleWhen?.phase !== undefined) phase(`${where} visibleWhen`, item.visibleWhen.phase);
        if (item.visibleWhen?.by?.startsWith('cycle:') === true) cycle(where, item.visibleWhen.by.slice('cycle:'.length));
        range(`${where} every`, item.every, LIMITS.particleEverySeconds);
        range(`${where} lifetime`, item.lifetime);
        if ((item.lifetime?.[1] ?? 0) > LIMITS.particleLifetimeSeconds) fail(`${where} lives longer than ${String(LIMITS.particleLifetimeSeconds)} s`);
        for (const key of ['length', 'thickness', 'head', 'scale'] as const) range(`${where} size ${key}`, item.size?.[key]);
        range(`${where} distance`, item.distance);
        range(`${where} angle`, item.angle, -360);
        if (item.bursts !== undefined) {
          range(`${where} bursts every`, item.bursts.every, LIMITS.burstEverySeconds);
          range(`${where} bursts count`, item.bursts.count, 1);
          if ((item.bursts.count?.[1] ?? 0) > LIMITS.burstCount) fail(`${where} bursts more than ${String(LIMITS.burstCount)} at once`);
        }
        particlesAtOnce += item.maxAtOnce;
        break;
      }
      case 'starfield':
        slot(where, item.slot);
        if (item.view !== undefined) {
          slot(where, item.view);
          if (names.slots.get(item.view)?.kind !== 'star-catalog') fail(`${where} shows a still view that is not a star catalog`);
        }
        break;
      case 'landmarks':
      case 'reveal':
      case 'image-path':
        slot(where, item.slot);
        if (item.type === 'reveal' || item.type === 'image-path') binding(`${where} by`, item.by);
        break;
      case 'shape':
        binding(`${where} x`, item.x);
        binding(`${where} y`, item.y);
        if (typeof item.fill === 'object')
          item.fill.radial.forEach((stop, i) => {
            const [at, colour] = stop as readonly unknown[];
            if (!isNumber(at) || at < 0 || at > 1 || !isColour(colour)) fail(`${where} fill stop ${String(i)} is not a share and a colour`);
          });
        break;
      default:
        break;
    }
  }
  if (particlesAtOnce > LIMITS.particlesAtOnce) fail(`more than ${String(LIMITS.particlesAtOnce)} particles at once`);
  if (recipe.measure.max !== undefined && recipe.measure.max < (recipe.measure.start ?? 0)) fail('the measure stops before it starts');
  if (!(recipe.measure.perMinute > 0)) fail('the measure never moves');
  return problems;
}

function where(path: readonly (string | number)[]): string {
  return path.length === 0 ? 'the recipe' : path.join('.');
}

/**
 * Checks `value` as a recipe and returns it, copied and frozen, or every problem found. A recipe that is not
 * built in has its records made `mode-only`.
 */
export function checkRecipe(value: unknown, options: LoadOptions = {}): RecipeResult {
  let copy: unknown;
  try {
    // A plain copy: no prototypes, getters or functions survive, only data.
    const text = JSON.stringify(value);
    if (text.length > LIMITS.textChars) return { ok: false, problems: [`longer than ${String(LIMITS.textChars)} characters`] };
    copy = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, problems: ['not data'] };
  }
  validator ??= new SchemaValidator(SCHEMA);
  const schemaProblems = validator.validate(copy);
  if (schemaProblems.length > 0) return { ok: false, problems: schemaProblems.map((problem) => `${where(problem.path)}: ${problem.message}`) };
  const recipe = copy as Recipe;
  const problems = semanticProblems(recipe);
  if (problems.length > 0) return { ok: false, problems };
  const fair = options.builtIn === true ? recipe : { ...recipe, measure: { ...recipe.measure, records: 'mode-only' as const } };
  return { ok: true, recipe: deepFreeze(fair) };
}

/** Parses and checks a recipe file's text. */
export function parseRecipe(text: string, options: LoadOptions = {}): RecipeResult {
  if (text.length > LIMITS.textChars) return { ok: false, problems: [`longer than ${String(LIMITS.textChars)} characters`] };
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, problems: ['not JSON'] };
  }
  return checkRecipe(value, options);
}

/**
 * The recipe to show for `value`: itself once checked, or digits when it is refused (plan-release-2, round 2.7).
 * `refused` hears why.
 */
export function recipeOrDigits(value: unknown, options: LoadOptions = {}, refused?: (problems: readonly string[]) => void): Recipe {
  const result = checkRecipe(value, options);
  if (result.ok) return result.recipe;
  refused?.(result.problems);
  return DIGITS_RECIPE;
}
