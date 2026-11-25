/**
 * Words only the test modes use (plan, Display modes > Interstellar; owner, 2026-11-24): their names, the line under
 * the mode tiles and their options boxes in the display settings. Shown only on a visit opened with the test flag
 * (`?test=modes`), and imported only by what such a visit loads, so a visit without the flag never downloads them.
 */

export const TEST_MODES_COPY = {
  /** The test modes' names, for their tiles and the downloaded modes list. */
  names: { ocean: 'ocean depth', height: 'height', tree: 'tree', interstellar: 'interstellar' },
  /** Under the mode tiles on a flagged visit (the Release 2 display frame). */
  line: 'test modes appear here only for a visit opened with ?test=modes.',
  /** Each mode's options, under the tiles while that mode is chosen (the Release 2 display frame). */
  modeOptions: { ocean: 'ocean depth options', height: 'height options', tree: 'tree options' },
  oceanLife: { label: 'ocean life', help: 'sea life drifts in while you’re paused' },
  resultsLandmarks: { label: 'results landmarks', help: { ocean: 'up to two per 1,000 m on the results', height: 'up to two per 10 km on the results' } },
  treeView: { label: 'tree view', options: { side: 'side', isometric: 'isometric' } },
} as const;
