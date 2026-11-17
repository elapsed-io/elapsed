/**
 * The track piece (the timeline's recipe).
 *
 * Timeline: the time at 56 px above a 480 px track, 10 minutes per 100 px
 * with now at the centre, both ends fading out (plan, Design system > Display
 * modes; the revised "timeline" and "timeline at 00:04" frames). The past
 * line and its ticks are muted, the future faint; ticks every 5 minutes and
 * hh:mm labels every 10. Nothing is drawn before the session's start.
 *
 * The strip is drawn once, in CSS pixels that are never scaled, with crisp
 * edges, as three layers: the line in the past colour, the line in the future
 * colour, and the labels. Two fixed halves of the track clip the two lines at
 * now. While a session runs, the layers glide continuously at 10 px a minute
 * through one linear transform animation each, on their own compositor
 * layers, so nothing is redrawn: script sets the animation's start once a
 * minute (and when the session resumes or the tab returns) and never runs a
 * loop. Paused or waiting for a check-in, the strip stands still where it
 * was, drawn in place. With low power (or reduced motion) it steps once a minute instead.
 * The personal record marker arrives with records in Release 3.
 */

import 'virtual:tokens/timeline.css';
import './track.css';
import { TIMELINE_CONFIG } from '@stopwatch/core';
import type { TrackLayer } from '@stopwatch/core';
import { html, svg } from '../../../dom.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';
import { timelineStripMinutes } from './strip.ts';

const T = TIMELINE_CONFIG;
const MINUTE_MS = 60_000;
/** A gliding layer that has drifted this far from focused time (after sleep, say) is set right. */
const DRIFT_MS = 250;

const pad = (value: number): string => String(value).padStart(2, '0');

/** The track's numbers from its layer: the frame's 480 px, 10 px a minute, ticks every 5 minutes, labels every 10. */
export interface TrackShape {
  readonly widthPx: number;
  readonly pxPerMinute: number;
  readonly tickEvery: number;
  readonly labelEvery: number;
}

const FRAME: TrackShape = { widthPx: T.widthPx, pxPerMinute: 100 / T.minutesPer100Px, tickEvery: T.tickEveryMinutes, labelEvery: T.labelEveryMinutes };

export function trackShape(layer: TrackLayer): TrackShape {
  return { widthPx: layer.width ?? FRAME.widthPx, pxPerMinute: layer.pxPerMinute ?? FRAME.pxPerMinute, tickEvery: layer.ticks?.every ?? FRAME.tickEvery, labelEvery: layer.ticks?.labelEvery ?? FRAME.labelEvery };
}

/** Where the strip's start sits after `focusedMs` at the start of its minute: in whole pixels. */
export function stripOffset(focusedMs: number, shape: TrackShape = FRAME): number {
  return shape.widthPx / 2 - Math.floor(Math.max(0, focusedMs) / MINUTE_MS) * shape.pxPerMinute;
}

/** The line from the session's start and its ticks, in one tone. */
function marks(doc: Document, shape: TrackShape): SVGElement[] {
  const minutes = timelineStripMinutes();
  const shapes: SVGElement[] = [svg(doc, 'rect', { x: 0, y: T.lineYPx, width: minutes * shape.pxPerMinute, height: T.lineHeightPx })];
  for (let minute = 0; minute <= minutes; minute += shape.tickEvery) {
    const major = minute % shape.labelEvery === 0;
    shapes.push(svg(doc, 'rect', { x: minute * shape.pxPerMinute, y: T.lineYPx + T.lineHeightPx, width: T.tickWidthPx, height: major ? T.majorTickPx : T.minorTickPx }));
  }
  return shapes;
}

function labels(doc: Document, shape: TrackShape): SVGTextElement[] {
  const texts: SVGTextElement[] = [];
  for (let minute = 0; minute <= timelineStripMinutes(); minute += shape.labelEvery) {
    const text = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
    texts.push(svg(doc, 'text', { class: 'timeline__label', x: minute * shape.pxPerMinute, y: T.labelYPx }, [text]));
  }
  return texts;
}

/** One layer of the strip, drawn once: an SVG as long as the strip, which moves as a whole. */
function layer(doc: Document, tone: string, shape: TrackShape, shapes: SVGElement[]): HTMLElement {
  const length = timelineStripMinutes() * shape.pxPerMinute;
  const drawing = svg(
    doc,
    'svg',
    {
      class: `timeline__svg timeline__strip timeline__strip--${tone}`,
      width: length,
      height: T.heightPx,
      viewBox: `0 0 ${String(length)} ${String(T.heightPx)}`,
      'shape-rendering': 'crispEdges',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    shapes,
  );
  return html(doc, 'div', { class: 'timeline__glide' }, [drawing]);
}

interface Glide {
  readonly element: HTMLElement;
  /** Where the layer's own box starts within the track, so its strip lines up with the others. */
  readonly origin: number;
  animation: Animation | null;
}

/**
 * The track (the `track` piece): a time scale scrolling under now, past and future in their own tones, with
 * faded ends. Its personal-record marker reads the personal record, which Release 3 brings; until then it draws
 * none.
 */
export function trackPiece({ doc, layer: spec, context }: PieceSetup<TrackLayer>): Piece {
  const shape = trackShape(spec);
  const nowX = shape.widthPx / 2;
  const past = layer(doc, 'past', shape, marks(doc, shape));
  const future = layer(doc, 'future', shape, marks(doc, shape));
  const text = layer(doc, 'labels', shape, labels(doc, shape));
  const glides: Glide[] = [
    { element: past, origin: 0, animation: null },
    { element: future, origin: nowX, animation: null },
    { element: text, origin: 0, animation: null },
  ];
  /** Where the layers were last put: their offset, whether they glide, and (still) whether they are drawn in place. */
  let anchored: { offset: number; glide: boolean; running: boolean } | null = null;
  const translate = (x: number): string => `translateX(${String(x)}px)`;

  const frame = html(doc, 'div', { class: 'timeline__frame' }, [
    html(doc, 'div', { class: 'timeline__half timeline__half--past' }, [past]),
    html(doc, 'div', { class: 'timeline__half timeline__half--future' }, [future]),
    text,
  ]);
  const track = html(doc, 'div', { class: spec.fadeEnds === false ? 'timeline__track timeline__track--sharp' : 'timeline__track' }, [frame]);

  /**
   * Puts every layer at `focusedMs`. While a session runs with full motion, each layer glides a minute's
   * pixels over the rest of the minute on its own compositor layer; the animation is set afresh only when the
   * minute turns, and set right when focused time and the animation disagree (after sleep). Otherwise (idle,
   * paused, a check-in waiting, or low power) the layers stand still where they are, drawn in place
   * like the rest of the page (with low power, on the minute's whole pixel).
   */
  const place = (focusedMs: number, state: Activity): void => {
    const offset = stripOffset(focusedMs, shape);
    const into = Math.max(0, focusedMs) % MINUTE_MS;
    // Low power, which reduced motion also turns on, steps once a minute instead of gliding.
    const still = context.lowPower;
    const glide = state === 'running' && !still;
    if (!glide) {
      // Where the glide had reached: still, and at a whole pixel at the turn of each minute. While held,
      // or with low power, nothing moves, so the layers are drawn in place, not on their own layers
      // (text drawn over them, such as the pause length, keeps its sharpest anti-aliasing).
      const reached = still ? 0 : (into / MINUTE_MS) * shape.pxPerMinute;
      const flat = state === 'held' || still;
      if (anchored !== null && !anchored.glide && anchored.offset === offset - reached && anchored.running === flat) return;
      for (const item of glides) {
        item.animation?.cancel();
        item.animation = null;
        item.element.classList.toggle('timeline__glide--still', flat);
        item.element.style.setProperty('transform', translate(offset - reached - item.origin));
      }
      anchored = { offset: offset - reached, glide: false, running: flat };
      return;
    }
    for (const item of glides) {
      const from = offset - item.origin;
      let animation = item.animation;
      const fresh = animation === null || anchored?.offset !== offset || !anchored.glide;
      if (fresh) {
        animation?.cancel();
        item.element.classList.remove('timeline__glide--still');
        item.element.style.setProperty('transform', translate(from));
        animation = item.element.animate([{ transform: translate(from) }, { transform: translate(from - shape.pxPerMinute) }], {
          duration: MINUTE_MS,
          easing: 'linear',
          fill: 'forwards',
        });
        item.animation = animation;
      }
      if (animation === null) continue;
      if (fresh || animation.playState === 'finished' || Math.abs(Number(animation.currentTime) - into) >= DRIFT_MS) animation.currentTime = into;
      if (animation.playState !== 'running') animation.play();
    }
    anchored = { offset, glide: true, running: true };
  };

  return {
    figure: {
      className: 'timeline',
      nodes: [track],
      style: { '--timeline-width': `${String(shape.widthPx)}px`, '--track-past': colourCss(spec.past, 'var(--color-muted)'), '--track-future': colourCss(spec.future, 'var(--color-faint)') },
    },
    render({ view, activity }) {
      place(view.focusedMs, activity);
    },
    unmount() {
      for (const item of glides) item.animation?.cancel();
      anchored = null;
    },
  };
}
