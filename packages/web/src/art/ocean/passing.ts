/**
 * Ocean depth's results art: the things that pass as the replay crosses their zone (plan, Display modes >
 * Results replays). Placeholder silhouettes from the design canvas, drawn through the asset registry until the
 * commissioned art replaces this file. Art, not code: see LICENSE in this folder (CC0).
 */

import type { ArtCatalog, ArtShape } from '../registry.ts';

/** One fish, drawn in a 20 × 10 box: a body and a tail. */
const fish = (x: number, y: number, width: number): ArtShape => ({
  tag: 'g',
  attrs: { transform: `translate(${String(x)} ${String(y)}) scale(${String(width / 20)})` },
  children: [
    { tag: 'ellipse', attrs: { cx: 9, cy: 5, rx: 7, ry: 3.2 }, tone: 'silhouette' },
    { tag: 'path', attrs: { d: 'M15 5 L20 1.5 L20 8.5 Z' }, tone: 'silhouette' },
  ],
});

const tentacle = (x: number): ArtShape => ({
  tag: 'path',
  attrs: { d: `M${String(x)} 26 C${String(x - 4)} 42 ${String(x + 4)} 56 ${String(x)} 76`, 'stroke-width': 1.4 },
  tone: 'jelly-line',
});

const light = (cx: number, cy: number, r: number, opacity: number): ArtShape => ({ tag: 'circle', attrs: { cx, cy, r, opacity }, tone: 'glow' });

export const OCEAN_PASSING: ArtCatalog = {
  mode: 'ocean',
  entries: [
    {
      key: 'passing/fish-school',
      viewBox: [0, 0, 120, 60],
      shapes: [fish(0, 10, 18), fish(24, 2, 14), fish(40, 20, 16), fish(64, 8, 18), fish(82, 26, 13), fish(18, 32, 15), fish(52, 40, 14), fish(96, 14, 12)],
    },
    {
      key: 'passing/sea-turtle',
      viewBox: [0, 0, 70, 44],
      shapes: [
        { tag: 'ellipse', attrs: { cx: 34, cy: 22, rx: 20, ry: 13 }, tone: 'silhouette' },
        { tag: 'circle', attrs: { cx: 58, cy: 20, r: 6 }, tone: 'silhouette' },
        { tag: 'path', attrs: { d: 'M24 12 L10 2 L30 10 Z M24 32 L10 42 L30 34 Z M44 12 L54 4 L46 14 Z M44 32 L54 40 L46 30 Z' }, tone: 'silhouette' },
      ],
    },
    {
      key: 'passing/whale',
      viewBox: [0, 0, 230, 80],
      shapes: [
        { tag: 'path', attrs: { d: 'M10 40 C30 12 120 8 170 30 C185 36 200 30 214 18 L222 22 C212 34 210 42 222 58 L214 62 C200 50 186 46 170 50 C120 72 40 68 10 40 Z' }, tone: 'deep' },
        { tag: 'path', attrs: { d: 'M90 56 L76 74 L104 60 Z' }, tone: 'deep' },
      ],
    },
    {
      key: 'passing/jellyfish',
      viewBox: [0, 0, 48, 80],
      shapes: [{ tag: 'path', attrs: { d: 'M4 26 C4 4 44 4 44 26 Z' }, tone: 'jelly' }, tentacle(10), tentacle(18), tentacle(26), tentacle(34), tentacle(40)],
    },
    {
      key: 'passing/squid-lights',
      viewBox: [0, 0, 60, 90],
      shapes: [
        light(30, 10, 2.6, 0.9),
        light(22, 24, 1.8, 0.7),
        light(38, 24, 1.8, 0.7),
        light(30, 36, 2, 0.8),
        light(18, 50, 1.4, 0.6),
        light(42, 50, 1.4, 0.6),
        light(26, 64, 1.2, 0.5),
        light(34, 70, 1.2, 0.5),
        light(30, 84, 1, 0.4),
      ],
    },
  ],
};
