/**
 * The ring's results replay: one ring per hour, outermost first, filled where
 * the session focused and blank where it paused (plan, Design system >
 * Display modes; the "results: analog and ring" frame, with its dial, hands
 * and legend).
 *
 * Up to 6 hours the rings sit 13 units apart as in the frame. Longer sessions
 * keep the same outer and inner rings and draw the hours closer and thinner
 * (owner decision, 2026-11-15).
 *
 * The replay is drawn from one value, --replay-progress (0 to 1), which the
 * results screen animates (plan, Principles). From it CSS calculates the
 * hands' rotation and each hour's reveal (a mask's stroke offset, clamped to
 * that hour), so every focus arc is revealed exactly behind the sweeping
 * minute hand and never runs ahead of it.
 */

import { BRAND, CONFIG, summarise } from '@stopwatch/core';
import type { Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import { focusStretches } from '../shared/replay-timing.ts';
import './ring-replay.css';

const RING = CONFIG.design.results.ring;
const C = RING.viewBox / 2;
/** Minutes per ring, and how far each hand turns per minute: once an hour, and once in twelve on the dial. */
const MINUTES_PER_RING = 60;
const MINUTE_HAND_DEGREES = 360 / MINUTES_PER_RING;
const HOUR_HAND_DEGREES = 360 / (12 * MINUTES_PER_RING);
const MASK_PREFIX = 'results-ring-reveal-';

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

function point(radius: number, degrees: number): string {
  const radians = (degrees * Math.PI) / 180;
  return `${fixed(C + radius * Math.sin(radians))} ${fixed(C - radius * Math.cos(radians))}`;
}

/** An arc clockwise from `from` to `to` degrees (12 o'clock is 0), as the frame draws it. */
export function arc(radius: number, from: number, to: number): string {
  if (to - from < 0.05) return '';
  if (to - from > 359.5) return arc(radius, from, from + 180) + arc(radius, from + 180, from + 359.5);
  return `M${point(radius, from)} A${String(radius)} ${String(radius)} 0 ${to - from > 180 ? '1' : '0'} 1 ${point(radius, to)} `;
}

export interface RingGeometry {
  readonly radii: readonly number[];
  readonly strokeWidth: number;
}

/** One ring per started hour; closer and thinner past six. */
export function ringGeometry(hours: number): RingGeometry {
  const count = Math.max(1, hours);
  if (count <= RING.exactHours) {
    return { radii: Array.from({ length: count }, (_, h) => RING.outerRadius - RING.spacing * h), strokeWidth: RING.strokeWidth };
  }
  const spacing = (RING.spacing * (RING.exactHours - 1)) / (count - 1);
  return {
    radii: Array.from({ length: count }, (_, h) => RING.outerRadius - spacing * h),
    strokeWidth: (RING.strokeWidth * spacing) / RING.spacing,
  };
}

/** The focus arcs on each hour's ring. */
export function ringPaths(session: Session): { readonly geometry: RingGeometry; readonly paths: readonly string[]; readonly minutes: number } {
  const summary = summarise(session);
  const minutes = summary.elapsedMs / 60_000;
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const geometry = ringGeometry(hours);
  const paths = geometry.radii.map(() => '');
  for (const { from, to } of focusStretches(session.segments, summary.startedAt)) {
    for (let hour = Math.floor(from / 60); hour * 60 < to; hour += 1) {
      const start = Math.max(from, hour * 60);
      const end = Math.min(to, hour * 60 + 60);
      const radius = geometry.radii[hour];
      if (end > start && radius !== undefined) paths[hour] = (paths[hour] ?? '') + arc(radius, (start - hour * 60) * 6, (end - hour * 60) * 6);
    }
  }
  return { geometry, paths, minutes };
}

export function drawRings(root: HTMLElement, session: Session): void {
  const doc = root.ownerDocument;
  const { geometry, paths, minutes } = ringPaths(session);
  const box = String(RING.viewBox);
  const tickGap = (2 * Math.PI * RING.tickRadius) / 12 - RING.tickLength;
  const label = (text: string, x: number, y: number): SVGTextElement =>
    svg(doc, 'text', { class: 'rings__label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': RING.labelPx }, [text]);

  const masks = geometry.radii.map((radius, hour) =>
    svg(doc, 'mask', { id: `${MASK_PREFIX}${String(hour)}`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: box, height: box }, [
      svg(doc, 'circle', {
        class: 'rings__reveal',
        cx: C,
        cy: C,
        r: fixed(radius),
        'stroke-width': fixed(geometry.strokeWidth * 2),
        pathLength: 1,
        'stroke-dasharray': '1 1',
        'stroke-dashoffset': 0,
        transform: `rotate(-90 ${String(C)} ${String(C)})`,
      }),
    ]),
  );
  const tracks = geometry.radii.map((radius) =>
    svg(doc, 'circle', { class: 'rings__track', cx: C, cy: C, r: fixed(radius), 'stroke-width': fixed(geometry.strokeWidth) }),
  );
  const focus = paths.map((d, hour) =>
    svg(doc, 'path', {
      class: 'rings__focus rings__focus--hour',
      d: d === '' ? 'M0 0' : d.trim(),
      'stroke-width': fixed(geometry.strokeWidth),
      mask: `url(#${MASK_PREFIX}${String(hour)})`,
    }),
  );
  // Once the replay has finished, every hour's focus is one path, as the frame draws it (ring-replay.css).
  const allFocus = svg(doc, 'path', { class: 'rings__focus rings__focus--all', d: paths.join('').trim() || 'M0 0', 'stroke-width': fixed(geometry.strokeWidth) });
  // Where the hands end: the minute hand turns once per hour of the session; the hour hand as on a 12-hour dial.
  const minuteAngle = (minutes % MINUTES_PER_RING) * MINUTE_HAND_DEGREES;
  const hourAngle = minutes * HOUR_HAND_DEGREES;
  // Turned about the dial's centre by the hands' transform-origin (ring-replay.css), like the replay's own turn.
  const turned = (angle: number): string => `rotate(${angle.toFixed(1)})`;
  const hourHand = svg(doc, 'line', {
    class: 'rings__hand',
    x1: C,
    y1: C,
    x2: C,
    y2: C - RING.hourHand.length,
    'stroke-width': RING.hourHand.width,
    transform: turned(hourAngle),
  });
  const minuteHand = svg(doc, 'line', {
    class: 'rings__hand',
    x1: C,
    y1: C + RING.minuteHand.tail,
    x2: C,
    y2: C - RING.minuteHand.length,
    'stroke-width': RING.minuteHand.width,
    transform: turned(minuteAngle),
  });

  const drawing = svg(doc, 'svg', { class: 'rings__svg', viewBox: `0 0 ${box} ${box}`, role: 'img', 'aria-label': BRAND.copy.results.ringLabel }, [
    svg(doc, 'defs', {}, masks),
    ...tracks,
    ...focus,
    allFocus,
    svg(doc, 'circle', {
      class: 'rings__ticks',
      cx: C,
      cy: C,
      r: RING.tickRadius,
      'stroke-width': RING.tickWidth,
      'stroke-dasharray': `${String(RING.tickLength)} ${fixed(tickGap)}`,
      transform: `rotate(${String(RING.tickRotateDegrees)} ${String(C)} ${String(C)})`,
    }),
    label('0', C, C - RING.labelRadius),
    label('15', C + RING.labelRadius, C),
    label('30', C, C + RING.labelRadius),
    label('45', C - RING.labelRadius, C),
    hourHand,
    minuteHand,
    svg(doc, 'circle', { class: 'rings__centre', cx: C, cy: C, r: RING.centreRadius }),
  ]);
  const { results } = BRAND.copy;
  const legend = html(doc, 'div', { class: 'legend', attrs: { 'aria-hidden': 'true' } }, [
    html(doc, 'div', { class: 'legend__item' }, [html(doc, 'div', { class: 'legend__focus' }), results.legendFocus]),
    html(doc, 'div', { class: 'legend__item' }, [html(doc, 'div', { class: 'legend__pause' }), results.legendPause]),
  ]);
  const rings = html(doc, 'div', { class: 'rings' }, [drawing, legend]);
  // With --replay-progress, all ring-replay.css needs: the session's length, where each hour's ring starts, and
  // how fast each hand turns. Set through the CSSOM, never as style attributes (the CSP forbids them).
  rings.style.setProperty('--replay-minutes', String(Math.max(minutes, 1 / 60)));
  masks.forEach((mask, hour) => {
    if (!(mask.firstElementChild instanceof SVGElement)) return;
    mask.firstElementChild.style.setProperty('--hour-from', String(hour * MINUTES_PER_RING));
    mask.firstElementChild.style.setProperty('--hour-span', String(MINUTES_PER_RING));
  });
  minuteHand.style.setProperty('--hand-rate', String(MINUTE_HAND_DEGREES));
  hourHand.style.setProperty('--hand-rate', String(HOUR_HAND_DEGREES));
  root.replaceChildren(rings);
}
