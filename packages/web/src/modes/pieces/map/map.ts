/**
 * The map pieces (docs/recipes/mode-recipes.md, The piece library): `circles`, `shape`, `path` and `landmarks` in
 * a recipe's camera space, drawn on the camera's one map (recipe/camera.ts) in the recipe's order: interstellar's
 * orbits, the Sun, the route and the bodies on it (the interstellar frames). Each says how its elements look at a
 * value of the measure; the camera glides them, holds them, and blurs them while held.
 *
 * - `circles`: a circle at each item's value from the anchor, dashed or solid, fading out as its radius shrinks
 *   through `fadeBelowPx` (from 1.5 times it to half of it), at most the layer's opacity.
 * - `shape`: the Sun, a disc with its glow, at the anchor.
 * - `path`: the route from `from` to the current value along the heading, at the layer's opacity, its head drawn
 *   over everything.
 * - `landmarks` anchored to the path: each body drawn as itself (its art slot) where the path crosses its value,
 *   once reached, fading out as its orbit shrinks from `fadeBelowPx` + 14 px to `fadeBelowPx`; its name beside
 *   it, shown only at least 70 px clear of the next name kept further out. A landmark at the trip's start (Earth)
 *   is drawn last, without a name, folding into the Sun's glow as the camera pulls back.
 */

import './map.css';
import { CONFIG, bindingAt, headingDirection, keptLabels, smoothstep } from '@stopwatch/core';
import type { CirclesLayer, LandmarksLayer, PathLayer, ShapeLayer } from '@stopwatch/core';
import { ART } from '../../../art/registry.ts';
import { svg } from '../../../dom.ts';
import type { CameraLayout, CameraStage } from '../../recipe/camera.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';
import type { Slots } from '../../recipe/slots.ts';

const SPACE = CONFIG.modes.interstellar;
const NOTHING: Piece = { render() {} };

/** Pixels per unit of the measure on the map at `value`. */
export function mapScale(layout: CameraLayout, value: number): number {
  return layout.usable / Math.max(value, layout.minValue);
}

/** The heading's direction, to the frames' four decimals. */
function headingOf(layout: CameraLayout): readonly [number, number] {
  return headingDirection(layout.heading);
}

const number = (value: number): string => String(Math.round(value * 10_000) / 10_000);
/** The frames place everything to a tenth of a pixel; so does the map, so a still map is the frame's. */
const tenth = (value: number): number => Math.round(value * 10) / 10;
const translate = (x: number, y: number): string => `translate(${number(tenth(x))}px, ${number(tenth(y))}px)`;

/** Where a value falls on the map: the anchor plus `at` × the scale along the heading. */
function pointAt(layout: CameraLayout, at: number, value: number): readonly [number, number] {
  const scale = mapScale(layout, value);
  const [cos, sin] = headingOf(layout);
  return [layout.sun[0] + at * scale * cos, layout.sun[1] + at * scale * sin];
}

/** A colour and its opacity from a recipe colour, #rrggbbaa included (an SVG fill takes no alpha in every browser). */
function paint(colour: string | undefined, fallback: string): { readonly colour: string; readonly opacity: number } {
  if (colour !== undefined && /^#[0-9A-Fa-f]{8}$/.test(colour)) return { colour: colour.slice(0, 7), opacity: Math.round((parseInt(colour.slice(7), 16) / 255) * 100) / 100 };
  return { colour: colourCss(colour, fallback), opacity: 1 };
}

/** Keeps a group on the anchor (the Sun), turned to the heading if asked, as the map's size changes. */
function anchored(stage: CameraStage, group: SVGGElement, turned: boolean): void {
  const place = (): void => {
    const { sun, heading } = stage.layout;
    group.setAttribute('transform', `translate(${number(sun[0])} ${number(sun[1])})${turned ? ` rotate(${number(heading)})` : ''}`);
  };
  place();
  stage.onLayout(place);
}

export function circlesPiece({ doc, layer, stage }: PieceSetup<CirclesLayer>): Piece {
  if (stage === undefined || layer.space !== 'camera') return NOTHING;
  const group = svg(doc, 'g', {});
  stage.group('map__circles').append(group);
  anchored(stage, group, false);
  const fade = layer.fadeBelowPx ?? 0;
  const { widthPx, dash } = SPACE.ringFade;
  const colour = colourCss(layer.color, 'var(--color-muted)');
  for (const item of layer.items) {
    const circle = svg(doc, 'circle', { r: 1, fill: 'none', stroke: colour, 'stroke-width': widthPx, ...(item.dashed === true ? { 'stroke-dasharray': dash.join(' ') } : {}) });
    group.append(circle);
    stage.track(circle, (value, from) => {
      const radius = item.at * mapScale(stage.layout, value);
      const drawn = Math.max(0.05, tenth(item.at * mapScale(stage.layout, from)));
      const shown = fade > 0 ? smoothstep((radius - fade / 2) / fade) : 1;
      return { attrs: { r: number(drawn) }, transform: value === from ? 'none' : `scale(${String(radius / drawn)})`, opacity: Math.round(bindingAt(layer.opacity ?? 1, { measure: value }) * shown * 100) / 100 };
    });
  }
  return NOTHING;
}

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
      return { opacity: value >= entry.at ? Math.round(smoothstep((entry.at * scale - fade) / SPACE.bodyFade.spanPx) * 100) / 100 : 0 };
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
    const found = bodies.map((entry) => entry.at);
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
  if (artSlots.some((id) => !slots.ready(id)))
    void slots.images(artSlots).then(() => {
      if (gone) return;
      for (const { holder, entry } of arts) holder.replaceChildren(drawBody(doc, slots, entry, colourCss(layer.dot, 'var(--color-accent)')));
    });
  return {
    render() {},
    unmount() {
      gone = true;
    },
  };
}
