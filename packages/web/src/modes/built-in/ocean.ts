/**
 * Ocean depth, from its recipe: the light model's water, the time over it, ocean life by zone while paused, and the
 * dive profile on the lit results. Its art is its slots' defaults, through the asset registry: each zone's life
 * catalog (loaded only when a pause there shows it) and the things that pass on the results.
 */

import 'virtual:tokens/ocean.css';
import './ocean.css';
import { BRAND, CONFIG, OCEAN_LANDMARKS } from '@stopwatch/core';
import RECIPE from '../../../../../docs/recipes/recipes/ocean-depth.json' with { type: 'json' };
import { lightEnvironment } from '../pieces/light/light.ts';
import { particlesPiece } from '../pieces/particles/particles.ts';
import { builtInMode } from './built-in.ts';

export const createOceanMode = builtInMode('ocean', RECIPE, {
  environment: lightEnvironment,
  pieces: { particles: particlesPiece },
  view: async () => (await import('../views/profile.ts')).profileView,
  chrome: { text: CONFIG.modes.ocean.palette.text, icon: CONFIG.modes.ocean.palette.icon, label: CONFIG.modes.ocean.palette.icon },
  slots: {
    art: {
      'sunlight/': async () => (await import('../../art/ocean/life-sunlight.ts')).LIFE,
      'twilight/': async () => (await import('../../art/ocean/life-twilight.ts')).LIFE,
      'midnight/': async () => (await import('../../art/ocean/life-midnight.ts')).LIFE,
      'abyssal/': async () => (await import('../../art/ocean/life-abyssal.ts')).LIFE,
      'hadal/': async () => (await import('../../art/ocean/life-hadal.ts')).LIFE,
      'passing/': async () => (await import('../../art/ocean/passing.ts')).OCEAN_PASSING,
    },
    data: {
      'ocean/landmarks': () => OCEAN_LANDMARKS.map((landmark) => ({ at: landmark.depth, id: landmark.id, name: BRAND.copy.ocean.landmarks[landmark.id] })),
    },
  },
});
