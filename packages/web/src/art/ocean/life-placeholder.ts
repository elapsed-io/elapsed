/**
 * Ocean life's placeholder art (the "ocean depth, paused" frame): the canvas's one fish, at three distances,
 * and a bubble. Each depth zone has its own catalog (life-<zone>.ts) under its own keys, so the commissioned
 * art for each zone replaces these file for file. Art, not code: see LICENSE in this folder (CC0).
 */

import type { ArtCatalog, ArtEntry } from '../registry.ts';

/** The fish, nose at the origin, body to the right: drawn facing left. */
const FISH = 'M0 0 C10 -11 30 -11 42 0 C30 11 10 11 0 0 Z M40 0 L54 -9 L52 0 L54 9 Z';

export type LifeDistance = 'far' | 'mid' | 'near';

export function lifeCatalog(zone: string): ArtCatalog {
  const fish = (distance: LifeDistance): ArtEntry => ({ key: `${zone}/fish-${distance}`, viewBox: [0, -11, 54, 22], shapes: [{ tag: 'path', attrs: { d: FISH }, tone: `life-${distance}` }] });
  return {
    mode: 'ocean',
    entries: [fish('far'), fish('mid'), fish('near'), { key: `${zone}/bubble`, viewBox: [-1, -1, 2, 2], shapes: [{ tag: 'circle', attrs: { cx: 0, cy: 0, r: 1 }, tone: 'life-bubble' }] }],
  };
}
