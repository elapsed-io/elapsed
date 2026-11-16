/**
 * The dial piece (the analog stopwatch's recipe; plan, Design system > Display modes: "one revolution per hour, labels every 5 minutes,
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
import './dial.css';
import { BRAND, CONFIG } from '@stopwatch/core';
import type { DialLayer } from '@stopwatch/core';
import { html, svg } from '../../../dom.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';

const ANALOG = CONFIG.modes.analog;
const MINUTE_MS = 60_000;
const MINUTE_DEGREES = 360 / (ANALOG.revolution / MINUTE_MS);
const HOURS_DEGREES = 360 / (ANALOG.hoursRevolution / MINUTE_MS);
/** A glide this far from focused time is set right (after the device slept, or the tab was hidden). */
const DRIFT_MS = 250;
/** The dial's centre, in the drawing's own units (the frame's viewBox, 300 units across: a radius of 150). */
const CENTRE = ANALOG.centre;
const FRAME_RADIUS = 150;
/** The frame's tick circle, whose circumference spaces both rings of ticks. */
const TICK_RADIUS = 124;

/** Where each hand points, in degrees, after `focusedMs` of focus: whole minutes when stepped. Unbounded. */
export function analogAngles(focusedMs: number, stepped = true, degrees = { minute: MINUTE_DEGREES, hours: HOURS_DEGREES }): { readonly minute: number; readonly hours: number } {
  const minutes = Math.max(0, focusedMs) / MINUTE_MS;
  const shown = stepped ? Math.floor(minutes) : minutes;
  return { minute: shown * degrees.minute, hours: shown * degrees.hours };
}

/** The point at `radius` and `degrees` (clockwise from 12) around a centre, to one decimal, as the frame writes it. */
function around(centre: { x: number; y: number }, radius: number, degrees: number): { x: string; y: string } {
  const angle = (degrees * Math.PI) / 180;
  return { x: (centre.x + radius * Math.sin(angle)).toFixed(1), y: (centre.y - radius * Math.cos(angle)).toFixed(1) };
}

/** A ring of `count` ticks `dash` long on the frame's tick circle, the first centred on 12 o'clock. */
function ticks(count: number, dash: number): { readonly dasharray: string; readonly rotate: string } {
  const period = (2 * Math.PI * TICK_RADIUS) / count;
  const turn = -90 - ((dash / 2 / TICK_RADIUS) * 180) / Math.PI;
  return { dasharray: `${String(dash)} ${(period - dash).toFixed(3)}`, rotate: `rotate(${turn.toFixed(2)} ${String(CENTRE.x)} ${String(CENTRE.y)})` };
}

interface DialShape {
  readonly cycleMinutes: number;
  readonly major: number;
  readonly minor: number;
  readonly labels: number;
  readonly format: 'minutes' | 'hours' | 'none';
  readonly subdial: { readonly x: number; readonly y: number; readonly radius: number; readonly cycleMinutes: number; readonly hand: number; readonly width: number } | null;
}

/** The dial as the frame draws it: crown, face, minute and five-minute ticks, labels, and the hours subdial. */
function dial(doc: Document, shape: DialShape): SVGSVGElement {
  const labels = Array.from({ length: shape.format === 'none' ? 0 : shape.labels }, (_, index) => {
    const at = (index * shape.cycleMinutes) / shape.labels;
    const { x, y } = around(CENTRE, 102, (360 * index) / shape.labels);
    const text = shape.format === 'hours' ? String(at / 60) : String(at);
    return svg(doc, 'text', { class: 'analog__label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, [text]);
  });
  const sub = shape.subdial;
  // The subdial's own ticks, one an hour of its cycle, between 18/22 and 21/22 of its radius (the frame's).
  const subTicks =
    sub === null
      ? []
      : Array.from({ length: Math.max(1, Math.round(sub.cycleMinutes / 60)) }, (_: unknown, index: number) => {
          const marks = Math.max(1, Math.round(sub.cycleMinutes / 60));
          const inner = around(sub, (sub.radius * 18) / 22, (index * 360) / marks);
          const outer = around(sub, (sub.radius * 21) / 22, (index * 360) / marks);
          return svg(doc, 'line', { class: 'analog__muted-line', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, 'stroke-width': 1 });
        });
  const minor = ticks(shape.minor, 1);
  const major = ticks(shape.major, 2);
  return svg(
    doc,
    'svg',
    { class: 'analog__dial', viewBox: '0 -10 300 310', 'aria-hidden': 'true', focusable: 'false' },
    [
      svg(doc, 'rect', { class: 'analog__crown', x: 138, y: -8, width: 24, height: 12, rx: 3 }),
      svg(doc, 'circle', { class: 'analog__face', cx: CENTRE.x, cy: CENTRE.y, r: 138, 'stroke-width': 2 }),
      svg(doc, 'circle', { class: 'analog__minute-ticks', cx: CENTRE.x, cy: CENTRE.y, r: TICK_RADIUS, 'stroke-width': 6, 'stroke-dasharray': minor.dasharray, transform: minor.rotate }),
      svg(doc, 'circle', { class: 'analog__five-ticks', cx: CENTRE.x, cy: CENTRE.y, r: TICK_RADIUS - 1, 'stroke-width': 10, 'stroke-dasharray': major.dasharray, transform: major.rotate }),
      ...labels,
      ...(sub === null
        ? []
        : [
            svg(doc, 'circle', { class: 'analog__subdial', cx: sub.x, cy: sub.y, r: sub.radius, 'stroke-width': 1.5 }),
            ...subTicks,
            svg(doc, 'text', { class: 'analog__hours-label', x: sub.x, y: sub.y + 32, 'text-anchor': 'middle' }, [BRAND.copy.analog.hours]),
          ]),
    ],
  );
}

interface Hand {
  readonly element: HTMLDivElement;
  readonly degreesPerMinute: number;
  glide: Animation | null;
}

/**
 * The dial (the `dial` piece): its face, ticks and labels drawn once, a hand turning once a cycle, and up to three
 * subdials with their own hands. The time is in the page for screen readers only, as the frame shows no digits.
 */
export function dialPiece({ doc, layer, recipe, context }: PieceSetup<DialLayer>): Piece {
  const cycleMinutes = (id: string, fallback: number): number => recipe.cycles?.find((cycle) => cycle.id === id)?.minutes ?? fallback;
  const first = layer.subdials?.[0];
  const shape: DialShape = {
    cycleMinutes: cycleMinutes(layer.cycle, ANALOG.revolution / MINUTE_MS),
    major: layer.ticks?.major ?? 12,
    minor: layer.ticks?.minor ?? 60,
    labels: layer.labels?.count ?? 60 / ANALOG.labelEveryMinutes,
    format: layer.labels?.format ?? 'minutes',
    subdial:
      first === undefined
        ? null
        : {
            x: CENTRE.x + (first.offset?.[0] ?? ANALOG.subdial.x - CENTRE.x),
            y: CENTRE.y + (first.offset?.[1] ?? ANALOG.subdial.y - CENTRE.y),
            radius: first.radius ?? 22,
            cycleMinutes: cycleMinutes(first.cycle, ANALOG.hoursRevolution / MINUTE_MS),
            hand: first.hand?.length ?? ANALOG.subdial.y - ANALOG.hoursHand.tipY,
            width: first.hand?.width ?? ANALOG.hoursHand.width,
          },
  };
  const degrees = { minute: 360 / shape.cycleMinutes, hours: shape.subdial === null ? 0 : 360 / shape.subdial.cycleMinutes };
  let hands: Hand[] = [];
  /** The minute the glides were set for, or null while the hands stand still. */
  let glidingMinute: number | null = null;
  let still = '';

  const rotate = (value: number): string => `rotate(${String(value)}deg)`;
  // Each hand is the frame's own line in a drawing of its own, which CSS turns about its centre.
  const handDrawing = (name: string, line: Readonly<Record<string, number>>): HTMLDivElement =>
    html(doc, 'div', { class: `analog__hand analog__hand--${name}` }, [
      svg(doc, 'svg', { class: 'analog__hand-drawing', viewBox: '0 -10 300 310', 'aria-hidden': 'true', focusable: 'false' }, [
        svg(doc, 'line', { class: `analog__hand-line analog__hand-line--${name}`, 'stroke-linecap': 'round', ...line }),
      ]),
    ]);
  const length = layer.hand?.length ?? CENTRE.y - ANALOG.minuteHand.tipY;
  const minuteHand = handDrawing('minute', { x1: CENTRE.x, y1: ANALOG.minuteHand.tailY, x2: CENTRE.x, y2: CENTRE.y - length, 'stroke-width': layer.hand?.width ?? ANALOG.minuteHand.width });
  const sub = shape.subdial;
  const hoursHand = sub === null ? null : handDrawing('hours', { x1: sub.x, y1: sub.y, x2: sub.x, y2: sub.y - sub.hand, 'stroke-width': sub.width });
  hands = [...(hoursHand === null ? [] : [{ element: hoursHand, degreesPerMinute: degrees.hours, glide: null }]), { element: minuteHand, degreesPerMinute: degrees.minute, glide: null }];
  const face = html(doc, 'div', { class: 'analog analog--still', attrs: { 'aria-hidden': 'true' } }, [dial(doc, shape), ...(hoursHand === null ? [] : [hoursHand]), minuteHand, html(doc, 'div', { class: 'analog__pin' })]);
  // The recipe's size (a radius of 150 is the frame's 290 × 300 box) and its hands' colours.
  const scale = (layer.radius ?? FRAME_RADIUS) / FRAME_RADIUS;
  const unit = Math.min(ANALOG.widthPx / 300, ANALOG.heightPx / 310);
  const style: Record<string, string> = {
    '--analog-width': String(ANALOG.widthPx * scale),
    '--analog-height': String(ANALOG.heightPx * scale),
    '--analog-unit': String(unit * scale),
    '--analog-top': String(((ANALOG.heightPx - 310 * unit) / 2) * scale),
    '--analog-subdial-x': String(sub?.x ?? ANALOG.subdial.x),
    '--analog-subdial-y': String((sub?.y ?? ANALOG.subdial.y) + 10),
    '--dial-hand': colourCss(layer.hand?.color, 'var(--color-accent)'),
    '--dial-subhand': colourCss(first?.hand?.color, 'var(--color-foreground)'),
  };

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    if (state !== 'running' || stepped) {
      const angles = analogAngles(focusedMs, stepped || state === 'idle', degrees);
      const key = `${String(angles.minute)}/${state}`;
      if (glidingMinute === null && key === still) return;
      glidingMinute = null;
      still = key;
      face.classList.add('analog--still');
      for (const hand of hands) {
        hand.glide?.cancel();
        hand.glide = null;
        hand.element.style.setProperty('transform', rotate(hand.degreesPerMinute === degrees.minute ? angles.minute : angles.hours));
      }
      return;
    }
    // Gliding: each hand turns its share of a minute over the rest of this minute, set afresh when it turns.
    still = '';
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glidingMinute !== minute || hands.some((hand) => hand.glide === null);
    face.classList.remove('analog--still');
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
    figure: { className: 'analog-stack', nodes: [face], style, hold: (time) => html(doc, 'div', { class: 'analog__time' }, [time]) },
    render({ view, activity }) {
      place(view.focusedMs, activity);
    },
    unmount() {
      for (const hand of hands) hand.glide?.cancel();
      hands = [];
      glidingMinute = null;
    },
  };
}
