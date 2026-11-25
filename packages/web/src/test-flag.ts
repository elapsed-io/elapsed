/**
 * The test flag (plan, Display modes > Interstellar; owner, 2026-11-24): a visit opened with `?test=modes` (or the
 * older `?test=interstellar`) adds the test modes (ocean depth, height, the tree and interstellar) to the mode tiles
 * for that visit, until the tab is closed. The flag is read from the address on every load and kept in memory only;
 * the address keeps it, so a reload stays flagged, and a new tab opened without it shows the four standard modes.
 * Nothing about the flag is stored. Without it the test modes appear nowhere and nothing of them is downloaded:
 * their manifests, their tiles and options (modes/test-modes.ts, settings/test-modes.ts) load only on a flagged visit.
 */

/** The `test` values that flag a visit; any other is ignored. */
export const TEST_FLAG_VALUES: readonly string[] = ['modes', 'interstellar'];

/** Whether an address flags the visit: `?test=modes` or `?test=interstellar`, and nothing else. */
export function isFlaggedVisit(search: string): boolean {
  return new URLSearchParams(search).getAll('test').some((value) => TEST_FLAG_VALUES.includes(value));
}

/**
 * Where round 2.9's "test modes" switch was kept. The switch is gone and nothing about the flag is stored: whatever
 * an earlier version left under this key is removed on every load.
 */
export const RETIRED_TEST_MODES_KEY = 'test-modes';

export function forgetTestModesSwitch(storage: Storage | null, onError: (error: unknown) => void): void {
  try {
    if (storage?.getItem(RETIRED_TEST_MODES_KEY) !== null) storage?.removeItem(RETIRED_TEST_MODES_KEY);
  } catch (error) {
    onError(error);
  }
}
