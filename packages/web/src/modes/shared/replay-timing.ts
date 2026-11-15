/**
 * How a mode's results replay moves (plan, Design system > Motion: "the
 * replay ... runs 4.5 s, eased in and out (cubic)"). Modes create their
 * replay's animations with this timing and no delay; the results screen then
 * sets when they start, or finishes them at once for reduced motion and a
 * reloaded results screen.
 */

import { CONFIG } from '@stopwatch/core';

export interface ReplayTiming extends KeyframeAnimationOptions {
  readonly duration: number;
  readonly easing: string;
  readonly fill: 'both';
}

export function replayTiming(doc: Document): ReplayTiming {
  const view = doc.defaultView;
  const easing = view?.getComputedStyle(doc.documentElement).getPropertyValue('--ease-replay').trim() ?? '';
  return { duration: CONFIG.motion.replayDuration, easing: easing === '' ? 'ease-in-out' : easing, fill: 'both' };
}

/** A finished session's focus as stretches of minutes from its start, for drawing. */
export interface FocusStretch {
  readonly from: number;
  readonly to: number;
}

export function focusStretches(segments: readonly { readonly start: number; readonly end: number | null }[], startedAt: number): FocusStretch[] {
  return segments.map(({ start, end }) => ({ from: (start - startedAt) / 60_000, to: ((end ?? start) - startedAt) / 60_000 }));
}
