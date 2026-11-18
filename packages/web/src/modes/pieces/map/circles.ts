/**
 * The `circles` piece (docs/recipes/mode-recipes.md): in a recipe's camera space, a circle at each item's value from
 * the anchor, dashed or solid, fading out as its radius shrinks through `fadeBelowPx` (from 1.5 times it to half of
 * it), at most the layer's opacity (interstellar's orbits). Each is drawn once and only scaled as the camera moves.
 *
 * A circle wholly outside the screen for a whole minute (it only shrinks as the camera pulls back) is not drawn that
 * minute (round 2.10): the outer orbits start tens of thousands of pixels across, and drawing their dashes off
 * screen cost every frame hundreds of milliseconds.
 */

import { bindingAt, smoothstep, SPACE_CONFIG } from '@stopwatch/core';
import type { CirclesLayer } from '@stopwatch/core';
import { svg } from '../../../dom.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { CameraLayout } from '../../recipe/camera.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import { NOTHING, anchored, mapScale, number, tenth } from './common.ts';

export function circlesPiece({ doc, layer, recipe, stage }: PieceSetup<CirclesLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera') return NOTHING;
  const group = svg(doc, 'g', {});
  stage.group('map__circles').append(group);
  anchored(stage, group, false);
  const fade = layer.fadeBelowPx ?? 0;
  const { widthPx, dash } = SPACE_CONFIG.ringFade;
  const colour = colourCss(layer.color, 'var(--color-muted)');
  for (const item of layer.items) {
    const circle = svg(doc, 'circle', { r: 1, fill: 'none', stroke: colour, 'stroke-width': widthPx, ...(item.dashed === true ? { 'stroke-dasharray': dash.join(' ') } : {}) });
    group.append(circle);
    stage.track(circle, (value, from) => {
      const radius = item.at * mapScale(stage.layout, value);
      const drawn = Math.max(0.05, tenth(item.at * mapScale(stage.layout, from)));
      const shown = fade > 0 ? smoothstep((radius - fade / 2) / fade) : 1;
      // Smallest by the minute's end: if even then it passes beyond every corner of the screen, it is not drawn.
      const smallest = item.at * mapScale(stage.layout, from + Math.abs(recipe.measure.perMinute));
      const offScreen = smallest - widthPx > farthestCorner(stage.layout);
      return {
        attrs: { r: number(drawn), visibility: offScreen ? 'hidden' : 'visible' },
        transform: value === from ? 'none' : `scale(${String(radius / drawn)})`,
        opacity: Math.round(bindingAt(layer.opacity ?? 1, { measure: value }) * shown * 100) / 100,
      };
    });
  }
  return NOTHING;
}

/** How far the screen's farthest corner is from the anchor, in reference pixels. */
function farthestCorner(layout: CameraLayout): number {
  const [x, y] = layout.sun;
  return Math.max(...[0, layout.width].flatMap((cx) => [0, layout.height].map((cy) => Math.hypot(cx - x, cy - y))));
}
