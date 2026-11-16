/**
 * The contrast switch (plan, Display modes; owner, changes 3: "where the sky, or the water near the surface, is
 * bright, switch the time, icons and labels from white to deep navy, whichever meets the contrast rule, crossfading
 * as it darkens"). The rule asks 4.5:1 of labels and 3:1 of the large time and of icons (plan, Themes; WCAG 2.2).
 * At each value of the measure, each scheme scores its weakest element's share of what it needs; the site shows the
 * scheme that scores higher, switching where they cross. It switches at once, when the display next redraws: a
 * crossfade would animate colour, which the plan's motion rule does not allow (a question for the owner,
 * decision 327). The rule holds whatever a recipe asks: a recipe over an environment always has the switch.
 */

import { contrast, environmentColour, parseHexColour } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';

const TEXT = 4.5;
const LARGE = 3;

export interface Chrome {
  readonly text: string;
  readonly icon: string;
  readonly label: string;
}

/** Whether the chrome shows its dark colour at each value of the recipe's measure (1) or its light ones (0). */
export function contrastSwitch(recipe: Recipe, chrome: Chrome): ((value: number) => number) | null {
  const dark = recipe.contrast?.dark;
  if (recipe.environment === undefined || recipe.environment.type === 'theme' || dark === undefined || !dark.startsWith('#')) return null;
  const ratio = (colour: string, value: number): number => contrast(parseHexColour(colour), parseHexColour(environmentColour(recipe, value) ?? '#000000'));
  const light = (value: number): number => Math.min(ratio(chrome.text, value) / LARGE, ratio(chrome.icon, value) / LARGE, ratio(chrome.label, value) / TEXT);
  const darkScore = (value: number): number => ratio(dark, value) / TEXT;
  const prefersDark = (value: number): boolean => darkScore(value) > light(value);
  const start = recipe.measure.start ?? 0;
  const end = recipe.measure.max ?? start + recipe.measure.perMinute * 60 * 24;
  const atStart = prefersDark(start);
  if (atStart === prefersDark(end)) return () => (atStart ? 1 : 0);
  // Where the schemes cross (the environment darkens or brightens steadily along the measure).
  let low = start;
  let high = end;
  for (let i = 0; i < 60; i += 1) {
    const middle = (low + high) / 2;
    if (prefersDark(middle) === atStart) low = middle;
    else high = middle;
  }
  return (value) => {
    const before = value < high;
    return (before ? atStart : !atStart) ? 1 : 0;
  };
}
