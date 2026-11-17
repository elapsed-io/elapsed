/**
 * The `path` piece (docs/recipes/mode-recipes.md): in a recipe's camera space, the route from `from` to the current
 * value along the heading, at the layer's opacity, drawn as the frames draw it, its head over everything
 * (interstellar's route and traveller).
 */

import { bindingAt } from '@stopwatch/core';
import type { PathLayer } from '@stopwatch/core';
import { svg } from '../../../dom.ts';
import type { CameraLayout } from '../../recipe/camera.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import { NOTHING, mapScale, number, pointAt, tenth } from './common.ts';

/**
 * The transform that moves a segment of the heading's ray drawn from `a0` to `b0` (distances from the anchor) to run
 * from `a1` to `b1`: stretched and shifted along the heading only, so the line keeps its width. Written as the same
 * list of functions at every keyframe (about the anchor, turned to the heading and back), so a glide interpolates
 * each one linearly and the line stays on the ray.
 */
function along(layout: CameraLayout, a0: number, b0: number, a1: number, b1: number): string {
  const stretch = b0 - a0 === 0 ? 1 : (b1 - a1) / (b0 - a0);
  const shift = a1 - stretch * a0;
  const [x, y] = layout.sun;
  const turn = number(layout.heading);
  return `translate(${number(x)}px, ${number(y)}px) rotate(${turn}deg) translateX(${String(shift)}px) scaleX(${String(stretch)}) rotate(${number(-layout.heading)}deg) translate(${number(-x)}px, ${number(-y)}px)`;
}

export function pathPiece({ doc, layer, recipe, stage }: PieceSetup<PathLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera') return NOTHING;
  const from = layer.from ?? recipe.measure.start ?? 0;
  const group = svg(doc, 'g', { opacity: number(bindingAt(layer.opacity ?? 1, { measure: from })) });
  stage.group('map__path').append(group);
  const line = svg(doc, 'line', { stroke: colourCss(layer.color, 'var(--color-foreground)'), 'stroke-width': layer.width ?? 1 });
  group.append(line);
  // Drawn as the frames draw it, from the start's point to the traveller's, each to a tenth of a pixel; while it
  // glides, stretched along the heading from there.
  stage.track(line, (value, drawn) => {
    const [x1, y1] = pointAt(stage.layout, from, drawn);
    const [x2, y2] = pointAt(stage.layout, Math.max(from, drawn), drawn);
    const attrs = { x1: number(tenth(x1)), y1: number(tenth(y1)), x2: number(tenth(x2)), y2: number(tenth(y2)) };
    if (value === drawn) return { attrs, transform: 'none' };
    const scale0 = mapScale(stage.layout, drawn);
    const scale1 = mapScale(stage.layout, value);
    return { attrs, transform: along(stage.layout, from * scale0, Math.max(from, drawn) * scale0, from * scale1, Math.max(from, value) * scale1) };
  });
  if (layer.head !== undefined) {
    const head = svg(doc, 'circle', { r: (layer.head.size ?? 6) / 2, fill: colourCss(layer.head.color, 'var(--color-foreground)') });
    stage.front('map__head').append(head);
    stage.track(head, (value, drawn) => {
      const [x0, y0] = pointAt(stage.layout, drawn, drawn).map(tenth) as [number, number];
      const [x1, y1] = pointAt(stage.layout, value, value);
      return { attrs: { cx: number(x0), cy: number(y0) }, transform: value === drawn ? 'none' : `translate(${number(x1 - x0)}px, ${number(y1 - y0)}px)` };
    });
  }
  return NOTHING;
}
