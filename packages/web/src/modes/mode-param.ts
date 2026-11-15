/**
 * The temporary `?mode=` URL parameter (owner decision, 2026-11-15): picks
 * ring or timeline until round 6 adds the display mode setting, then it is
 * removed. Only known mode ids are accepted; anything else is ignored.
 */

import { DEFAULT_MODE_ID, isKnownMode } from './manifests.ts';

export function modeFromSearch(search: string): string {
  return requestedMode(search) ?? DEFAULT_MODE_ID;
}

/** The known mode the URL asks for, or null if it asks for none. */
export function requestedMode(search: string): string | null {
  const requested = new URLSearchParams(search).get('mode');
  return requested !== null && isKnownMode(requested) ? requested : null;
}
