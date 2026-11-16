/**
 * Landmarks on the profile charts of ocean depth and height (plan, Display modes > Results replays): one or two
 * at random from each band of a catalog, then at most six, spread along the path. Each mode's catalog is its own
 * (ocean.ts, height.ts); the choosing is shared, so both behave alike.
 */

/** Fisher–Yates over `pool`, in place, so every order is equally likely. `random` is like Math.random. */
function shuffle(pool: unknown[], random: () => number): void {
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
}

/**
 * From each band of `band` metres (ascending), one or two of the catalog's items at random (never more than
 * `perBand`), in order of `at`.
 */
export function pickByBand<T>(catalog: readonly T[], at: (item: T) => number, band: number, perBand: number, random: () => number): T[] {
  const bands = new Map<number, T[]>();
  for (const item of catalog) {
    const index = Math.floor(at(item) / band);
    bands.set(index, [...(bands.get(index) ?? []), item]);
  }
  const picked: T[] = [];
  for (const index of [...bands.keys()].sort((a, b) => a - b)) {
    const pool = [...(bands.get(index) ?? [])];
    shuffle(pool, random);
    const count = Math.min(perBand, random() < 0.5 ? 1 : 2);
    picked.push(...pool.slice(0, count));
  }
  return picked.sort((a, b) => at(a) - at(b));
}

/**
 * At most `max` items, spread along the path (plan: "at most 6 landmarks per results, spread along the path"):
 * while there are too many, one of the two closest goes, picked by `random`. Keeps the order of `at`.
 */
export function spreadBy<T>(items: readonly T[], at: (item: T) => number, max: number, random: () => number): T[] {
  const kept = [...items].sort((a, b) => at(a) - at(b));
  const gap = (i: number): number => at(kept[i + 1] as T) - at(kept[i] as T);
  while (kept.length > Math.max(0, max)) {
    let closest = 0;
    for (let i = 1; i < kept.length - 1; i += 1) if (gap(i) < gap(closest)) closest = i;
    kept.splice(closest + (random() < 0.5 ? 0 : 1), 1);
  }
  return kept;
}
