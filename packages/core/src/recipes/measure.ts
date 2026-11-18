/**
 * What a recipe's numbers mean as time passes (docs/recipes/mode-recipes.md): the measure focused time becomes,
 * the zone it is in, where a cycle is, a binding's value, and the light-falloff environment's colour. Pure
 * functions of a checked recipe, so every piece reads them the same way and the results replay can recompute
 * them for any moment of a session.
 */

import { CONFIG } from '../config.ts';
import { attenuated, contrast as contrastRatio, hex, parseHexColour } from '../modes/light.ts';
import type { LinearRgb } from '../modes/light.ts';
import type { ReplayTiming } from '../replay.ts';
import type { Binding, Contrast, Cycle, Environment, Measure, Recipe, Source, Zone } from './types.ts';

const MINUTE_MS = 60_000;

/** The measure after `focusedMs` of focus: start plus the rate, continuous, stopping at the maximum. */
export function measureAt(measure: Measure, focusedMs: number): number {
  const value = (measure.start ?? 0) + (Math.max(0, focusedMs) / MINUTE_MS) * measure.perMinute;
  return measure.max === undefined ? value : Math.min(measure.max, value);
}

/** The focused time at which the measure reaches `value` (the inverse of measureAt, before the maximum). */
export function focusFor(measure: Measure, value: number): number {
  return ((value - (measure.start ?? 0)) / measure.perMinute) * MINUTE_MS;
}

/** The zone `value` is in: the last whose start it has reached (the first, above them all). */
export function zoneAt(zones: readonly Zone[], value: number): Zone | undefined {
  let found = zones[0];
  for (const zone of zones) if (value >= zone[2]) found = zone;
  return found;
}

/** Where `focusedMs` is in a cycle, as a share of it from 0 (inclusive) to 1. */
export function cycleShare(cycle: Cycle, focusedMs: number): number {
  const length = cycle.minutes * MINUTE_MS;
  const into = Math.max(0, focusedMs) % length;
  return into / length;
}

/** The phase of `cycle` that `share` is in (its id), if it has phases. */
export function phaseAt(cycle: Cycle, share: number): string | undefined {
  return cycle.phases?.find(([, from, to]) => share >= from && share < to)?.[0];
}

export function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** What a binding follows, at one moment. */
export interface BindingInputs {
  readonly measure: number;
  readonly progress?: number;
  /** Each cycle's share, by id. */
  readonly cycles?: Readonly<Record<string, number>>;
}

export function sourceValue(source: Source, inputs: BindingInputs): number {
  if (source === 'measure') return inputs.measure;
  if (source === 'progress') return inputs.progress ?? 1;
  return inputs.cycles?.[source.slice('cycle:'.length)] ?? 0;
}

/**
 * A binding's value: a plain number as it is; otherwise the stops' value at what it follows, held at the first
 * and last stops, linear or smoothstepped between neighbours.
 */
export function bindingAt(binding: Binding, inputs: BindingInputs): number {
  if (typeof binding === 'number') return binding;
  return stopsAt(binding.stops, sourceValue(binding.by, inputs), binding.ease ?? 'linear');
}

export function stopsAt(stops: readonly (readonly [number, number])[], at: number, ease: 'linear' | 'smooth' = 'linear'): number {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (at <= first[0]) return first[1];
  if (at >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i += 1) {
    const [x1, y1] = stops[i] ?? last;
    const [x0, y0] = stops[i - 1] ?? first;
    if (at <= x1) {
      const t = (at - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (ease === 'smooth' ? smoothstep(t) : t);
    }
  }
  return last[1];
}

type LightFalloff = Extract<Environment, { readonly type: 'light-falloff' }>;

/** The per-unit falloff of a light-falloff environment: K over its distance scale. */
function perUnit(environment: LightFalloff): LinearRgb {
  const per = environment.per ?? 1;
  return environment.k.map((k) => k / per) as unknown as LinearRgb;
}

/**
 * The light-falloff environment's colour at `value` (sRGB hex): linear RGB base × e^(−K·value/per), clamped to
 * the measure's range, as the ocean and height frames compute it. `dim` scales the base (the results card).
 */
export function lightColour(environment: LightFalloff, measure: Measure, value: number, dim = 1): `#${string}` {
  const low = measure.start ?? 0;
  const clamped = Math.max(low, measure.max === undefined ? value : Math.min(measure.max, value));
  const base = environment.base.map((channel) => channel * dim) as unknown as LinearRgb;
  return hex(attenuated(base, perUnit(environment), clamped));
}

/** The recipe's environment colour at `value`, or undefined for the theme's. */
export function environmentColour(recipe: Recipe, value: number, dim = 1): `#${string}` | undefined {
  const environment = recipe.environment;
  if (environment === undefined || environment.type === 'theme') return undefined;
  if (environment.type === 'light-falloff') return lightColour(environment, recipe.measure, value, dim);
  const stops = environment.stops;
  const index = stops.findIndex(([at]) => at > value);
  const pick = index === -1 ? stops[stops.length - 1] : stops[Math.max(0, index - 1)];
  return pick?.[1] as `#${string}` | undefined;
}

/** The contrast rule for text over a colour (plan, Themes): at least 4.5:1. */
export const TEXT_CONTRAST = 4.5;

/**
 * Which of a recipe's text colours to use over `background`: the light one while it meets the contrast rule,
 * else the dark one when that does, else whichever contrasts more (plan: "whichever meets the contrast rule").
 * With `auto` off, always the light one, unless it fails the rule and the dark one meets it: the rule is
 * enforced whatever a recipe asks for.
 */
export function contrastText(contrast: Contrast | undefined, background: string, fallback: { readonly light: string; readonly dark: string }): string {
  const light = contrast?.light?.startsWith('#') === true ? contrast.light : fallback.light;
  const dark = contrast?.dark?.startsWith('#') === true ? contrast.dark : fallback.dark;
  const back = parseHexColour(background);
  const lightRatio = contrastRatio(parseHexColour(light), back);
  if (lightRatio >= TEXT_CONTRAST) return light;
  const darkRatio = contrastRatio(parseHexColour(dark), back);
  if (darkRatio >= TEXT_CONTRAST) return dark;
  return darkRatio > lightRatio ? dark : light;
}

/** The recipe's measure as at most `decimals` places (0 by default), for captions. */
export function measureText(measure: Measure, value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: measure.decimals ?? 0 }).format(value);
}

export const RECIPE_MINUTE_MS = MINUTE_MS;

/** A recipe's results replay: its length, its curve and whether long sessions lengthen it. */
export function replayTimingFor(recipe: Recipe): ReplayTiming {
  const { seconds, easing, longSessionExtra } = recipe.results.replay;
  return { durationMs: seconds * 1000, easing: CONFIG.motion.replayEasing[easing], longSessionExtra: longSessionExtra ?? true };
}
