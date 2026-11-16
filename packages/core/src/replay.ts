/**
 * Results replay timing shared by every display mode (plan, Design system > Motion). Each mode keeps its own
 * base length and curve (CONFIG.modes.*.replay); this lengthens any of them for long sessions.
 */

import { CONFIG } from './config.ts';

const HOUR = 60 * 60 * 1000;

/** A mode's results replay: how long it runs at normal speed, and its cubic-bezier curve. */
export interface ReplayTiming {
  readonly durationMs: number;
  readonly easing: readonly [number, number, number, number];
}

/**
 * How much longer a replay runs for a session of `elapsedMs`: nothing up to 2 hours, then 0.5 s for each
 * doubling past 2 hours (0.5 s × log2(hours ÷ 2)), at most 1.5 s more: +0.5 s at 4 hours, +1 s at 8, +1.5 s
 * at 16. Long sessions get room to show without dragging.
 */
export function longSessionReplayExtraMs(elapsedMs: number): number {
  const { fromHours, perDoubling, max } = CONFIG.motion.replayLongSession;
  const hours = elapsedMs / HOUR;
  if (!(hours > fromHours)) return 0;
  return Math.min(max, perDoubling * Math.log2(hours / fromHours));
}

/** A replay's whole length for a session of `elapsedMs`, at normal speed. */
export function replayLengthMs(timing: ReplayTiming, elapsedMs: number): number {
  return timing.durationMs + longSessionReplayExtraMs(elapsedMs);
}
