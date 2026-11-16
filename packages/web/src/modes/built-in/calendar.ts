/**
 * Perpetual calendar, a test mode, from its recipe (owner, changes 4: a test of the recipe system, after a
 * perpetual-calendar watch): the dial piece with hours, minutes and a sweeping seconds hand on focused time, and a
 * perpetual calendar's complications (date, weekday, month, leap year and moon) counting a day a focused minute.
 */

import RECIPE from '../../../../../docs/recipes/recipes/calendar.json' with { type: 'json' };
import { dialPiece } from '../pieces/dial/dial.ts';
import { builtInMode } from './built-in.ts';

export const createCalendarMode = builtInMode('calendar', RECIPE, {
  pieces: { dial: dialPiece },
  view: async () => (await import('../pieces/ring/ring-replay.ts')).ringsView,
});
