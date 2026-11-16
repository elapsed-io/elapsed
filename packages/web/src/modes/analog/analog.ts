/**
 * Analog stopwatch (plan, Design system > Display modes: "one revolution per hour, labels every 5 minutes,
 * an hours subdial, and the hand in the accent color"; the "analog stopwatch" frame).
 *
 * The dial is the frame's own drawing (an SVG, 290 × 300 at reference, viewBox 0 −10 300 310), drawn once.
 * The two hands and the centre pin are HTML on top of it, so the browser turns them on the compositor:
 * while a session runs, each hand glides through a linear CSS rotation set by script once a minute (the
 * minute hand 6° a minute, the hours hand 0.5°), never redrawn and never in a loop; paused or waiting for a
 * check-in they hold where they reached; with low power (or reduced motion) they step once a minute (plan,
 * Product principles; owner, 2026-11-16). The frame shows no digits: the time is still in the page for
 * screen readers (a timer, read on request), and "paused for" shows over the dial as in every mode.
 *
 * Its results replay is the ring replay: one ring per hour, with the hands (the "results: analog and ring"
 * frame).
 */

import 'virtual:tokens/analog.css';
import './analog.css';
import { BRAND, CONFIG } from '@stopwatch/core';
import type { Session, TimerView } from '@stopwatch/core';
import { html, svg } from '../../dom.ts';
import type { DisplayContext, DisplayMode, ReplaySurface } from '../contract.ts';
import { drawRings } from '../ring/ring-replay.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const ANALOG = CONFIG.modes.analog;
const MINUTE_MS = 60_000;
const MINUTE_DEGREES = 360 / (ANALOG.revolution / MINUTE_MS);
const HOURS_DEGREES = 360 / (ANALOG.hoursRevolution / MINUTE_MS);
/** A glide this far from focused time is set right (after the device slept, or the tab was hidden). */
const DRIFT_MS = 250;
/** The dial's centre and the subdial's, in the drawing's own units (the frame's viewBox). */
const CENTRE = ANALOG.centre;
const SUBDIAL = ANALOG.subdial;

/** Where each hand points, in degrees, after `focusedMs` of focus: whole minutes when stepped. Unbounded. */
export function analogAngles(focusedMs: number, stepped = true): { readonly minute: number; readonly hours: number } {
  const minutes = Math.max(0, focusedMs) / MINUTE_MS;
  const shown = stepped ? Math.floor(minutes) : minutes;
  return { minute: shown * MINUTE_DEGREES, hours: shown * HOURS_DEGREES };
}

/** The point at `radius` and `degrees` (clockwise from 12) around a centre, to one decimal, as the frame writes it. */
function around(centre: { x: number; y: number }, radius: number, degrees: number): { x: string; y: string } {
  const angle = (degrees * Math.PI) / 180;
  return { x: (centre.x + radius * Math.sin(angle)).toFixed(1), y: (centre.y - radius * Math.cos(angle)).toFixed(1) };
}

/** The dial as the frame draws it: crown, face, minute and five-minute ticks, labels, and the hours subdial. */
function dial(doc: Document): SVGSVGElement {
  const labels = Array.from({ length: 60 / ANALOG.labelEveryMinutes }, (_, index) => {
    const minute = index * ANALOG.labelEveryMinutes;
    const { x, y } = around(CENTRE, 102, minute * MINUTE_DEGREES);
    return svg(doc, 'text', { class: 'analog__label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, [String(minute)]);
  });
  const subTicks = Array.from({ length: 12 }, (_, index) => {
    const inner = around(SUBDIAL, 18, index * 30);
    const outer = around(SUBDIAL, 21, index * 30);
    return svg(doc, 'line', { class: 'analog__muted-line', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, 'stroke-width': 1 });
  });
  return svg(
    doc,
    'svg',
    { class: 'analog__dial', viewBox: '0 -10 300 310', 'aria-hidden': 'true', focusable: 'false' },
    [
      svg(doc, 'rect', { class: 'analog__crown', x: 138, y: -8, width: 24, height: 12, rx: 3 }),
      svg(doc, 'circle', { class: 'analog__face', cx: CENTRE.x, cy: CENTRE.y, r: 138, 'stroke-width': 2 }),
      svg(doc, 'circle', { class: 'analog__minute-ticks', cx: CENTRE.x, cy: CENTRE.y, r: 124, 'stroke-width': 6, 'stroke-dasharray': '1 11.985', transform: 'rotate(-90.23 150 150)' }),
      svg(doc, 'circle', { class: 'analog__five-ticks', cx: CENTRE.x, cy: CENTRE.y, r: 123, 'stroke-width': 10, 'stroke-dasharray': '2 62.926', transform: 'rotate(-90.46 150 150)' }),
      ...labels,
      svg(doc, 'circle', { class: 'analog__subdial', cx: SUBDIAL.x, cy: SUBDIAL.y, r: 22, 'stroke-width': 1.5 }),
      ...subTicks,
      svg(doc, 'text', { class: 'analog__hours-label', x: 150, y: 232, 'text-anchor': 'middle' }, [BRAND.copy.analog.hours]),
    ],
  );
}

type State = 'idle' | 'running' | 'held';

interface Hand {
  readonly element: HTMLDivElement;
  readonly degreesPerMinute: number;
  glide: Animation | null;
}

export function createAnalogMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let hands: Hand[] = [];
  let analog: HTMLDivElement | null = null;
  /** The minute the glides were set for, or null while the hands stand still. */
  let glidingMinute: number | null = null;
  let still = '';

  const rotate = (degrees: number): string => `rotate(${String(degrees)}deg)`;

  const place = (focusedMs: number, state: State): void => {
    if (analog === null) return;
    const stepped = context?.lowPower === true;
    if (state !== 'running' || stepped) {
      const angles = analogAngles(focusedMs, stepped || state === 'idle');
      const key = `${String(angles.minute)}/${state}`;
      if (glidingMinute === null && key === still) return;
      glidingMinute = null;
      still = key;
      analog.classList.add('analog--still');
      for (const hand of hands) {
        hand.glide?.cancel();
        hand.glide = null;
        hand.element.style.setProperty('transform', rotate(hand.degreesPerMinute === MINUTE_DEGREES ? angles.minute : angles.hours));
      }
      return;
    }
    // Gliding: each hand turns its share of a minute over the rest of this minute, set afresh when it turns.
    still = '';
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glidingMinute !== minute || hands.some((hand) => hand.glide === null);
    analog.classList.remove('analog--still');
    for (const hand of hands) {
      if (fresh) {
        hand.glide?.cancel();
        const from = minute * hand.degreesPerMinute;
        hand.element.style.setProperty('transform', rotate(from));
        hand.glide = hand.element.animate([{ transform: rotate(from) }, { transform: rotate(from + hand.degreesPerMinute) }], {
          duration: MINUTE_MS,
          easing: 'linear',
          fill: 'forwards',
        });
      }
      const glide = hand.glide;
      if (glide === null) continue;
      if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
      if (glide.playState !== 'running') glide.play();
    }
    glidingMinute = minute;
  };

  return {
    id: 'analog',
    replayTiming: ANALOG.replay,
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      glidingMinute = null;
      still = '';
      const doc = element.ownerDocument;
      // Each hand is the frame's own line in a drawing of its own, which CSS turns about its centre.
      const handDrawing = (name: string, line: Readonly<Record<string, number>>): HTMLDivElement =>
        html(doc, 'div', { class: `analog__hand analog__hand--${name}` }, [
          svg(doc, 'svg', { class: 'analog__hand-drawing', viewBox: '0 -10 300 310', 'aria-hidden': 'true', focusable: 'false' }, [
            svg(doc, 'line', { class: `analog__hand-line analog__hand-line--${name}`, 'stroke-linecap': 'round', ...line }),
          ]),
        ]);
      const { centre, minuteHand: minute, subdial, hoursHand: hours } = ANALOG;
      const minuteHand = handDrawing('minute', { x1: centre.x, y1: minute.tailY, x2: centre.x, y2: minute.tipY, 'stroke-width': minute.width });
      const hoursHand = handDrawing('hours', { x1: subdial.x, y1: subdial.y, x2: subdial.x, y2: hours.tipY, 'stroke-width': hours.width });
      hands = [
        { element: hoursHand, degreesPerMinute: HOURS_DEGREES, glide: null },
        { element: minuteHand, degreesPerMinute: MINUTE_DEGREES, glide: null },
      ];
      const face = html(doc, 'div', { class: 'analog analog--still', attrs: { 'aria-hidden': 'true' } }, [dial(doc), hoursHand, minuteHand, html(doc, 'div', { class: 'analog__pin' })]);
      analog = face;
      display = new TimeDisplay(doc, displayContext, (time) => [html(doc, 'div', { class: 'analog-stack' }, [face, html(doc, 'div', { class: 'analog__time' }, [time])])]);
      element.replaceChildren(display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      const state: State = view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
      place(view.focusedMs, state);
    },
    replay(surface: ReplaySurface, session: Session) {
      drawRings(surface.graphic, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      for (const hand of hands) hand.glide?.cancel();
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      hands = [];
      analog = null;
      glidingMinute = null;
    },
  };
}
