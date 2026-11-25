/**
 * Height, from its recipe: the light model's sky, its stars fading in from 18 km, shooting stars while paused, the
 * altitude caption, and the climb profile on the lit results with its stars and Earth's horizon. Its art is its
 * slots' defaults, through the asset registry.
 */

import 'virtual:tokens/height.css';
import './height.css';
import { HEIGHT_CONFIG, HEIGHT_COPY, HEIGHT_LANDMARKS } from '@stopwatch/core';
import RECIPE from '../../../../../packages/core/src/recipes/shipped/height.json' with { type: 'json' };
import type { BuiltInMode } from './built-in.ts';

export const HEIGHT: BuiltInMode = {
  id: 'height',
  recipe: RECIPE,
  environment: false,
  chrome: { text: HEIGHT_CONFIG.palette.text, icon: HEIGHT_CONFIG.palette.icon, label: HEIGHT_CONFIG.palette.label },
  slots: {
    art: {
      'sky/stars': async () => (await import('../../art/height/sky.ts')).HEIGHT_SKY,
      'sky/stars-card': async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS,
      'passing/': async () => (await import('../../art/height/results.ts')).HEIGHT_RESULTS,
    },
    data: {
      'sky/landmarks': () => HEIGHT_LANDMARKS.map((landmark) => ({ at: landmark.height, id: landmark.id, name: HEIGHT_COPY.landmarks[landmark.id] })),
    },
  },
};
