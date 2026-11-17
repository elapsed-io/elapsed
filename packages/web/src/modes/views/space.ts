/**
 * The journey replayed (plan, Display modes > Results replays; the "results: interstellar" frame): on one space
 * background across the whole card with a faint star field behind it (no stars on the map itself), the traveller
 * goes out again from Earth's orbit by focused time only, so it never stalls, and the camera pulls back as it goes,
 * resting at the end of the path. The map is the timer's, at −17°: the rings fading as they shrink, each body
 * drawn as itself once reached and fading as its orbit shrinks, Earth folding into the Sun's glow, a name only 70 px
 * clear of the next name kept further out. Comets drift across it, tails away from the Sun. The distance line at
 * its top left counts with the replay.
 *
 * Everything that moves is calculated in CSS from the replay's one animated property (plan, Principles): the
 * distance r = 1 + R × progress (R, the session's distance), the scale k = 476.8 ÷ max(r, 1.6), and from them
 * every ring's scale and opacity, every body's place and opacity, the route and its head, the names (stepping where
 * the replay drops or adds one, worked out here once) and the distance line (counters). Where the browser cannot
 * count, the line shows its final words. The map is an image with its own label.
 */

import './space.css';
import { BRAND, CONFIG, headingDirection, keptLabels, smoothstep, summarise } from '@stopwatch/core';
import type { Recipe, Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import type { ModeOptions, ReplaySurface } from '../contract.ts';
import { drawBody, isMapLandmarks } from '../pieces/map/map.ts';
import type { MapLandmark } from '../pieces/map/map.ts';
import { drawComets, scheduleComets } from '../pieces/particles/comets.ts';
import { drawStill, isStillSky, projectionOf, sizesOf } from '../pieces/starfield/sky.ts';
import { colourCss } from '../recipe/colour.ts';
import { distanceText, zoneName } from '../recipe/recipe-mode.ts';
import type { Slots } from '../recipe/slots.ts';

const SPACE = CONFIG.modes.interstellar;
const MAP = SPACE.results;
const CARD = CONFIG.design.reference.results;
const MINUTE_MS = 60_000;

const find = <T extends Recipe['layers'][number]['type']>(recipe: Recipe, type: T, ids: readonly string[]): Extract<Recipe['layers'][number], { type: T }>[] =>
  recipe.layers.filter((layer): layer is Extract<Recipe['layers'][number], { type: T }> => layer.type === type && ids.includes(layer.id));

const n = (value: number): string => String(Math.round(value * 1e6) / 1e6);

/** CSS for smoothstep(clamp((expression − gone) ÷ span)), as the frames fade things. */
function smooth(expression: string, gone: number, span: number): string {
  return `clamp(0, (${expression} - ${n(gone)}) / ${n(span)}, 1)`;
}

/** Where `kept(p)` changes as p goes from 0 to 1: sampled finely, then each change found by halving. */
export function changes(kept: (progress: number) => boolean, steps = 2000): { readonly start: boolean; readonly at: readonly number[] } {
  const at: number[] = [];
  let previous = kept(0);
  const start = previous;
  for (let step = 1; step <= steps; step += 1) {
    let high = step / steps;
    const now = kept(high);
    if (now !== previous) {
      let low = (step - 1) / steps;
      for (let i = 0; i < 40; i += 1) {
        const middle = (low + high) / 2;
        if (kept(middle) === previous) low = middle;
        else high = middle;
      }
      at.push(high);
    }
    previous = now;
  }
  return { start, at };
}

/** An opacity that steps between 0 and 1 at each change of the replay's progress. */
function steps(start: boolean, at: readonly number[]): string {
  if (at.length === 0) return start ? '1' : '0';
  let expression = start ? '1' : '0';
  let on = start;
  for (const point of at) {
    expression += ` ${on ? '-' : '+'} clamp(0, (var(--replay-progress) - ${n(point)}) * 1000000 + 1, 1)`;
    on = !on;
  }
  return `calc(${expression})`;
}

export async function spaceView(surface: ReplaySurface, session: Session, recipe: Recipe, _options: ModeOptions, slots: Slots): Promise<void> {
  const doc = surface.graphic.ownerDocument;
  const view = recipe.results.view;
  const ids = view.type === 'scene' ? view.layers : [];
  const start = recipe.measure.start ?? 0;
  const focusedMinutes = summarise(session).focusedMs / MINUTE_MS;
  const travelled = focusedMinutes * recipe.measure.perMinute;
  const end = start + travelled;
  const minValue = recipe.camera?.type === 'follow-zoom' ? (recipe.camera.minValue ?? 1) : 1;
  const heading = recipe.camera?.type === 'follow-zoom' ? (recipe.camera.resultsAngle ?? recipe.camera.angle) : 0;
  const [cos, sin] = headingDirection(heading);
  const sun = [MAP.sunX, MAP.sunY] as const;
  const scaleAt = (value: number): number => MAP.usablePx / Math.max(value, minValue);
  const valueAt = (progress: number): number => start + travelled * progress;

  // The card: space from edge to edge, the faint star field behind it.
  const stars = find(recipe, 'starfield', ids)[0];
  const backdrop = svg(doc, 'svg', { class: 'space-card__stars', viewBox: `0 0 ${String(CARD.width)} ${String(CARD.height)}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' });
  const sky = stars?.view === undefined ? undefined : slots.data(stars.view);
  if (stars !== undefined && isStillSky(sky)) backdrop.append(drawStill(doc, sky, sky.faintResults, CARD, CARD.width, CARD.height, projectionOf(stars), sizesOf(stars), SPACE.sky.resultsOpacity));
  surface.backdrop.append(html(doc, 'div', { class: 'space-card' }, [backdrop]));

  // The map, in the frame's pixels.
  const map = svg(doc, 'svg', { class: 'space-map__drawing', viewBox: `0 0 ${String(MAP.widthPx)} ${String(MAP.heightPx)}`, role: 'img', 'aria-label': BRAND.copy.interstellar.map });
  const box = html(doc, 'div', { class: 'space-map' }, [map]);
  const decimals = recipe.measure.decimals ?? 0;
  box.style.setProperty('--space-r', `calc(${n(start)} + ${n(travelled)} * var(--replay-progress))`);
  box.style.setProperty('--space-k', `calc(${n(MAP.usablePx)} / max(var(--space-r), ${n(minValue)}))`);
  // The distance travelled in its last decimal place, for the counters.
  box.style.setProperty('--space-count', `round((var(--space-r) - ${n(start)}) * ${String(10 ** decimals)}, 1)`);
  const kEnd = scaleAt(end);

  // At rest the map is drawn as the frame draws it, every point to a tenth of a pixel; while the replay runs, each
  // moving element takes its place from the progress (space.css: .space-map__moving and .space-map__fading).
  const tenth = (value: number): number => Math.round(value * 10) / 10;
  const point = (at: number, scale: number): readonly [number, number] => [sun[0] + at * scale * cos, sun[1] + at * scale * sin];
  const moving = (element: SVGElement, transform: string): void => {
    element.classList.add('space-map__moving');
    element.style.setProperty('--replay-transform', transform);
  };
  const fading = (element: SVGElement, opacity: string): void => {
    element.classList.add('space-map__fading');
    element.style.setProperty('--replay-opacity', opacity);
  };
  /** CSS for where `at` falls while the replay runs, less where it rests. */
  const shifted = (at: number, rest: readonly [number, number]): string =>
    `translate(calc(${n(sun[0] - rest[0])}px + ${n(at)} * var(--space-k) * ${n(cos)} * 1px), calc(${n(sun[1] - rest[1])}px + ${n(at)} * var(--space-k) * ${n(sin)} * 1px))`;

  // Orbits.
  for (const layer of find(recipe, 'circles', ids)) {
    const fade = layer.fadeBelowPx ?? 0;
    const peak = typeof layer.opacity === 'number' ? layer.opacity : 1;
    const group = svg(doc, 'g', { transform: `translate(${n(sun[0])} ${n(sun[1])})` });
    for (const item of layer.items) {
      const radius = Math.max(0.05, tenth(item.at * kEnd));
      const circle = svg(doc, 'circle', {
        r: n(radius),
        fill: 'none',
        stroke: colourCss(layer.color, 'var(--color-muted)'),
        'stroke-width': SPACE.ringFade.widthPx,
        opacity: n(Math.round(peak * smoothstep((item.at * kEnd - fade / 2) / fade) * 100) / 100),
        ...(item.dashed === true ? { 'stroke-dasharray': SPACE.ringFade.dash.join(' ') } : {}),
      });
      // Scaled while the camera pulls back, its stroke kept as drawn.
      circle.setAttribute('vector-effect', 'non-scaling-stroke');
      circle.style.setProperty('--x', smooth(`${n(item.at)} * var(--space-k)`, fade / 2, fade));
      moving(circle, `scale(calc(${n(item.at)} * var(--space-k) / ${n(radius)}))`);
      fading(circle, `calc(${n(peak)} * var(--x) * var(--x) * (3 - 2 * var(--x)))`);
      group.append(circle);
    }
    map.append(group);
  }

  // The Sun.
  for (const layer of find(recipe, 'shape', ids)) {
    const group = svg(doc, 'g', { transform: `translate(${n(sun[0])} ${n(sun[1])})` });
    if (layer.glow?.color !== undefined) {
      const colour = layer.glow.color;
      const alpha = colour.length === 9 ? Math.round((parseInt(colour.slice(7), 16) / 255) * 100) / 100 : 1;
      group.append(svg(doc, 'circle', { r: layer.glow.blur ?? layer.size[0], fill: colour.slice(0, 7), opacity: alpha }));
    }
    group.append(svg(doc, 'circle', { r: layer.size[0] / 2, fill: colourCss(typeof layer.fill === 'string' ? layer.fill : undefined, 'var(--color-foreground)') }));
    map.append(group);
  }

  // The route, from the start's point to the traveller's.
  const path = find(recipe, 'path', ids)[0];
  const from = path?.from ?? start;
  if (path !== undefined) {
    const [x1, y1] = point(from, kEnd).map(tenth) as [number, number];
    const [x2, y2] = point(end, kEnd).map(tenth) as [number, number];
    const line = svg(doc, 'line', { x1: n(x1), y1: n(y1), x2: n(x2), y2: n(y2), stroke: colourCss(path.color, 'var(--color-foreground)'), 'stroke-width': path.width ?? 1, opacity: n(typeof path.opacity === 'number' ? path.opacity : 1) });
    // Stretched and shifted along the heading only, from where it rests (map.ts, along()).
    const a0 = from * kEnd;
    const length = Math.max(1e-9, (end - from) * kEnd);
    const stretch = `((var(--space-r) - ${n(from)}) * var(--space-k) / ${n(length)})`;
    moving(
      line,
      `translate(${n(sun[0])}px, ${n(sun[1])}px) rotate(${n(heading)}deg) translateX(calc((${n(from)} * var(--space-k) - ${stretch} * ${n(a0)}) * 1px)) scaleX(calc(${stretch})) rotate(${n(-heading)}deg) translate(${n(-sun[0])}px, ${n(-sun[1])}px)`,
    );
    map.append(line);
  }

  // The bodies, each drawn as itself, and their names.
  const landmarks = find(recipe, 'landmarks', ids)[0];
  const data = landmarks === undefined ? undefined : slots.data(landmarks.slot);
  const list: readonly MapLandmark[] = isMapLandmarks(data) ? data : [];
  await slots.images(list.flatMap((entry) => (entry.art === undefined ? [] : [entry.art])));
  const bodies = list.filter((entry) => entry.at > start).slice(0, landmarks?.maxTotal ?? list.length);
  const fade = landmarks?.fadeBelowPx ?? 0;
  const span = SPACE.bodyFade.spanPx;
  const keptAt = (progress: number): boolean[] => {
    const value = valueAt(progress);
    const scale = scaleAt(value);
    return keptLabels(bodies.map((entry) => ({ x: sun[0] + entry.at * scale * cos, opacity: value >= entry.at ? smoothstep((entry.at * scale - fade) / span) : 0 })));
  };
  const finalNames = keptAt(1);
  const dot = colourCss(landmarks?.dot, 'var(--color-accent)');
  const placed = (entry: MapLandmark): SVGGElement => {
    const rest = point(entry.at, kEnd).map(tenth) as [number, number];
    const art = svg(doc, 'g', { transform: `translate(${n(rest[0])} ${n(rest[1])})` }, [drawBody(doc, slots, entry, dot)]);
    moving(art, `translate(calc(${n(sun[0])}px + ${n(entry.at)} * var(--space-k) * ${n(cos)} * 1px), calc(${n(sun[1])}px + ${n(entry.at)} * var(--space-k) * ${n(sin)} * 1px))`);
    return art;
  };
  bodies.forEach((entry, index) => {
    const rest = point(entry.at, kEnd);
    const name = svg(doc, 'text', { x: n(tenth(rest[0] + SPACE.label.dxPx)), y: n(tenth(rest[1] + SPACE.label.dyPx)), class: 'map__name', fill: SPACE.label.colour, 'font-size': SPACE.label.textPx, opacity: finalNames[index] === true ? '1' : '0' }, [entry.name]);
    const named = changes((progress) => keptAt(progress)[index] === true);
    moving(name, shifted(entry.at, rest));
    fading(name, steps(named.start, named.at));
    const shown = end >= entry.at ? Math.round(smoothstep((entry.at * kEnd - fade) / span) * 100) / 100 : 0;
    const element = svg(doc, 'g', { class: 'map__landmark', opacity: n(shown) }, [placed(entry), name]);
    element.style.setProperty('--x', smooth(`${n(entry.at)} * var(--space-k)`, fade, span));
    element.style.setProperty('--on', `clamp(0, (var(--space-r) - ${n(entry.at)}) * 1000000 + 1, 1)`);
    fading(element, 'calc(var(--on) * var(--x) * var(--x) * (3 - 2 * var(--x)))');
    map.append(element);
  });
  for (const entry of list.filter((item) => item.at <= start)) {
    const { gonePxPerAu, spanPxPerAu } = SPACE.earthFade;
    const element = placed(entry);
    element.classList.add('map__landmark', 'map__landmark--start');
    element.setAttribute('opacity', n(Math.round(smoothstep((entry.at * kEnd - gonePxPerAu) / spanPxPerAu) * 100) / 100));
    element.style.setProperty('--x', smooth(`${n(entry.at)} * var(--space-k)`, gonePxPerAu, spanPxPerAu));
    fading(element, 'calc(var(--x) * var(--x) * (3 - 2 * var(--x)))');
    map.append(element);
  }

  // The traveller.
  if (path?.head !== undefined) {
    const rest = point(end, kEnd).map(tenth) as [number, number];
    const head = svg(doc, 'circle', { cx: n(rest[0]), cy: n(rest[1]), r: (path.head.size ?? 6) / 2, fill: colourCss(path.head.color, 'var(--color-foreground)') });
    moving(head, `translate(calc(${n(sun[0] - rest[0])}px + var(--space-r) * var(--space-k) * ${n(cos)} * 1px), calc(${n(sun[1] - rest[1])}px + var(--space-r) * var(--space-k) * ${n(sin)} * 1px))`);
    map.append(head);
  }

  // Comets, while the results show (never with reduced motion: the results screen's own reduced motion).
  const comets = find(recipe, 'particles', ids)[0];
  const reduced = doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  if (comets?.shape === 'comet' && !reduced) {
    const cometBox = html(doc, 'div', { class: 'comets__box' }, drawComets(doc, scheduleComets(comets, MAP.widthPx, MAP.heightPx, sun)));
    box.append(html(doc, 'div', { class: 'comets' }, [cometBox]));
  }

  // The distance line: counted while the replay runs, its final words once it lands.
  const template = recipe.states?.paused?.caption ?? '{distance} au travelled · {zone}';
  const final = template.replace('{distance}', distanceText(recipe, end)).replace('{zone}', zoneName(recipe, end));
  const counting = html(doc, 'span', { class: 'space-map__counting', attrs: { 'aria-hidden': 'true' } });
  for (const part of template.split(/(\{distance\}|\{zone\})/)) {
    if (part === '{distance}') counting.append(html(doc, 'span', { class: decimals > 0 ? 'space-map__number space-map__number--tenths' : 'space-map__number' }));
    else if (part === '{zone}') {
      const zones = (recipe.zones ?? []).filter(([, , at], index, all) => at <= end && (all[index + 1]?.[2] ?? Number.POSITIVE_INFINITY) > Math.min(start, end) - 1e-9);
      const stack = html(doc, 'span', { class: 'space-map__zones' });
      zones.forEach(([, label, at], index) => {
        const next = zones[index + 1]?.[2];
        const shown = html(doc, 'span', {}, [label]);
        const on = `clamp(0, (var(--space-r) - ${n(at)}) * 1000000 + 1, 1)`;
        const off = next === undefined ? '0' : `clamp(0, (var(--space-r) - ${n(next)}) * 1000000 + 1, 1)`;
        shown.style.setProperty('opacity', index === 0 ? `calc(1 - ${off})` : `calc(${on} - ${off})`);
        stack.append(shown);
      });
      counting.append(stack);
    } else if (part !== '') counting.append(part);
  }
  const distance = html(doc, 'div', { class: 'space-map__distance', attrs: { 'aria-hidden': 'true' } }, [html(doc, 'span', { class: 'space-map__final' }, [final]), counting]);
  box.append(distance, html(doc, 'p', { class: 'visually-hidden' }, [final]));
  // Counting needs round() and mod() (as the headline's count, results.ts).
  if (typeof CSS !== 'undefined' && CSS.supports('width', 'calc(mod(7px, 3px) + round(down, 7px, 2px))')) box.classList.add('space-map--counting');
  surface.graphic.append(box);

  // The comets' box follows the map's width on narrow windows (the map never grows past its frame size).
  const cometBox = box.querySelector<HTMLElement>('.comets__box');
  if (cometBox !== null && typeof ResizeObserver !== 'undefined') {
    cometBox.style.setProperty('width', `${String(MAP.widthPx)}px`);
    cometBox.style.setProperty('height', `${String(MAP.heightPx)}px`);
    new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? MAP.widthPx;
      cometBox.style.setProperty('transform', `scale(${String(width / MAP.widthPx)})`);
    }).observe(box);
  }
}
