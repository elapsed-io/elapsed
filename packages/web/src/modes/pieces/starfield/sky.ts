/**
 * A projected sky (docs/recipes/mode-recipes.md, `starfield` with a `projection`; plan, Display modes >
 * Interstellar). The build draws it (build/sky-art.ts, round 2.10): the still view (the layer's `view` catalog
 * projected about the view's centre, over the faint stars tiled from the frame's corner) and the whole catalog in
 * the layer's slot as a strip one turn wide along the sky's equator. The device only places those images: the still
 * view from the view's centre, the strip twice side by side, slid sideways by one CSS animation while the recipe
 * turns the sky (paused), a full turn in `turnMinutes`, wrapping seamlessly, crossfading from the still view over
 * 2 s. Never with low power or reduced motion: the sky then stays still. Nothing is redrawn when the screen's size
 * changes; the images move.
 */

import { CONFIG } from '@stopwatch/core';
import type { StarfieldLayer } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';

const REFERENCE = CONFIG.design.reference.timer;

/** An image the build drew, in reference pixels; `x` and `y` place the still view's stars from the view's centre. */
export interface SkyImage {
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The still sky's images: the projected stars, the faint stars' tile and the results card's whole sky. */
export interface StillSky {
  readonly still: SkyImage;
  readonly faint: SkyImage;
  readonly card: SkyImage;
}

/** The turning sky: one turn wide, with the row of the view's centre. */
export interface TurningSky extends SkyImage {
  readonly centreY: number;
}

const isImage = (value: unknown): value is SkyImage => {
  if (typeof value !== 'object' || value === null) return false;
  const image = value as Record<string, unknown>;
  return typeof image['url'] === 'string' && ['x', 'y', 'width', 'height'].every((key) => typeof image[key] === 'number' && Number.isFinite(image[key]));
};

export function isStillSky(value: unknown): value is StillSky {
  if (typeof value !== 'object' || value === null) return false;
  const sky = value as Record<string, unknown>;
  return isImage(sky['still']) && isImage(sky['faint']) && isImage(sky['card']);
}

export function isTurningSky(value: unknown): value is TurningSky {
  return isImage(value) && typeof (value as unknown as Record<string, unknown>)['centreY'] === 'number';
}

const px = (value: number): string => `${String(value)}px`;

/** An image the build drew, placed in reference pixels, decoded off the main thread before it shows. */
export function skyImage(doc: Document, image: SkyImage, className: string, left: number, top: number): HTMLImageElement {
  const element = html(doc, 'img', { class: className, attrs: { src: image.url, alt: '', decoding: 'async', draggable: 'false' } });
  element.style.setProperty('left', px(left));
  element.style.setProperty('top', px(top));
  element.style.setProperty('width', px(image.width));
  element.style.setProperty('height', px(image.height));
  return element;
}

/** Waits for images to decode; one that fails is shown as it is (blank), never holding the mode back. */
export async function decoded(images: readonly HTMLImageElement[]): Promise<void> {
  await Promise.all(images.map(async (image) => image.decode().catch(() => undefined)));
}

/** The starfield piece with a projection: the still view, and the turning sky while the recipe turns it. */
export function skyPiece({ doc, layer, context, slots, stage }: PieceSetup<StarfieldLayer>): Piece {
  const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
  const view = layer.view === undefined ? undefined : slots.data(layer.view);
  const sky = isStillSky(view) ? view : null;
  const faint = html(doc, 'div', { class: 'sky__faint' });
  const bright = sky === null ? null : skyImage(doc, sky.still, 'sky__image', 0, 0);
  const still = html(doc, 'div', { class: 'sky__still', attrs: { 'aria-hidden': 'true' } }, [faint, ...(bright === null ? [] : [bright])]);
  const strip = html(doc, 'div', { class: 'sky__strip', attrs: { 'aria-hidden': 'true' } });
  const turning = html(doc, 'div', { class: 'sky__turning' }, [strip]);
  const box = html(doc, 'div', { class: 'sky__box' }, [still, turning]);
  const element = html(doc, 'div', { class: 'sky' }, [box]);
  box.style.setProperty('opacity', String(opacity));
  if (sky !== null) {
    faint.style.setProperty('background-image', `url("${sky.faint.url}")`);
    faint.style.setProperty('background-size', `${px(sky.faint.width)} ${px(sky.faint.height)}`);
  }
  let strips: { readonly sky: TurningSky; readonly images: readonly HTMLImageElement[] } | null = null;
  let loading = false;
  let pan: Animation | null = null;
  let wanted = false;
  let gone = false;
  // Read through a function: unmount sets it while a load awaits, where TypeScript cannot see it.
  const stopped = (): boolean => gone;

  /** The view's size in reference pixels, the box scaled like the time. */
  const size = (): { readonly width: number; readonly height: number } => {
    const layout = stage?.layout;
    const win = doc.defaultView;
    const scale = layout?.scale ?? Math.min((win?.innerWidth ?? REFERENCE.width) / REFERENCE.width, (win?.innerHeight ?? REFERENCE.height) / REFERENCE.height);
    const width = layout?.width ?? (win?.innerWidth ?? REFERENCE.width) / scale;
    const height = layout?.height ?? (win?.innerHeight ?? REFERENCE.height) / scale;
    box.style.setProperty('width', px(width));
    box.style.setProperty('height', px(height));
    box.style.setProperty('transform', `scale(${String(scale)})`);
    return { width, height };
  };

  /** Places the images for the view's size; nothing is redrawn. */
  const place = (): void => {
    const { width, height } = size();
    if (sky !== null && bright !== null) {
      bright.style.setProperty('left', px(width / 2 + sky.still.x));
      bright.style.setProperty('top', px(height / 2 + sky.still.y));
    }
    if (strips !== null) {
      // Two strips side by side, the second a turn to the left of the first, so the slide wraps without a seam.
      const { width: turn, height: tall, centreY } = strips.sky;
      strip.style.setProperty('left', px(width / 2 - turn / 2 - turn));
      strip.style.setProperty('top', px(height / 2 - centreY));
      strip.style.setProperty('width', px(2 * turn));
      strip.style.setProperty('height', px(tall));
    }
  };

  /** Starts the turn from the current view, so nothing jumps. */
  const startTurning = (): void => {
    if (strips === null) return;
    pan?.cancel();
    const minutes = layer.pan?.turnMinutes ?? 6;
    pan = strip.animate([{ transform: 'translateX(0px)' }, { transform: `translateX(${px(strips.sky.width)})` }], { duration: minutes * 60_000, iterations: Infinity, easing: 'linear' });
    element.classList.add('sky--turning');
  };

  const turnSky = (on: boolean): void => {
    if (on === wanted) return;
    wanted = on;
    if (!on) {
      element.classList.remove('sky--turning');
      return;
    }
    if (strips !== null) {
      startTurning();
      return;
    }
    if (loading) return;
    loading = true;
    void slots.load(layer.slot).then(async (data) => {
      if (stopped() || !isTurningSky(data)) return;
      const images = [skyImage(doc, data, 'sky__image', data.width, 0), skyImage(doc, data, 'sky__image', 0, 0)];
      // The strip shows only once both copies are decoded, so the crossfade never shows an empty sky.
      await decoded(images);
      loading = false;
      if (stopped()) return;
      strip.replaceChildren(...images);
      strips = { sky: data, images };
      place();
      if (wanted) startTurning();
    });
  };

  place();
  stage?.onLayout(place);

  return {
    backdrop: [element],
    ready: bright === null ? Promise.resolve() : decoded([bright]),
    render({ paused }) {
      const turns = (layer.pan?.when ?? []).includes('paused') && paused && !context.lowPower && !context.reducedMotion;
      turnSky(turns);
    },
    unmount() {
      gone = true;
      pan?.cancel();
      pan = null;
    },
  };
}
