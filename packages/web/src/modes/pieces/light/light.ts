/**
 * The light-falloff environment (docs/recipes/mode-recipes.md, `environment`): the background as the plan's light
 * model computes it, linear RGB base × e^(−K·value / per), across ±spread of the measure on the screen (ocean
 * depth's water, height's sky; the "ocean depth, running", "0 to 20 m" and "height" frames).
 *
 * Its direction follows the recipe's results profile: a dive (down) grows down the screen and never shows above
 * its start, so near the surface the window is stretched from it (the "0 to 20 m" frame); a climb (up) grows up the
 * screen, its start's colour continuing below it. The strip of gradient is drawn once a minute from the minute's
 * start to its end, a stop at least every sixth of the spread (rounded down to a power of ten: 1 m under water,
 * 100 m in the sky), so the light model's curve is followed; a linear CSS transform moves it over the minute on its
 * own layer, keyframed finely enough to follow a stretch. Script sets it once a minute and never runs a loop.
 * Paused or waiting for a check-in it holds where it reached; with low power (or reduced motion) it steps once a
 * minute.
 */

import './light.css';
import { environmentColour, measureAt } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import type { Activity, Environment, EnvironmentFactory } from '../../recipe/piece.ts';

const MINUTE_MS = 60_000;
const DRIFT_MS = 250;

interface Light {
  readonly recipe: Recipe;
  readonly down: boolean;
  readonly spread: number;
  readonly step: number;
  readonly start: number;
}

function lightOf(recipe: Recipe): Light {
  const environment = recipe.environment;
  const spread = environment?.type === 'light-falloff' ? (environment.spread ?? 0) : 0;
  const view = recipe.results.view;
  return {
    recipe,
    down: !(view.type === 'profile' && view.direction === 'up'),
    spread: Math.max(spread, 1e-6),
    step: 10 ** Math.floor(Math.log10(Math.max(spread, 1e-6) / 6)),
    start: recipe.measure.start ?? 0,
  };
}

/** The part of the measure the screen shows at `value`: ±spread, a dive never above its start. */
export function lightWindow(light: Light, value: number): { readonly near: number; readonly far: number } {
  return { near: light.down ? Math.max(light.start, value - light.spread) : value - light.spread, far: value + light.spread };
}

/** The environment from `near` to `far` as a CSS gradient, a stop every step (top down for a dive, bottom up for a climb). */
export function lightGradient(light: Light, near: number, far: number): string {
  const span = Math.max(far - near, 1e-6);
  const count = Math.max(1, Math.ceil(span / light.step));
  const stops = Array.from({ length: count + 1 }, (_, i) => {
    const at = Math.min(far, near + (i * span) / count);
    return `${environmentColour(light.recipe, at) ?? '#000000'} ${String(Math.round(((at - near) / span) * 100_000) / 1000)}%`;
  });
  return `linear-gradient(${light.down ? '180deg' : '0deg'}, ${stops.join(', ')})`;
}

/** How finely a dive's first stretch is keyframed (the window grows from one spread to two). */
const ZOOM_STEPS_PER_SPREAD = 48;

/**
 * One minute's glide of a strip drawn from `near` to `far`, as keyframes from `from` to `to`: the window of
 * lightWindow() at every moment. Past the first spread the window only moves; a dive's first spread also
 * stretches it, keyframed finely enough to follow.
 */
export function glideKeyframes(light: Light, from: number, to: number, near: number, far: number): Keyframe[] {
  const span = far - near;
  const sign = light.down ? -1 : 1;
  const frame = (value: number): string => {
    const window = lightWindow(light, value);
    const translate = `translateY(${String(((sign * (window.near - near)) / span) * 100)}%)`;
    // A climb's window never stretches: it only moves.
    return light.down ? `${translate} scaleY(${String((2 * light.spread) / (window.far - window.near))})` : translate;
  };
  const values = [from];
  if (light.down) {
    const step = light.spread / ZOOM_STEPS_PER_SPREAD;
    const edge = light.start + light.spread;
    for (let value = Math.ceil(from / step) * step; value < Math.min(edge, to); value += step) if (value > from) values.push(value);
    if (from < edge && to > edge) values.push(edge);
  }
  values.push(to);
  return values.map((value) => ({ offset: (value - from) / (to - from), transform: frame(value) }));
}

export const lightEnvironment: EnvironmentFactory = ({ doc, recipe, context }) => {
  const light = lightOf(recipe);
  const strip = html(doc, 'div', { class: light.down ? 'light__strip light__strip--still' : 'light__strip light__strip--up light__strip--still' });
  const element = html(doc, 'div', { class: 'light', attrs: { 'aria-hidden': 'true' } }, [strip]);
  let glide: Animation | null = null;
  let glidingMinute: number | null = null;
  let still = '';

  /** Draws the strip from `near` to `far`, the screen showing two spreads of it. */
  const draw = (near: number, far: number, height: number): void => {
    strip.style.setProperty('height', `${String(height)}%`);
    strip.style.setProperty('background-image', lightGradient(light, near, far));
  };

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    if (state !== 'running' || stepped) {
      const value = measureAt(recipe.measure, stepped || state === 'idle' ? minute * MINUTE_MS : focusedMs);
      const key = `${String(value)}/${state}`;
      if (glidingMinute === null && key === still) return;
      glide?.cancel();
      glide = null;
      glidingMinute = null;
      still = key;
      // Standing still: exactly the window at this value, filling the screen.
      const window = lightWindow(light, value);
      strip.classList.add('light__strip--still');
      strip.style.removeProperty('transform');
      draw(window.near, window.far, 100);
      return;
    }
    still = '';
    const from = measureAt(recipe.measure, minute * MINUTE_MS);
    const to = measureAt(recipe.measure, (minute + 1) * MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glide === null || glidingMinute !== minute;
    if (fresh) {
      glide?.cancel();
      glide = null;
      glidingMinute = minute;
      strip.classList.remove('light__strip--still');
      strip.style.removeProperty('transform');
      // At the end of the measure nothing moves any more.
      if (to <= from) {
        const window = lightWindow(light, from);
        draw(window.near, window.far, 100);
        return;
      }
      const near = lightWindow(light, from).near;
      const far = lightWindow(light, to).far;
      draw(near, far, ((far - near) / (2 * light.spread)) * 100);
      glide = strip.animate(glideKeyframes(light, from, to, near, far), { duration: MINUTE_MS, easing: 'linear', fill: 'forwards' });
    }
    if (glide === null) return;
    if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
    if (glide.playState !== 'running') glide.play();
  };

  const environment: Environment = {
    element,
    render({ view, activity, paused }) {
      element.classList.toggle('light--paused', paused);
      place(view.focusedMs, activity);
    },
    unmount() {
      glide?.cancel();
      glide = null;
    },
  };
  return environment;
};
