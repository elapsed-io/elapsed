/**
 * Sharing a result (plan, Decisions > Results: "Share sends a short line of
 * text with the focused time and a link ... through the device's share sheet,
 * or copies it on desktop"). Touch devices get the share sheet; computers
 * copy, even where the browser has a share sheet (owner decision,
 * 2026-11-15). Guests share a link to the site.
 */

import { BRAND, durationParts } from '@stopwatch/core';

/** "2h 47m", "47m", or "45s" for under a minute. */
export function shareDuration(ms: number): string {
  const { hours, minutes, seconds } = durationParts(ms);
  if (hours > 0) return `${String(hours)}h ${String(minutes)}m`;
  if (minutes > 0) return `${String(minutes)}m`;
  return `${String(seconds)}s`;
}

export function shareText(focusedMs: number): string {
  return BRAND.copy.results.shareText.replace('{duration}', shareDuration(focusedMs)).replace('{name}', BRAND.name);
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareResult(win: Window, focusedMs: number): Promise<ShareOutcome> {
  const text = shareText(focusedMs);
  const url = `${win.location.origin}/`;
  const touch = win.matchMedia('(pointer: coarse)').matches;
  if (touch && typeof win.navigator.share === 'function') {
    try {
      await win.navigator.share({ text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Any other failure falls back to copying.
    }
  }
  try {
    await win.navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
