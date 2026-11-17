/**
 * The camera (docs/recipes/mode-recipes.md, `camera`): a recipe's `follow-zoom` camera places its camera-space
 * layers (interstellar's orbits, Sun, route and landmarks) on one map, drawn in the recipe's order in one SVG, so
 * they paint as the frames draw them and blur as one while held.
 *
 * The map is drawn in reference pixels (the timer's frames are 720 × 450): its view box is the screen divided by
 * the site's scale (--u, min(width ÷ 720, height ÷ 450)), so at 720 × 450 it is the frame itself, and on any other
 * screen it is drawn at the frame's sizes, scaled like the time. The anchor (the Sun) is a share of that box, and
 * the usable path runs 85 % of the way along the heading to 20 px short of its right edge.
 *
 * Motion (plan, Principles): the zoom glides continuously while a session runs. Each layer says how each of its
 * elements looks at a value (a transform and an opacity, and attributes set once a minute); once a minute the
 * stage animates every element linearly from the minute's start to its end, with steps where something is passed
 * mid-minute (a landmark reached, a name dropped), and keeps the animations on the session's own time. Standing
 * still, paused or waiting for a check-in, everything is set in place; with low power (or reduced motion) it steps
 * once a minute.
 *
 * Held (paused, or a check-in due), the map shows a still copy blurred 10 px at 40 %, crossfaded with the map over
 * the interface's fade, so the blur itself never animates and the sky under it stays sharp.
 */

import { measureAt } from '@stopwatch/core';
import type { Recipe } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import type { DisplayContext } from '../contract.ts';
import type { Frame } from './piece.ts';
import './camera.css';

const MINUTE_MS = 60_000;
const DRIFT_MS = 250;

/** The map's geometry in reference pixels. */
export interface CameraLayout {
  readonly width: number;
  readonly height: number;
  /** CSS pixels per reference pixel. */
  readonly scale: number;
  readonly sun: readonly [number, number];
  readonly heading: number;
  readonly usable: number;
  readonly minValue: number;
}

/** How an element looks at a value: a transform and an opacity (animated), and attributes (set once a minute). */
export interface Look {
  readonly transform?: string;
  readonly opacity?: number;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** An element's look at `value`, drawn from `from` (where its attributes were set). */
export type LookAt = (value: number, from: number) => Look;

interface Tracked {
  readonly element: SVGElement;
  readonly look: LookAt;
  animation: Animation | null;
}

/** The camera layout for a box `width` × `height` CSS pixels. */
export function cameraLayout(recipe: Recipe, width: number, height: number, reference: { readonly width: number; readonly height: number }): CameraLayout {
  const camera = recipe.camera;
  const scale = Math.max(1e-6, Math.min(width / reference.width, height / reference.height));
  const w = width / scale;
  const h = height / scale;
  if (camera?.type !== 'follow-zoom') return { width: w, height: h, scale, sun: [w / 2, h / 2], heading: 0, usable: w / 2, minValue: 1 };
  const sun = [camera.anchor[0] * w, camera.anchor[1] * h] as const;
  const heading = camera.angle;
  // To a tenth of a pixel, as the frames write it (606.5 px at 720 × 450).
  const usable = Math.round((((camera.usable ?? 0.85) * (w - EDGE_MARGIN - sun[0])) / Math.cos((heading * Math.PI) / 180)) * 10) / 10;
  return { width: w, height: h, scale, sun, heading, usable, minValue: camera.minValue ?? 1 };
}

/** The frames keep the usable path 20 px short of the right edge. */
const EDGE_MARGIN = 20;

export class CameraStage {
  readonly element: HTMLElement;
  readonly #doc: Document;
  readonly #recipe: Recipe;
  readonly #context: DisplayContext;
  readonly #map: SVGSVGElement;
  readonly #held: HTMLElement;
  readonly #tracked: Tracked[] = [];
  readonly #breakers: ((from: number, to: number) => readonly number[])[] = [];
  #front: SVGGElement | null = null;
  readonly #listeners: (() => void)[] = [];
  readonly #blurs: boolean;
  #layout: CameraLayout;
  #observer: ResizeObserver | null = null;
  #minute: number | null = null;
  #last: Frame | null = null;
  #heldValue: number | null = null;
  #span: { readonly from: number; readonly to: number; readonly values: readonly number[] } | null = null;

  constructor(doc: Document, recipe: Recipe, context: DisplayContext, reference: { readonly width: number; readonly height: number }, blurs: boolean) {
    this.#doc = doc;
    this.#recipe = recipe;
    this.#context = context;
    this.#blurs = blurs;
    const view = doc.defaultView;
    this.#layout = cameraLayout(recipe, view?.innerWidth ?? reference.width, view?.innerHeight ?? reference.height, reference);
    this.#map = svg(doc, 'svg', { class: 'camera__map', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
    this.#held = html(doc, 'div', { class: 'camera__held', attrs: { 'aria-hidden': 'true' } });
    this.element = html(doc, 'div', { class: 'camera' }, [this.#map, this.#held]);
    this.#size();
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (box === undefined || box.width === 0 || box.height === 0) return;
        const next = cameraLayout(recipe, box.width, box.height, reference);
        const now = this.#layout;
        if (Math.abs(next.width - now.width) < 0.01 && Math.abs(next.height - now.height) < 0.01 && Math.abs(next.scale - now.scale) < 1e-6) return;
        this.#layout = next;
        this.#size();
        for (const listener of this.#listeners) listener();
        this.#minute = null;
        this.#span = null;
        if (this.#last !== null) this.render(this.#last);
      });
      this.#observer.observe(this.element);
    }
  }

  get layout(): CameraLayout {
    return this.#layout;
  }

  /** A layer's own group on the map, in the order the layers ask for them (the recipe's). */
  group(className: string): SVGGElement {
    const group = svg(this.#doc, 'g', { class: className });
    this.#map.insertBefore(group, this.#front);
    return group;
  }

  /** A group drawn over every layer's (the route's head, which the frames draw last). */
  front(className: string): SVGGElement {
    const group = svg(this.#doc, 'g', { class: className });
    this.#front ??= this.#map.appendChild(svg(this.#doc, 'g', { class: 'camera__front' }));
    this.#front.append(group);
    return group;
  }

  /** Called when the map's size changes, before it is drawn again. */
  onLayout(listener: () => void): void {
    this.#listeners.push(listener);
  }

  /** An element the stage moves: its look at each value. */
  track(element: SVGElement, look: LookAt): void {
    this.#tracked.push({ element, look, animation: null });
  }

  /**
   * Where, between two values, something steps or turns (a landmark reached, a name dropped, the camera starting to
   * pull back): each minute's glides sample those values.
   */
  breaks(within: (from: number, to: number) => readonly number[]): void {
    this.#breakers.push(within);
  }

  /** Draws every tracked element for `frame`; then, held, the blurred copy. Called after the layers render. */
  render(frame: Frame): void {
    this.#last = frame;
    const { view, activity } = frame;
    const measure = this.#recipe.measure;
    const stepped = this.#context.lowPower;
    const focused = Math.max(0, view.focusedMs);
    const minute = Math.floor(focused / MINUTE_MS);
    if (activity !== 'running' || stepped) {
      this.#minute = null;
      const value = measureAt(measure, stepped || activity === 'idle' ? minute * MINUTE_MS : focused);
      for (const item of this.#tracked) this.#still(item, value);
    } else {
      const into = focused - minute * MINUTE_MS;
      const fresh = this.#minute !== minute;
      if (fresh) {
        this.#minute = minute;
        const from = measureAt(measure, minute * MINUTE_MS);
        const to = measureAt(measure, (minute + 1) * MINUTE_MS);
        for (const item of this.#tracked) this.#glide(item, from, to);
      }
      for (const item of this.#tracked) {
        const animation = item.animation;
        if (animation === null) continue;
        if (fresh || animation.playState === 'finished' || Math.abs(Number(animation.currentTime) - into) >= DRIFT_MS) animation.currentTime = into;
        if (animation.playState !== 'running') animation.play();
      }
    }
    this.#hold(frame);
  }

  unmount(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    for (const item of this.#tracked) item.animation?.cancel();
  }

  #size(): void {
    const { width, height } = this.#layout;
    this.#map.setAttribute('viewBox', `0 0 ${width.toFixed(3)} ${height.toFixed(3)}`);
  }

  #apply(element: SVGElement, look: Look): void {
    for (const [name, value] of Object.entries(look.attrs ?? {})) element.setAttribute(name, value);
    if (look.transform !== undefined) element.style.setProperty('transform', look.transform);
    if (look.opacity !== undefined) element.style.setProperty('opacity', String(look.opacity));
  }

  #still(item: Tracked, value: number): void {
    item.animation?.cancel();
    item.animation = null;
    this.#apply(item.element, item.look(value, value));
  }

  /** The minute's glide from `from` to `to`: linear between its ends and every break within it, stepping at breaks. */
  #glide(item: Tracked, from: number, to: number): void {
    item.animation?.cancel();
    item.animation = null;
    const base = item.look(from, from);
    this.#apply(item.element, base);
    if (to <= from) return;
    const span = to - from;
    const inside = this.#within(from, to);
    const frames: Keyframe[] = [];
    const frame = (value: number, offset: number): void => {
      const look = item.look(value, from);
      frames.push({ offset, ...(look.transform === undefined ? {} : { transform: look.transform }), ...(look.opacity === undefined ? {} : { opacity: look.opacity }) });
    };
    frame(from, 0);
    for (const value of inside) {
      const offset = (value - from) / span;
      // Just before and at the break: a step where something changes there, a corner where it does not.
      frame(value - span * 1e-9, offset);
      frame(value, offset);
    }
    frame(to, 1);
    if (frames.every((keyframe) => keyframe['transform'] === undefined && keyframe['opacity'] === undefined)) return;
    item.animation = item.element.animate(frames, { duration: MINUTE_MS, easing: 'linear', fill: 'forwards' });
  }

  /** The breaks inside a minute's span, once for all its elements. */
  #within(from: number, to: number): readonly number[] {
    if (this.#span?.from === from && this.#span.to === to) return this.#span.values;
    const found = new Set<number>();
    const minValue = this.#layout.minValue;
    if (minValue > from && minValue < to) found.add(minValue);
    for (const within of this.#breakers) for (const value of within(from, to)) if (value > from && value < to) found.add(value);
    const values = [...found].sort((a, b) => a - b);
    this.#span = { from, to, values };
    return values;
  }

  /** Held: a still copy of the map, blurred, crossfaded with it (camera.css). */
  #hold(frame: Frame): void {
    const held = this.#blurs && frame.activity === 'held';
    if (held && this.#heldValue !== frame.value) {
      this.#heldValue = frame.value;
      const still = this.#map.cloneNode(true) as SVGSVGElement;
      still.setAttribute('class', 'camera__still');
      this.#held.replaceChildren(still);
    }
    if (!held) this.#heldValue = null;
    this.element.classList.toggle('camera--held', held);
  }
}
