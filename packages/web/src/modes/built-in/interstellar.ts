/**
 * Interstellar, from its recipe (a test mode, behind the test-modes switch; plan-release-2, round 2.9): space
 * behind everything, the still sky (the canvas's catalog) turning while paused (every HYG star to magnitude 5),
 * the true-scale map on the camera (orbits, the Sun, the route and the bodies on it), comets while paused, the
 * distance line, and the journey replayed on the results. Its art is its slots' defaults: the bodies through the
 * asset registry, the landmark list built in, and both skies drawn by the build as images (build/sky.ts, round
 * 2.10), the whole sky's fetched only when it first turns.
 */

import 'virtual:tokens/interstellar.css';
import './interstellar.css';
import { SPACE_CONFIG, SPACE_COPY } from '@stopwatch/core';
import RECIPE from '../../../../../docs/recipes/recipes/interstellar.json' with { type: 'json' };
import SKY from 'virtual:sky/interstellar/stars';
import type { BuiltInMode } from './built-in.ts';

const SPACE = SPACE_CONFIG;

/** The landmark list: Earth where the trip starts, then each landmark, each naming its body's art slot. */
export function spaceLandmarks(): { readonly at: number; readonly id: string; readonly name: string; readonly art: string }[] {
  return [SPACE.start, ...SPACE.landmarks].map((body) => ({ at: body.au, id: body.id, name: SPACE_COPY.bodies[body.id], art: `space.body.${body.id}` }));
}

export const INTERSTELLAR: BuiltInMode = {
  id: 'interstellar',
  recipe: RECIPE,
  chrome: { text: SPACE.palette.text, icon: SPACE.palette.icon, label: SPACE.palette.label },
  slots: {
    art: { 'space/': async () => (await import('../../art/space/bodies.ts')).SPACE_BODIES },
    data: {
      'space/landmarks': spaceLandmarks,
      'space/canvas-stars': () => SKY['space/canvas-stars'],
      'stars/hyg-mag5': () => SKY['stars/hyg-mag5'],
    },
  },
};
