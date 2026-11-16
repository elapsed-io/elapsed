/**
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
import './timeline.css';
import { CONFIG } from '@stopwatch/core';
import type { Session, TimerView } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import { timelineStripMinutes } from './strip.ts';
import type { DisplayContext, DisplayMode } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const T = CONFIG.modes.timeline;
const PX_PER_MINUTE = 100 / T.minutesPer100Px;
const NOW_X = T.widthPx / 2;
const MINUTE_MS = 60_000;
/** A gliding layer that has drifted this far from focused time (after sleep, say) is set right. */
const DRIFT_MS = 250;

const pad = (value: number): string => String(value).padStart(2, '0');

/** Where the strip's start sits after `focusedMs` at the start of its minute: in whole pixels. */
export function stripOffset(focusedMs: number): number {
  return NOW_X - Math.floor(Math.max(0, focusedMs) / MINUTE_MS) * PX_PER_MINUTE;
}

/** The line from the session's start and its ticks, in one tone. */
function marks(doc: Document): SVGElement[] {
  const length = timelineStripMinutes() * PX_PER_MINUTE;
  const shapes: SVGElement[] = [svg(doc, 'rect', { x: 0, y: T.lineYPx, width: length, height: T.lineHeightPx })];
  for (let minute = 0; minute <= timelineStripMinutes(); minute += T.tickEveryMinutes) {
    const major = minute % T.labelEveryMinutes === 0;
    shapes.push(svg(doc, 'rect', { x: minute * PX_PER_MINUTE, y: T.lineYPx + T.lineHeightPx, width: T.tickWidthPx, height: major ? T.majorTickPx : T.minorTickPx }));
  }
  return shapes;
}

function labels(doc: Document): SVGTextElement[] {
  const texts: SVGTextElement[] = [];
  for (let minute = 0; minute <= timelineStripMinutes(); minute += T.labelEveryMinutes) {
    const text = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
    texts.push(svg(doc, 'text', { class: 'timeline__label', x: minute * PX_PER_MINUTE, y: T.labelYPx }, [text]));
  }
  return texts;
}

/** One layer of the strip, drawn once: an SVG as long as the strip, which moves as a whole. */
function layer(doc: Document, tone: string, shapes: SVGElement[]): HTMLElement {
  const length = timelineStripMinutes() * PX_PER_MINUTE;
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
  /** Where the layer's own box starts within the track's 480 px, so its strip lines up with the others. */
  readonly origin: number;
  animation: Animation | null;
}

export function createTimelineMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let glides: Glide[] = [];
  /** Where the layers were last put: their offset, whether they glide, and (still) whether they are drawn in place. */
  let anchored: { offset: number; glide: boolean; running: boolean } | null = null;

  const translate = (x: number): string => `translateX(${String(x)}px)`;

  /**
   * Puts every layer at `focusedMs`. While a session runs with full motion, each layer glides 10 px over
   * the rest of the minute on its own compositor layer; the animation is set afresh only when the minute
   * turns, and set right when focused time and the animation disagree (after sleep). Otherwise (idle,
   * paused, a check-in waiting, or low power) the layers stand still where they are, drawn in place
   * like the rest of the page (with low power, on the minute's whole pixel).
   */
  const place = (focusedMs: number, state: 'idle' | 'running' | 'held'): void => {
    const offset = stripOffset(focusedMs);
    const into = Math.max(0, focusedMs) % MINUTE_MS;
    // Low power, which reduced motion also turns on, steps once a minute instead of gliding.
    const still = context?.lowPower === true;
    const glide = state === 'running' && !still;
    if (!glide) {
      // Where the glide had reached: still, and at a whole pixel at the turn of each minute. While held,
      // or with low power, nothing moves, so the layers are drawn in place, not on their own layers
      // (text drawn over them, such as the pause length, keeps its sharpest anti-aliasing).
      const reached = still ? 0 : (into / MINUTE_MS) * PX_PER_MINUTE;
      const flat = state === 'held' || still;
      if (anchored !== null && !anchored.glide && anchored.offset === offset - reached && anchored.running === flat) return;
      for (const layer of glides) {
        layer.animation?.cancel();
        layer.animation = null;
        layer.element.classList.toggle('timeline__glide--still', flat);
        layer.element.style.setProperty('transform', translate(offset - reached - layer.origin));
      }
      anchored = { offset: offset - reached, glide: false, running: flat };
      return;
    }
    for (const layer of glides) {
      const from = offset - layer.origin;
      let animation = layer.animation;
      const fresh = animation === null || anchored?.offset !== offset || !anchored.glide;
      if (fresh) {
        animation?.cancel();
        layer.element.classList.remove('timeline__glide--still');
        layer.element.style.setProperty('transform', translate(from));
        animation = layer.element.animate([{ transform: translate(from) }, { transform: translate(from - PX_PER_MINUTE) }], {
          duration: MINUTE_MS,
          easing: 'linear',
          fill: 'forwards',
        });
        layer.animation = animation;
      }
      if (animation === null) continue;
      if (fresh || animation.playState === 'finished' || Math.abs(Number(animation.currentTime) - into) >= DRIFT_MS) animation.currentTime = into;
      if (animation.playState !== 'running') animation.play();
    }
    anchored = { offset, glide: true, running: true };
  };

  return {
    id: 'timeline',
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      anchored = null;
      const doc = element.ownerDocument;
      const past = layer(doc, 'past', marks(doc));
      const future = layer(doc, 'future', marks(doc));
      const text = layer(doc, 'labels', labels(doc));
      glides = [
        { element: past, origin: 0, animation: null },
        { element: future, origin: NOW_X, animation: null },
        { element: text, origin: 0, animation: null },
      ];
      const frame = html(doc, 'div', { class: 'timeline__frame' }, [
        html(doc, 'div', { class: 'timeline__half timeline__half--past' }, [past]),
        html(doc, 'div', { class: 'timeline__half timeline__half--future' }, [future]),
        text,
      ]);
      const track = html(doc, 'div', { class: 'timeline__track' }, [frame]);
      display = new TimeDisplay(doc, displayContext, (time) => [html(doc, 'div', { class: 'timeline' }, [time, track])]);
      element.replaceChildren(display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      place(view.focusedMs, view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held');
    },
    async replay(target: HTMLElement, session: Session) {
      // The focus strip loads with the results, not with the timer.
      const { drawStrip } = await import('../shared/strip-replay.ts');
      drawStrip(target, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      for (const layer of glides) layer.animation?.cancel();
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      glides = [];
      anchored = null;
    },
  };
}
