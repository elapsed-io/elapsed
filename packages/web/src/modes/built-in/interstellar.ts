/**
 * Interstellar, from its recipe (a test mode, behind the test-modes switch; plan-release-2, round 2.9): space
 * behind everything, the still sky (the canvas's catalog) turning while paused (every HYG star to magnitude 5),
 * the true-scale map on the camera (orbits, the Sun, the route and the bodies on it), comets while paused, the
 * distance line, and the journey replayed on the results. Its art is its slots' defaults: the bodies through the
 * asset registry, the still sky and the landmark list built in, the whole sky loaded only when it first turns.
 */

import 'virtual:tokens/interstellar.css';
import './interstellar.css';
import { BRAND, CONFIG } from '@stopwatch/core';
import RECIPE from '../../../../../docs/recipes/recipes/interstellar.json' with { type: 'json' };
import { CANVAS_STARS, FAINT_STARS_RESULTS, FAINT_STARS_TIMER } from '../../art/space/canvas-stars.ts';
import { circlesPiece, landmarksPiece, pathPiece, shapePiece } from '../pieces/map/map.ts';
import { particlesPiece } from '../pieces/particles/particles.ts';
import { starfieldPiece } from '../pieces/starfield/starfield.ts';
import { stopsEnvironment } from '../pieces/stops/stops.ts';
import { builtInMode } from './built-in.ts';

const SPACE = CONFIG.modes.interstellar;

/** The landmark list: Earth where the trip starts, then each landmark, each naming its body's art slot. */
export function spaceLandmarks(): { readonly at: number; readonly id: string; readonly name: string; readonly art: string }[] {
  return [SPACE.start, ...SPACE.landmarks].map((body) => ({ at: body.au, id: body.id, name: BRAND.copy.interstellar.bodies[body.id], art: `space.body.${body.id}` }));
}

export const createInterstellarMode = builtInMode('interstellar', RECIPE, {
  environment: stopsEnvironment,
  pieces: { starfield: starfieldPiece, circles: circlesPiece, shape: shapePiece, path: pathPiece, landmarks: landmarksPiece, particles: particlesPiece },
  view: async () => (await import('../views/space.ts')).spaceView,
  chrome: { text: SPACE.palette.text, icon: SPACE.palette.icon, label: SPACE.palette.label },
  slots: {
    art: { 'space/': async () => (await import('../../art/space/bodies.ts')).SPACE_BODIES },
    data: {
      'space/landmarks': spaceLandmarks,
      'space/canvas-stars': () => ({ stars: CANVAS_STARS, faint: FAINT_STARS_TIMER, faintResults: FAINT_STARS_RESULTS }),
      'stars/hyg-mag5': async () => (await import('../../art/stars/hyg-mag5.json', { with: { type: 'json' } })).default,
    },
  },
});
