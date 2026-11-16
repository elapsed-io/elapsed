/**
 * A finished session's focus as stretches of minutes from its start, for the
 * results replays. How a replay moves is not here: every replay is drawn from
 * one progress value, --replay-progress, which the results screen animates
 * (plan, Principles: "a results replay is driven by a single animated custom
 * property holding its progress").
 */

export interface FocusStretch {
  readonly from: number;
  readonly to: number;
}

export function focusStretches(segments: readonly { readonly start: number; readonly end: number | null }[], startedAt: number): FocusStretch[] {
  return segments.map(({ start, end }) => ({ from: (start - startedAt) / 60_000, to: ((end ?? start) - startedAt) / 60_000 }));
}
