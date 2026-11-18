/**
 * The `path` piece (docs/recipes/mode-recipes.md): in a recipe's camera space, the route from `from` to the current
 * value along the heading, at the layer's opacity, drawn as the frames draw it, its head over everything
 * (interstellar's route and traveller).
 */

import { bindingAt, PIECES_CONFIG } from '@stopwatch/core';
import type { PathLayer } from '@stopwatch/core';
import { svg } from '../../../dom.ts';
import type { CameraLayout } from '../../recipe/camera.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import { NOTHING, number, pointAt, tenth, translate } from './common.ts';

/**
 * The route at `value`: from the start's point to the traveller's, each to a tenth of a pixel as the frames place
 * them, as a unit line moved to the start, turned toward the traveller and stretched to reach it. The same list of
 * functions at every value, so a glide interpolates each linearly and the line's ends move with the start and the
 * traveller (the turn changes only by the rounding, a few thousandths of a degree).
 */
export function routeTransform(layout: CameraLayout, from: number, value: number): string {
  const [ax, ay] = pointAt(layout, from, value).map(tenth) as [number, number];
  const [bx, by] = pointAt(layout, Math.max(from, value), value).map(tenth) as [number, number];
  const length = Math.hypot(bx - ax, by - ay);
  const turn = length < 1e-6 ? layout.heading : (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return `translate(${number(ax)}px, ${number(ay)}px) rotate(${number(turn)}deg) scaleX(${number(length)})`;
}

export function pathPiece({ doc, layer, recipe, stage }: PieceSetup<PathLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera') return NOTHING;
  const from = layer.from ?? recipe.measure.start ?? 0;
  const group = svg(doc, 'g', { opacity: number(bindingAt(layer.opacity ?? 1, { measure: from })) });
  stage.group('map__path').append(group);
  // The route is one unit long on the heading's ray, stretched to run from the start's point to the traveller's.
  // Both ends and the traveller are worked out from the same value, in the same frame, with the same transform
  // (round 2.11, bug 1): at every keyframe of a glide each is a function of that value alone, and between keyframes
  // the browser moves each linearly, so the line meets the start and the traveller at every moment. Its width is the
  // stroke across the line, which the stretch along it leaves as drawn.
  const line = svg(doc, 'line', { x1: '0', y1: '0', x2: '1', y2: '0', stroke: colourCss(layer.color, 'var(--color-foreground)'), 'stroke-width': layer.width ?? PIECES_CONFIG.path.widthPx });
  group.append(line);
  stage.track(line, (value) => ({ transform: routeTransform(stage.layout, from, value) }));
  if (layer.head !== undefined) {
    const head = svg(doc, 'circle', { cx: '0', cy: '0', r: (layer.head.size ?? PIECES_CONFIG.path.headPx) / 2, fill: colourCss(layer.head.color, 'var(--color-foreground)') });
    stage.front('map__head').append(head);
    stage.track(head, (value) => {
      const [x, y] = pointAt(stage.layout, Math.max(from, value), value);
      return { transform: translate(x, y) };
    });
  }
  return NOTHING;
}
