import { CONFIG } from '@stopwatch/core';

/** Minutes the timeline strip covers: the longest session plus half the visible window and a margin. */
export function timelineStripMinutes(): number {
  const { widthPx, minutesPer100Px } = CONFIG.modes.timeline;
  const halfWindow = (widthPx / 2 / 100) * minutesPer100Px;
  return CONFIG.session.maxFocus / 60_000 + Math.ceil(halfWindow) + 5;
}
