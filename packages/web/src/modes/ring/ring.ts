/**
 * Ring: one revolution per hour; an 8 px track in the faint colour; a head dot
 * with a 55° tail in 22 steps fading as (1 − i/22)^1.8 (plan, Design system >
 * Display modes; the ring frame).
 *
 * The head and tail turn by a CSS animation pinned to focused time. At the
 * start of a session the tail grows in behind the head (owner decision,
 * 2026-11-15): a fixed mask hides the part of the ring just before 12 o'clock
 * until the head has travelled the tail's length, so the tail never covers
 * time that has not passed.
 */

import 'virtual:tokens/ring.css';
import './ring.css';
import { CONFIG } from '@stopwatch/core';
import type { Session, TimerView } from '@stopwatch/core';
import { html, svg, syncAnimations } from '../../dom.ts';
import type { DisplayContext, DisplayMode } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';
import { drawRings } from './ring-replay.ts';

const RING = CONFIG.modes.ring;
const CENTER = RING.boxPx / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING.radiusPx;
const STEP = RING.tailDegrees / RING.tailSteps;
const MASK_ID = 'ring-tail-start';
/** Focused time after which the whole tail has passed 12 o'clock. */
export const TAIL_GROWN_MS = (RING.tailDegrees / 360) * RING.revolution;

const round = (value: number, places: number): string => String(Number(value.toFixed(places)));

function polar(degrees: number, radius: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
}

/** A wedge covering the tail's length just before 12 o'clock, hidden by the mask while the tail grows. */
function startWedge(): string {
  const reach = CENTER;
  const [x1, y1] = polar(-90 - RING.tailDegrees - 1, reach);
  const [x2, y2] = polar(-90, reach);
  return `M${String(CENTER)} ${String(CENTER)} L${round(x1, 3)} ${round(y1, 3)} A${String(reach)} ${String(reach)} 0 0 1 ${round(x2, 3)} ${round(y2, 3)} Z`;
}

export function createRingMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let ringSvg: SVGSVGElement | null = null;
  let tail: SVGGElement | null = null;

  return {
    id: 'ring',
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      const doc = element.ownerDocument;
      const dash = `${String(RING.tailSegmentArcPx)} ${round(CIRCUMFERENCE, 1)}`;
      const segments = Array.from({ length: RING.tailSteps }, (_, i) =>
        svg(doc, 'circle', {
          class: 'ring__tail',
          cx: CENTER,
          cy: CENTER,
          r: RING.radiusPx,
          'stroke-width': RING.trackPx,
          'stroke-dasharray': dash,
          opacity: ((1 - i / RING.tailSteps) ** RING.tailFadeExponent).toFixed(3),
          transform: `rotate(${round(-90 - STEP * (i + 1), 2)} ${String(CENTER)} ${String(CENTER)})`,
        }),
      );
      const size = String(RING.boxPx);
      tail = svg(doc, 'g', {}, [svg(doc, 'g', { class: 'ring__turn' }, segments)]);
      ringSvg = svg(doc, 'svg', { class: 'ring__svg', viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', focusable: 'false' }, [
        svg(doc, 'defs', {}, [
          svg(doc, 'mask', { id: MASK_ID, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: size, height: size }, [
            svg(doc, 'rect', { x: 0, y: 0, width: size, height: size, fill: 'white' }),
            svg(doc, 'path', { d: startWedge(), fill: 'black' }),
          ]),
        ]),
        svg(doc, 'circle', { class: 'ring__track', cx: CENTER, cy: CENTER, r: RING.radiusPx, 'stroke-width': RING.trackPx }),
        tail,
        svg(doc, 'g', { class: 'ring__turn' }, [
          svg(doc, 'circle', { class: 'ring__head', cx: CENTER, cy: CENTER - RING.radiusPx, r: RING.headRadiusPx }),
        ]),
      ]);
      display = new TimeDisplay(doc, context);
      element.replaceChildren(html(doc, 'div', { class: 'ring' }, [ringSvg, display.element]));
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      if (ringSvg === null || tail === null) return;
      const growing = view.focusedMs < TAIL_GROWN_MS;
      if (growing) tail.setAttribute('mask', `url(#${MASK_ID})`);
      else tail.removeAttribute('mask');
      syncAnimations(ringSvg, view.focusedMs, view.status === 'running');
    },
    replay(target: HTMLElement, session: Session) {
      drawRings(target, session);
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      display = null;
      ringSvg = null;
      tail = null;
    },
  };
}
