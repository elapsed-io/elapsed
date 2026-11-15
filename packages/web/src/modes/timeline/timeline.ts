/**
 * Timeline: at reference, 10 minutes per 100 px with now at the centre; the
 * past line muted, the future faint; ticks every 5 minutes and hh:mm labels
 * every 10 (plan, Design system > Display modes; the timeline frame).
 *
 * The whole strip of ticks for the longest possible session is drawn once and
 * slides by a CSS animation pinned to focused time; two clipped copies colour
 * the ticks muted before now and faint after. The personal record marker
 * arrives in Release 3.
 */

import 'virtual:tokens/timeline.css';
import './timeline.css';
import { CONFIG } from '@stopwatch/core';
import type { TimerView } from '@stopwatch/core';
import { html, svg, syncAnimations } from '../../dom.ts';
import { timelineStripMinutes } from './strip.ts';
import type { DisplayContext, DisplayMode } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const T = CONFIG.modes.timeline;
const PX_PER_MINUTE = 100 / T.minutesPer100Px;
const NOW_X = T.widthPx / 2;

const pad = (value: number): string => String(value).padStart(2, '0');

function ticks(doc: Document, tone: 'past' | 'future'): SVGLineElement[] {
  const lines: SVGLineElement[] = [];
  for (let minute = 0; minute <= timelineStripMinutes(); minute += T.tickEveryMinutes) {
    const major = minute % T.labelEveryMinutes === 0;
    const x = minute * PX_PER_MINUTE;
    lines.push(
      svg(doc, 'line', {
        class: `timeline__tick timeline__tick--${tone}`,
        x1: x,
        y1: T.baselineYPx,
        x2: x,
        y2: T.baselineYPx + (major ? T.majorTickPx : T.minorTickPx),
        'stroke-width': T.tickWidthPx,
      }),
    );
  }
  return lines;
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
  let lineSvg: SVGSVGElement | null = null;

  return {
    id: 'timeline',
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      const doc = element.ownerDocument;
      const clip = (id: string, x: number): SVGClipPathElement =>
        svg(doc, 'clipPath', { id }, [svg(doc, 'rect', { x, y: 0, width: NOW_X, height: T.heightPx })]);
      const strip = (children: readonly SVGElement[]): SVGGElement => svg(doc, 'g', { class: 'timeline__strip' }, children);
      lineSvg = svg(
        doc,
        'svg',
        { class: 'timeline__svg', viewBox: `0 0 ${String(T.widthPx)} ${String(T.heightPx)}`, 'aria-hidden': 'true', focusable: 'false' },
        [
          svg(doc, 'defs', {}, [clip('timeline-past', 0), clip('timeline-future', NOW_X)]),
          svg(doc, 'line', { class: 'timeline__line timeline__line--past', x1: 0, y1: T.baselineYPx, x2: NOW_X, y2: T.baselineYPx, 'stroke-width': T.lineWidthPx }),
          svg(doc, 'line', { class: 'timeline__line timeline__line--future', x1: NOW_X, y1: T.baselineYPx, x2: T.widthPx, y2: T.baselineYPx, 'stroke-width': T.lineWidthPx }),
          svg(doc, 'g', { 'clip-path': 'url(#timeline-past)' }, [strip(ticks(doc, 'past'))]),
          svg(doc, 'g', { 'clip-path': 'url(#timeline-future)' }, [strip(ticks(doc, 'future'))]),
          strip(labels(doc)),
        ],
      );
      display = new TimeDisplay(doc, context);
      element.replaceChildren(html(doc, 'div', { class: 'timeline' }, [display.element, lineSvg]));
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      if (lineSvg !== null) syncAnimations(lineSvg, view.focusedMs, view.status === 'running');
    },
    replay() {
      // Round 5: the focus-strip replay.
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      display = null;
      lineSvg = null;
    },
  };
}
