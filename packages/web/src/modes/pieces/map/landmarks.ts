/**
 * The `landmarks` piece anchored to a path (docs/recipes/mode-recipes.md): each body drawn as itself (its art slot)
 * where the path crosses its value, once reached, fading out as its orbit shrinks from `fadeBelowPx` + 14 px to
 * `fadeBelowPx`; its name beside it, shown only at least 70 px clear of the next name kept further out. A landmark
 * at the trip's start (Earth) is drawn last, without a name, folding into the Sun's glow as the camera pulls back.
 */

import { keptLabels, smoothstep, SPACE_CONFIG } from '@stopwatch/core';
import type { LandmarksLayer } from '@stopwatch/core';
import { ART } from '../../../art/registry.ts';
import { svg } from '../../../dom.ts';
import type { CameraLayout } from '../../recipe/camera.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import type { Slots } from '../../recipe/slots.ts';
import { NOTHING, headingOf, mapScale, number, pointAt, tenth, translate } from './common.ts';

const SPACE = SPACE_CONFIG;

/** A landmark-list slot's entry: where, its id and name, and the slot of its art. */
export interface MapLandmark {
  readonly at: number;
  readonly id: string;
  readonly name: string;
  readonly art?: string;
}

export function isMapLandmarks(value: unknown): value is readonly MapLandmark[] {
  return (
    Array.isArray(value) &&
    value.every((entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const item = entry as Record<string, unknown>;
      return typeof item['at'] === 'number' && typeof item['id'] === 'string' && typeof item['name'] === 'string' && (item['art'] === undefined || typeof item['art'] === 'string');
    })
  );
}

/** A body's art from its slot, centred on its origin at one pixel a unit (or a dot, without art). */
export function drawBody(doc: Document, slots: Slots, entry: MapLandmark, dot: string): SVGElement {
  if (entry.art === undefined) return svg(doc, 'circle', { r: 3, fill: dot });
  const art = ART.draw(doc, slots.key(entry.art), 'art map__art');
  const [x, y, width, height] = ART.resolve(slots.key(entry.art)).viewBox;
  for (const [name, value] of Object.entries({ x, y, width, height })) art.setAttribute(name, String(value));
  return art;
}

/** Labels kept at `value` for bodies at these values, as the frames keep them. */
function namedAt(layout: CameraLayout, bodies: readonly MapLandmark[], value: number, fade: number): boolean[] {
  const scale = mapScale(layout, value);
  const [cos] = headingOf(layout);
  return keptLabels(bodies.map((body) => ({ x: layout.sun[0] + body.at * scale * cos, opacity: value >= body.at ? smoothstep((body.at * scale - fade) / SPACE.bodyFade.spanPx) : 0 })));
}

export function landmarksPiece({ doc, layer, recipe, slots, stage }: PieceSetup<LandmarksLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera' || layer.anchor !== 'path') return NOTHING;
  const data = slots.data(layer.slot);
  const list = isMapLandmarks(data) ? data : [];
  const start = recipe.measure.start ?? 0;
  const bodies = list.filter((entry) => entry.at > start).slice(0, layer.maxTotal ?? list.length);
  const origins = list.filter((entry) => entry.at <= start);
  const fade = layer.fadeBelowPx ?? 0;
  // Once reached, a body appears with a slow fade over a couple of seconds of focused time (round 2.11, bug 4).
  const reach = (recipe.measure.perMinute * SPACE.bodyFade.reachSeconds) / 60;
  const reached = (entry: MapLandmark, value: number): number => smoothstep((value - entry.at) / reach);
  const group = stage.group('map__landmarks');
  const { label } = SPACE;
  const arts: { readonly holder: SVGGElement; readonly entry: MapLandmark }[] = [];
  let named: { value: number; kept: boolean[] } | null = null;
  const keptAt = (value: number): boolean[] => {
    if (named?.value !== value) named = { value, kept: namedAt(stage.layout, bodies, value, fade) };
    return named.kept;
  };
  const place = (entry: MapLandmark, value: number): string => {
    const [x, y] = pointAt(stage.layout, entry.at, value);
    return translate(x, y);
  };
  const body = (entry: MapLandmark): SVGGElement => {
    const holder = svg(doc, 'g', {});
    arts.push({ holder, entry });
    holder.append(drawBody(doc, slots, entry, colourCss(layer.dot, 'var(--color-accent)')));
    return holder;
  };
  bodies.forEach((entry, index) => {
    // As the frames draw a landmark: its body moved to its point, its name beside it at its own coordinates, both
    // in a group that fades.
    const art = body(entry);
    const text = svg(doc, 'text', { class: 'map__name', fill: label.colour, 'font-size': label.textPx }, [entry.name]);
    const element = svg(doc, 'g', { class: 'map__landmark' }, [art, text]);
    group.append(element);
    stage.track(element, (value) => {
      const scale = mapScale(stage.layout, value);
      return { opacity: value >= entry.at ? Math.round(reached(entry, value) * smoothstep((entry.at * scale - fade) / SPACE.bodyFade.spanPx) * 100) / 100 : 0 };
    });
    stage.track(art, (value) => ({ transform: place(entry, value) }));
    stage.track(text, (value, drawn) => {
      const [x0, y0] = pointAt(stage.layout, entry.at, drawn);
      const [x1, y1] = pointAt(stage.layout, entry.at, value);
      const attrs = { x: number(tenth(x0 + label.dxPx)), y: number(tenth(y0 + label.dyPx)) };
      return { attrs, transform: value === drawn ? 'none' : `translate(${number(x1 - x0)}px, ${number(y1 - y0)}px)`, opacity: keptAt(value)[index] === true ? 1 : 0 };
    });
  });
  for (const entry of origins) {
    const element = body(entry);
    element.setAttribute('class', 'map__landmark map__landmark--start');
    group.append(element);
    stage.track(element, (value) => {
      const scale = mapScale(stage.layout, value);
      return { transform: place(entry, value), opacity: Math.round(smoothstep((entry.at * scale - SPACE.earthFade.gonePxPerAu) / SPACE.earthFade.spanPxPerAu) * 100) / 100 };
    });
  }
  // Each landmark is reached at its own value, and a name drops or returns wherever the gaps cross 70 px or a
  // body crosses 30 %: the minute's glide steps there.
  stage.breaks((from, to) => {
    // The fade's own steps after each landmark, so the glide draws it as a curve.
    const found = bodies.flatMap((entry) => Array.from({ length: SPACE.bodyFade.reachSteps + 1 }, (_, step) => entry.at + (reach * step) / SPACE.bodyFade.reachSteps));
    const steps = 48;
    const signature = (value: number): string => keptAt(value).map((kept) => (kept ? '1' : '0')).join('');
    let previous = signature(from);
    for (let step = 1; step <= steps; step += 1) {
      let high = from + ((to - from) * step) / steps;
      const now = signature(high);
      if (now !== previous) {
        let low = from + ((to - from) * (step - 1)) / steps;
        for (let i = 0; i < 40; i += 1) {
          const middle = (low + high) / 2;
          if (signature(middle) === previous) low = middle;
          else high = middle;
        }
        found.push(high);
      }
      previous = now;
    }
    return found;
  });
  const artSlots = list.flatMap((entry) => (entry.art === undefined ? [] : [entry.art]));
  let gone = false;
  const ready = artSlots.some((id) => !ART.has(slots.key(id)))
    ? slots.images(artSlots).then(() => {
        if (gone) return;
        for (const { holder, entry } of arts) holder.replaceChildren(drawBody(doc, slots, entry, colourCss(layer.dot, 'var(--color-accent)')));
      })
    : undefined;
  return {
    ...(ready === undefined ? {} : { ready }),
    render() {},
    unmount() {
      gone = true;
    },
  };
}
