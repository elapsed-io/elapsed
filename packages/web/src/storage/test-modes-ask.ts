/**
 * Whether this device has anything to do with test modes (round 2.10): the address asks for the switch
 * (`?test=modes` or `?test=interstellar`), or the switch was offered before (its record is in local storage). Only
 * then does the site fetch the test-modes store (test-modes-store.ts); everyone else's first visit carries none of
 * it.
 */

/** Where the test-modes switch is kept. */
export const TEST_MODES_KEY = 'test-modes';
/** The addresses that offer the switch; any other `test` value is ignored. */
export const TEST_MODES_ASK: readonly string[] = ['modes', 'interstellar'];

/** Whether an address asks for the switch: `?test=modes` or `?test=interstellar`, and nothing else. */
export function asksForTestModes(search: string): boolean {
  return new URLSearchParams(search).getAll('test').some((value) => TEST_MODES_ASK.includes(value));
}
