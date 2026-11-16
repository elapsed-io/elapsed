/**
 * Height, from its recipe: the light model's sky, its stars fading in from 18 km, shooting stars while paused, the
 * altitude caption, and the climb profile on the lit results with its stars and Earth's horizon. Its art is its
 * slots' defaults, through the asset registry.
 */

import 'virtual:tokens/height.css';
import './height.css';
import { BRAND, CONFIG, HEIGHT_LANDMARKS } from '@stopwatch/core';
import RECIPE from '../../../../../docs/recipes/recipes/height.json' with { type: 'json' };
import { lightEnvironment } from '../pieces/light/light.ts';
import { particlesPiece } from '../pieces/particles/particles.ts';
import { starfieldPiece } from '../pieces/starfield/starfield.ts';
import { builtInMode } from './built-in.ts';

export const createHeightMode = builtInMode('height', RECIPE, {
  environment: lightEnvironment,
  pieces: { starfield: starfieldPiece, particles: particlesPiece },
  view: async () => (await import('../views/profile.ts')).profileView,
  chrome: { text: CONFIG.modes.height.palette.text, icon: CONFIG.modes.height.palette.icon, label: CONFIG.modes.height.palette.label },
  slots: {
    art: {
      'sky/stars': async () => (await import('../../art/height/sky.ts')).HEIGHT_SKY,
      'sky/stars-card': async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS,
      'passing/': async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS,
    },
    data: {
      'sky/landmarks': () => HEIGHT_LANDMARKS.map((landmark) => ({ at: landmark.height, id: landmark.id, name: BRAND.copy.height.landmarks[landmark.id] })),
    },
  },
});
