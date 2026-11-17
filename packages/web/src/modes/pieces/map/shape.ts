/** The `shape` piece in camera space (docs/recipes/mode-recipes.md): a disc with its glow at the anchor (interstellar's Sun). */

import type { ShapeLayer } from '@stopwatch/core';
import { svg } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import { NOTHING, anchored, paint } from './common.ts';

export function shapePiece({ doc, layer, stage }: PieceSetup<ShapeLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera' || layer.shape !== 'circle') return NOTHING;
  const group = svg(doc, 'g', {});
  stage.group('map__shape').append(group);
  anchored(stage, group, false);
  const x = typeof layer.x === 'number' ? layer.x : 0;
  const y = typeof layer.y === 'number' ? layer.y : 0;
  if (layer.glow !== undefined) {
    const glow = paint(layer.glow.color, 'var(--color-foreground)');
    group.append(svg(doc, 'circle', { cx: x, cy: y, r: layer.glow.blur ?? layer.size[0], fill: glow.colour, opacity: glow.opacity }));
  }
  const fill = paint(typeof layer.fill === 'string' ? layer.fill : undefined, 'var(--color-foreground)');
  group.append(svg(doc, 'circle', { cx: x, cy: y, r: layer.size[0] / 2, fill: fill.colour, ...(fill.opacity < 1 ? { opacity: fill.opacity } : {}) }));
  return NOTHING;
}
