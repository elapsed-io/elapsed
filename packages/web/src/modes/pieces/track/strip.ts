import { CONFIG, TIMELINE_CONFIG } from '@stopwatch/core';

/** Minutes the timeline strip covers: the longest session plus half the visible track and a margin. */
export function timelineStripMinutes(): number {
  const { widthPx, minutesPer100Px } = TIMELINE_CONFIG;
  const halfWindow = (widthPx / 2 / 100) * minutesPer100Px;
  return CONFIG.session.maxFocus / 60_000 + Math.ceil(halfWindow) + 5;
}
