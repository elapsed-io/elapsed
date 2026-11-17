/**
 * The colour-stops environment (docs/recipes/mode-recipes.md, `environment` of type `stops`): the background as
 * the recipe's stops give it at the measure, behind everything (interstellar's space, #03040A throughout). Set when
 * it changes; the site crossfades one environment into the next when the mode changes.
 */

import './stops.css';
import { environmentColour } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import type { Environment, EnvironmentFactory } from '../../recipe/piece.ts';

export const stopsEnvironment: EnvironmentFactory = ({ doc, recipe }): Environment => {
  const element = html(doc, 'div', { class: 'stops' });
  let shown = '';
  const paint = (value: number): void => {
    const colour = environmentColour(recipe, value) ?? '';
    if (colour === shown) return;
    shown = colour;
    element.style.setProperty('background', colour);
  };
  paint(recipe.measure.start ?? 0);
  return {
    element,
    render({ value }) {
      paint(value);
    },
  };
};
