/**
 * A projected sky (docs/recipes/mode-recipes.md, `starfield` with a `projection`; plan, Display modes >
 * Interstellar). The build draws it (build/sky-art.ts, round 2.10): the whole catalog in the layer's slot (every HYG
 * star to magnitude 5) as a strip one turn wide along the sky's equator, the view's centre in the middle. One sky
 * everywhere, still and turning (owner, round 2.11): the strip shows from the start, its centre on the view's centre,
 * and while the recipe turns the sky (paused) one CSS animation slides it sideways, a full turn in `turnMinutes`,
 * wrapping seamlessly over a second copy beside it; resumed, it stops where it is. Never with low power or reduced
 * motion: the sky then stays still. Nothing is redrawn when the screen's size changes; the images move.
 */

import { CONFIG, PIECES_CONFIG } from '@stopwatch/core';
import type { StarfieldLayer } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import type { Piece, PieceSetup } from '../../recipe/piece.ts';

const REFERENCE = CONFIG.design.reference.timer;
const MINUTE_MS = 60_000;

/** An image the build drew, in reference pixels; `x` and `y` place it from the view's centre. */
export interface SkyImage {
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The sky: one turn wide, with the row of the view's centre, and the results card's sky drawn from it. */
export interface TurningSky extends SkyImage {
  readonly centreY: number;
  readonly card?: SkyImage;
}

const isImage = (value: unknown): value is SkyImage => {
  if (typeof value !== 'object' || value === null) return false;
  const image = value as Record<string, unknown>;
  return typeof image['url'] === 'string' && ['x', 'y', 'width', 'height'].every((key) => typeof image[key] === 'number' && Number.isFinite(image[key]));
};

export function isTurningSky(value: unknown): value is TurningSky {
  if (!isImage(value)) return false;
  const sky = value as unknown as Record<string, unknown>;
  return typeof sky['centreY'] === 'number' && (sky['card'] === undefined || isImage(sky['card']));
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

/** The starfield piece with a projection: the sky, still, turning while the recipe turns it. */
export function skyPiece({ doc, layer, context, slots, stage }: PieceSetup<StarfieldLayer>): Piece {
  const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
  const strip = html(doc, 'div', { class: 'sky__strip', attrs: { 'aria-hidden': 'true' } });
  const box = html(doc, 'div', { class: 'sky__box' }, [strip]);
  const element = html(doc, 'div', { class: 'sky' }, [box]);
  box.style.setProperty('opacity', String(opacity));
  let sky: TurningSky | null = null;
  let pan: Animation | null = null;
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

  /** Places the strip for the view's size: two copies side by side, the view's centre on the right one's middle. */
  const place = (): void => {
    const { width, height } = size();
    if (sky === null) return;
    const { width: turn, height: tall, centreY } = sky;
    strip.style.setProperty('left', px(width / 2 - turn / 2 - turn));
    strip.style.setProperty('top', px(height / 2 - centreY));
    strip.style.setProperty('width', px(2 * turn));
    strip.style.setProperty('height', px(tall));
  };

  /** Turns the sky from where it is, or stops it where it is: nothing jumps. */
  const turn = (on: boolean): void => {
    if (sky === null) return;
    if (!on) {
      pan?.pause();
      return;
    }
    if (pan === null) {
      const minutes = layer.pan?.turnMinutes ?? PIECES_CONFIG.sky.turnMinutes;
      pan = strip.animate([{ transform: 'translateX(0px)' }, { transform: `translateX(${px(sky.width)})` }], { duration: minutes * MINUTE_MS, iterations: Infinity, easing: 'linear' });
    } else if (pan.playState !== 'running') pan.play();
  };

  // The sky shows whole from the first frame: the mode is ready once both copies are decoded.
  const ready = slots.load(layer.slot).then(async (data) => {
    if (stopped() || !isTurningSky(data)) return;
    const images = [skyImage(doc, data, 'sky__image', data.width, 0), skyImage(doc, data, 'sky__image', 0, 0)];
    await decoded(images);
    if (stopped()) return;
    strip.replaceChildren(...images);
    sky = data;
    place();
  });

  place();
  stage?.onLayout(place);

  return {
    backdrop: [element],
    ready,
    render({ paused }) {
      turn((layer.pan?.when ?? []).includes('paused') && paused && !context.lowPower && !context.reducedMotion);
    },
    unmount() {
      gone = true;
      pan?.cancel();
      pan = null;
    },
  };
}
