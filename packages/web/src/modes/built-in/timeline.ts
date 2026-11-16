/** Timeline, from its recipe: the time above the track piece, and the focus strip on the results. */

import RECIPE from '../../../../../docs/recipes/recipes/timeline.json' with { type: 'json' };
import { trackPiece } from '../pieces/track/track.ts';
import { builtInMode } from './built-in.ts';

export const createTimelineMode = builtInMode('timeline', RECIPE, {
  pieces: { track: trackPiece },
  view: async () => (await import('../shared/strip-replay.ts')).stripView,
});
