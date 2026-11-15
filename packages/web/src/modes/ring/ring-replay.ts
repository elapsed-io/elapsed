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
 * The replay reveals each ring's focus as the replay's time passes through
 * that hour (a mask whose stroke offset moves, as the plan's performance
 * requirements allow for replays) and turns the hands, all with one timing.
 */

import { BRAND, CONFIG, summarise } from '@stopwatch/core';
import type { Session } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import { focusStretches, replayTiming } from '../shared/replay-timing.ts';
import './ring-replay.css';

const RING = CONFIG.design.results.ring;
const C = RING.viewBox / 2;
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
    svg(doc, 'path', { class: 'rings__focus', d: d === '' ? 'M0 0' : d.trim(), 'stroke-width': fixed(geometry.strokeWidth), mask: `url(#${MASK_PREFIX}${String(hour)})` }),
  );
  // Where the hands end: the minute hand turns once per hour of the session; the hour hand as on a 12-hour dial.
  const minuteAngle = (minutes % 60) * 6;
  const hourAngle = (minutes / 720) * 360;
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
  root.replaceChildren(html(doc, 'div', { class: 'rings' }, [drawing, legend]));

  // The replay: each hour's ring fills while the replay's time passes through that hour.
  const timing = replayTiming(doc);
  const total = Math.max(minutes, 1 / 60);
  masks.forEach((mask, hour) => {
    const reveal = mask.firstElementChild;
    if (!(reveal instanceof SVGElement)) return;
    const path = focus[hour];
    const from = Math.min(1, (hour * 60) / total);
    const to = Math.min(1, ((hour + 1) * 60) / total);
    const keyframes: Keyframe[] = [{ strokeDashoffset: '1', offset: 0 }];
    if (from > 0) keyframes.push({ strokeDashoffset: '1', offset: from });
    keyframes.push({ strokeDashoffset: '0', offset: to });
    if (to < 1) keyframes.push({ strokeDashoffset: '0', offset: 1 });
    const animation = reveal.animate(keyframes, timing);
    // Fully revealed, the ring needs its mask no more.
    void animation.finished.then(
      () => path?.removeAttribute('mask'),
      () => undefined,
    );
  });
  // The hands turn from 12 o'clock to where they end; the minute hand goes round once per hour.
  minuteHand.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${fixed(minutes * 6)}deg)` }], timing);
  hourHand.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${fixed(hourAngle)}deg)` }], timing);
}
