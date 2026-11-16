/**
 * Timeline: the time at 56 px above a 480 px track, 10 minutes per 100 px
 * with now at the centre, both ends fading out (plan, Design system > Display
 * modes; the revised "timeline" and "timeline at 00:04" frames). The past
 * line and its ticks are muted, the future faint; ticks every 5 minutes and
 * hh:mm labels every 10. Nothing is drawn before the session's start.
 *
 * The track is drawn once, in CSS pixels that are never scaled, with crisp
 * edges, and moves in whole-pixel steps once a minute (an SVG transform set
 * when the minute turns), so nothing blurs. Two clipped copies colour the
 * strip muted before now and faint after. The personal record marker arrives
 * with records in Release 3.
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

const pad = (value: number): string => String(value).padStart(2, '0');

/** Where the strip sits after `focusedMs`: the session's start, in whole pixels, moving once a minute. */
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

export function createTimelineMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let strips: SVGGElement[] = [];
  let shown: number | null = null;

  return {
    id: 'timeline',
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      shown = null;
      const doc = element.ownerDocument;
      const clip = (id: string, x: number): SVGClipPathElement =>
        svg(doc, 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, [svg(doc, 'rect', { x, y: 0, width: NOW_X, height: T.heightPx })]);
      const past = svg(doc, 'g', { class: 'timeline__strip timeline__strip--past' }, marks(doc));
      const future = svg(doc, 'g', { class: 'timeline__strip timeline__strip--future' }, marks(doc));
      const text = svg(doc, 'g', { class: 'timeline__strip' }, labels(doc));
      strips = [past, future, text];
      const drawing = svg(
        doc,
        'svg',
        {
          class: 'timeline__svg',
          width: T.widthPx,
          height: T.heightPx,
          viewBox: `0 0 ${String(T.widthPx)} ${String(T.heightPx)}`,
          'shape-rendering': 'crispEdges',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        [
          svg(doc, 'defs', {}, [clip('timeline-past', 0), clip('timeline-future', NOW_X)]),
          svg(doc, 'g', { 'clip-path': 'url(#timeline-past)' }, [past]),
          svg(doc, 'g', { 'clip-path': 'url(#timeline-future)' }, [future]),
          text,
        ],
      );
      const track = html(doc, 'div', { class: 'timeline__track' }, [drawing]);
      display = new TimeDisplay(doc, context, (time) => [html(doc, 'div', { class: 'timeline' }, [time, track])]);
      element.replaceChildren(display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      const offset = stripOffset(view.focusedMs);
      if (offset === shown) return;
      shown = offset;
      for (const strip of strips) strip.setAttribute('transform', `translate(${String(offset)} 0)`);
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
      root?.replaceChildren();
      root = null;
      display = null;
      strips = [];
    },
  };
}
