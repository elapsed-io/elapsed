/**
 * Interstellar's bodies (plan, Display modes > Results replays; the interstellar frames): each landmark drawn as
 * itself, in its real colours with its signature feature, at the size the frames draw it. Earth blue with land and
 * a thin atmosphere; Mars rust red with a polar cap; Jupiter tan with bands and the Great Red Spot; Saturn pale gold
 * with its rings passing in front; Uranus pale cyan with a ring standing on end; Neptune deep blue with the Great
 * Dark Spot; Pluto tan with its pale heart; the Kuiper belt edge as small icy bodies; the termination shock as a
 * lavender ring; the heliopause as a glowing blue ring. Each is centred on 0, 0 in its view box, so the map places
 * it by its centre; its colours are tones (built-in/interstellar.css). Placeholder art from the design canvas,
 * drawn through the asset registry until the commissioned art replaces this file. Art, not code: see LICENSE in
 * this folder (CC0).
 */

import type { ArtCatalog, ArtEntry, ArtShape } from '../registry.ts';

/** Every body's box: room for Saturn's rings and Uranus's, about the body's centre. */
const BOX = [-16, -12, 32, 24] as const;

const body = (name: string, shapes: readonly ArtShape[]): ArtEntry => ({ key: `space/${name}`, viewBox: BOX, shapes });
const circle = (tone: string, attrs: Readonly<Record<string, number | string>>): ArtShape => ({ tag: 'circle', attrs, tone });

export const SPACE_BODIES: ArtCatalog = {
  mode: 'interstellar',
  entries: [
    body('earth', [
      circle('earth-sea', { r: 3.6 }),
      { tag: 'path', attrs: { d: 'M-1.6 -1.8 q1.6 -0.6 2.2 0.6 q-0.4 1.4 -1.8 1 Z' }, tone: 'earth-land' },
      circle('earth-air', { r: 3.6, 'stroke-width': 0.6, opacity: 0.6 }),
    ]),
    body('mars', [circle('mars', { r: 3 }), { tag: 'ellipse', attrs: { cy: -2.3, rx: 1.3, ry: 0.6 }, tone: 'mars-cap' }]),
    body('jupiter', [
      circle('jupiter', { r: 7 }),
      // The frame's bands, three strips clipped to the disc, drawn as the strips' own shapes.
      { tag: 'path', attrs: { d: 'M-6.1188 -3.4H6.1188A7 7 0 0 1 6.6776 -2.1H-6.6776A7 7 0 0 1 -6.1188 -3.4Z' }, tone: 'jupiter-band' },
      { tag: 'path', attrs: { d: 'M-6.9742 -0.6H6.9742A7 7 0 0 1 6.8964 1.2H-6.8964A7 7 0 0 1 -6.9742 -0.6Z' }, tone: 'jupiter-band' },
      { tag: 'path', attrs: { d: 'M-6.4992 2.6H6.4992A7 7 0 0 1 6.0033 3.6H-6.0033A7 7 0 0 1 -6.4992 2.6Z' }, tone: 'jupiter-band' },
      { tag: 'ellipse', attrs: { cx: 2.4, cy: 2.2, rx: 1.4, ry: 0.8 }, tone: 'jupiter-spot' },
    ]),
    body('saturn', [
      { tag: 'ellipse', attrs: { rx: 14, ry: 3.6, 'stroke-width': 1.8, opacity: 0.85, transform: 'rotate(-16)' }, tone: 'saturn-ring' },
      circle('saturn', { r: 6 }),
      // The near half of the rings, in front of the planet.
      { tag: 'path', attrs: { d: 'M-14 0 A14 3.6 0 0 0 14 0', 'stroke-width': 1.8, transform: 'rotate(-16)' }, tone: 'saturn-ring' },
    ]),
    body('uranus', [{ tag: 'ellipse', attrs: { rx: 1.6, ry: 9, 'stroke-width': 0.8, opacity: 0.7, transform: 'rotate(8)' }, tone: 'uranus-ring' }, circle('uranus', { r: 5 })]),
    body('neptune', [
      circle('neptune', { r: 5 }),
      { tag: 'ellipse', attrs: { cx: -1.4, cy: 1, rx: 1.4, ry: 0.8 }, tone: 'neptune-spot' },
      { tag: 'path', attrs: { d: 'M0.6 -2.6 q1.4 -0.4 2.6 0.2', 'stroke-width': 0.6 }, tone: 'neptune-cloud' },
    ]),
    body('pluto', [circle('pluto', { r: 2.6 }), { tag: 'path', attrs: { d: 'M-0.4 0.2 c-0.9 -1.1 0.5 -1.8 0.9 -0.7 c0.4 -1.1 1.8 -0.4 0.9 0.7 l-0.9 1.1 Z' }, tone: 'pluto-heart' }]),
    body('kuiper', [circle('kuiper-a', { cx: -2.6, cy: 0.8, r: 1.1 }), circle('kuiper-b', { cx: 0.4, cy: -1.4, r: 1.3 }), circle('kuiper-c', { cx: 2.4, cy: 1.2, r: 0.9 })]),
    body('termination-shock', [circle('shock-ring', { r: 4, 'stroke-width': 1.2 }), circle('shock', { r: 1.4 })]),
    body('heliopause', [circle('heliopause', { r: 5.5, opacity: 0.15 }), circle('heliopause-ring', { r: 5.5, 'stroke-width': 1.2 })]),
  ],
};
