/**
 * The dial piece (the analog stopwatch's and the perpetual calendar's recipes; plan, Design system > Display modes: "one revolution per hour, labels every 5 minutes,
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
import { CALENDAR_PLACES, CONFIG, calendarShare } from '@stopwatch/core';
import type { Cycle, DialLayer, Subdial } from '@stopwatch/core';
import { html, svg } from '../../../dom.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';

const ANALOG = CONFIG.modes.analog;
const MINUTE_MS = 60_000;
/** A glide this far from focused time is set right (after the device slept, or the tab was hidden). */
const DRIFT_MS = 250;
/** The dial's centre, in the drawing's own units (the frame's viewBox, 300 units across: a radius of 150). */
const CENTRE = ANALOG.centre;
const FRAME_RADIUS = 150;
/** The frame's tick circle, whose circumference spaces both rings of ticks. */
const TICK_RADIUS = 124;

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

/** A subdial as the piece draws it: where, how large, what it counts, and its hand. */
interface SubdialShape {
  readonly spec: Subdial;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly cycle: Cycle | undefined;
  readonly hand: number;
  readonly width: number;
}

interface DialShape {
  readonly cycleMinutes: number;
  readonly major: number;
  readonly minor: number;
  readonly labels: number;
  readonly format: 'minutes' | 'hours' | 'none';
  readonly subdials: readonly SubdialShape[];
}

/** How many marks a small dial has: one a named place, one a place of its calendar part, else one an hour of its cycle. */
function marksOf(sub: SubdialShape): number {
  if (sub.spec.names !== undefined) return sub.spec.names.length;
  if (sub.spec.part !== undefined && sub.spec.part !== 'moon') return CALENDAR_PLACES[sub.spec.part];
  if ((sub.spec.labels ?? 0) > 0) return sub.spec.labels ?? 0;
  return Math.max(1, Math.round((sub.cycle?.minutes ?? 720) / 60));
}

/** The dial as the frame draws it: crown, face, minute and five-minute ticks, labels, and its small dials. */
function dial(doc: Document, shape: DialShape): SVGSVGElement {
  const labels = Array.from({ length: shape.format === 'none' ? 0 : shape.labels }, (_, index) => {
    const at = (index * shape.cycleMinutes) / shape.labels;
    const { x, y } = around(CENTRE, 102, (360 * index) / shape.labels);
    const text = shape.format === 'hours' ? String(index === 0 ? shape.labels : index) : String(at);
    return svg(doc, 'text', { class: 'analog__label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, [text]);
  });
  const small = shape.subdials.flatMap((sub) => {
    if ((sub.spec.face ?? 'dial') !== 'dial' || sub.spec.part === 'moon') return [];
    const count = marksOf(sub);
    // Its ticks between 18/22 and 21/22 of its radius (the frame's), and its marks' names inside them.
    const marks = Array.from({ length: count }, (_, index) => {
      const inner = around(sub, (sub.radius * 18) / 22, (index * 360) / count);
      const outer = around(sub, (sub.radius * 21) / 22, (index * 360) / count);
      return svg(doc, 'line', { class: 'analog__muted-line', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, 'stroke-width': 1 });
    });
    const names = (sub.spec.names ?? []).flatMap((name, index, all) => {
      if (name === '') return [];
      const { x, y } = around(sub, sub.radius * 0.6, (index * 360) / all.length);
      return [svg(doc, 'text', { class: 'analog__sublabel', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, [name])];
    });
    return [
      svg(doc, 'circle', { class: 'analog__subdial', cx: sub.x, cy: sub.y, r: sub.radius, 'stroke-width': 1.5 }),
      ...marks,
      ...names,
      ...(sub.spec.title === undefined ? [] : [svg(doc, 'text', { class: 'analog__hours-label', x: sub.x, y: sub.y + 32, 'text-anchor': 'middle' }, [sub.spec.title])]),
    ];
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
      ...small,
    ],
  );
}

/**
 * The moon (a calendar subdial's `moon` part): a disc with two moons turning half a turn a lunation behind a
 * semicircular window whose two humps hide the moon when it is new, as a moon-phase watch shows it.
 */
function moon(doc: Document, sub: SubdialShape): { readonly window: HTMLElement; readonly disc: HTMLElement } {
  const disc = html(doc, 'div', { class: 'dial__moon-disc' }, [
    svg(doc, 'svg', { viewBox: '-1 -1 2 2', 'aria-hidden': 'true', focusable: 'false' }, [
      svg(doc, 'circle', { class: 'dial__moon-sky', cx: 0, cy: 0, r: 1 }),
      svg(doc, 'circle', { class: 'dial__moon-body', cx: -0.6, cy: 0, r: 0.3 }),
      svg(doc, 'circle', { class: 'dial__moon-body', cx: 0.6, cy: 0, r: 0.3 }),
    ]),
  ]);
  const humps = svg(doc, 'svg', { class: 'dial__moon-humps', viewBox: '-1 -1 2 1', 'aria-hidden': 'true', focusable: 'false' }, [
    svg(doc, 'circle', { cx: -0.6, cy: 0, r: 0.36 }),
    svg(doc, 'circle', { cx: 0.6, cy: 0, r: 0.36 }),
  ]);
  const window = html(doc, 'div', { class: 'dial__moon' }, [disc, humps]);
  for (const [name, value] of Object.entries({ '--moon-x': sub.x - sub.radius, '--moon-y': sub.y - sub.radius + 10, '--moon-r': sub.radius })) window.style.setProperty(name, String(value));
  if (sub.spec.hand?.color !== undefined) window.style.setProperty('--moon-colour', colourCss(sub.spec.hand.color, 'var(--color-accent)'));
  return { window, disc };
}

interface Hand {
  readonly element: HTMLElement;
  /** Where it points after `minutes` of focus, in degrees; stepped (a calendar's jump at midnight) or gliding. */
  readonly angle: (minutes: number) => number;
  readonly glides: boolean;
  glide: Animation | null;
}

/**
 * The dial (the `dial` piece): its face, ticks and labels drawn once, a hand turning once a cycle, and up to eight
 * subdials: small dials with their own hands, further hands from the centre (an hours hand, a sweeping seconds
 * hand), and a calendar's parts (the date, the weekday, the month, the leap year, each stepping as a perpetual
 * calendar does, and the moon). The time is in the page for screen readers only, as the frames show no digits.
 */
export function dialPiece({ doc, layer, recipe, context }: PieceSetup<DialLayer>): Piece {
  const cycleOf = (id: string): Cycle | undefined => recipe.cycles?.find((cycle) => cycle.id === id);
  const subdials: SubdialShape[] = (layer.subdials ?? []).map((spec) => {
    const offset = spec.offset ?? [ANALOG.subdial.x - CENTRE.x, ANALOG.subdial.y - CENTRE.y];
    return {
      spec,
      x: CENTRE.x + offset[0],
      y: CENTRE.y + offset[1],
      radius: spec.radius ?? 22,
      cycle: cycleOf(spec.cycle),
      hand: spec.hand?.length ?? ANALOG.subdial.y - ANALOG.hoursHand.tipY,
      width: spec.hand?.width ?? ANALOG.hoursHand.width,
    };
  });
  const shape: DialShape = {
    cycleMinutes: cycleOf(layer.cycle)?.minutes ?? ANALOG.revolution / MINUTE_MS,
    major: layer.ticks?.major ?? 12,
    minor: layer.ticks?.minor ?? 60,
    labels: layer.labels?.count ?? 60 / ANALOG.labelEveryMinutes,
    format: layer.labels?.format ?? 'minutes',
    subdials,
  };
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
  const mainMinutes = shape.cycleMinutes;
  const minuteHand: Hand = {
    element: handDrawing('minute', { x1: CENTRE.x, y1: ANALOG.minuteHand.tailY, x2: CENTRE.x, y2: CENTRE.y - length, 'stroke-width': layer.hand?.width ?? ANALOG.minuteHand.width }),
    angle: (minutes) => (minutes * 360) / mainMinutes,
    glides: true,
    glide: null,
  };
  const windows: HTMLElement[] = [];
  const subHands: { readonly hand: Hand; readonly order: number }[] = subdials.map((sub) => {
    const cycle = sub.cycle;
    const dayMinutes = cycle?.minutes ?? 1;
    const part = sub.spec.part;
    if (cycle?.calendar !== undefined && part === 'moon') {
      const { window, disc } = moon(doc, sub);
      windows.push(window);
      return { hand: { element: disc, angle: (minutes) => calendarShare('moon', minutes / dayMinutes) * 360, glides: true, glide: null }, order: -1 };
    }
    const element = handDrawing('hours', { x1: sub.x, y1: sub.y, x2: sub.x, y2: sub.y - sub.hand, 'stroke-width': sub.width });
    element.style.setProperty('--analog-subdial-x', String(sub.x));
    element.style.setProperty('--analog-subdial-y', String(sub.y + 10));
    if (sub.spec.hand?.color !== undefined) element.style.setProperty('--dial-subhand', colourCss(sub.spec.hand.color, 'var(--color-foreground)'));
    if (cycle?.calendar !== undefined && part !== undefined) {
      // A calendar's part jumps at the turn of each of its days.
      element.dataset['part'] = part;
      return { hand: { element, angle: (minutes) => calendarShare(part, Math.floor(minutes / dayMinutes)) * 360, glides: false, glide: null }, order: -1 };
    }
    const turn = cycle?.minutes ?? ANALOG.hoursRevolution / MINUTE_MS;
    return { hand: { element, angle: (minutes) => (minutes * 360) / turn, glides: true, glide: null }, order: turn };
  });
  // Calendar hands under the hands from the centre; those by their cycle, the slowest underneath.
  const ordered = [...subHands, { hand: minuteHand, order: mainMinutes }].sort((a, b) => (a.order < 0 || b.order < 0 ? a.order - b.order : b.order - a.order));
  const hands = ordered.map(({ hand }) => hand);
  const face = html(doc, 'div', { class: 'analog analog--still', attrs: { 'aria-hidden': 'true' } }, [
    dial(doc, shape),
    ...windows,
    ...hands.filter((hand) => !windows.some((window) => window.contains(hand.element))).map((hand) => hand.element),
    html(doc, 'div', { class: 'analog__pin' }),
  ]);
  // The recipe's size (a radius of 150 is the frame's 290 × 300 box) and its hands' colours.
  const scale = (layer.radius ?? FRAME_RADIUS) / FRAME_RADIUS;
  const unit = Math.min(ANALOG.widthPx / 300, ANALOG.heightPx / 310);
  const first = subdials[0];
  const style: Record<string, string> = {
    '--analog-width': String(ANALOG.widthPx * scale),
    '--analog-height': String(ANALOG.heightPx * scale),
    '--analog-unit': String(unit * scale),
    '--analog-top': String(((ANALOG.heightPx - 310 * unit) / 2) * scale),
    '--analog-subdial-x': String(first?.x ?? ANALOG.subdial.x),
    '--analog-subdial-y': String((first?.y ?? ANALOG.subdial.y) + 10),
    '--dial-hand': colourCss(layer.hand?.color, 'var(--color-accent)'),
    '--dial-subhand': colourCss(first?.spec.hand?.color, 'var(--color-foreground)'),
  };

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    const exact = Math.max(0, focusedMs) / MINUTE_MS;
    if (state !== 'running' || stepped) {
      const minutes = stepped || state === 'idle' ? Math.floor(exact) : exact;
      const key = `${String(minutes)}/${state}`;
      if (glidingMinute === null && key === still) return;
      glidingMinute = null;
      still = key;
      face.classList.add('analog--still');
      for (const hand of hands) {
        hand.glide?.cancel();
        hand.glide = null;
        hand.element.style.setProperty('transform', rotate(hand.angle(minutes)));
      }
      return;
    }
    // Gliding: each hand turns its share of a minute over the rest of this minute, set afresh when it turns; a
    // calendar's hands stand at their day.
    still = '';
    const minute = Math.floor(exact);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const fresh = glidingMinute !== minute || hands.some((hand) => hand.glides && hand.glide === null);
    face.classList.remove('analog--still');
    for (const hand of hands) {
      if (!hand.glides) {
        if (fresh) hand.element.style.setProperty('transform', rotate(hand.angle(minute)));
        continue;
      }
      if (fresh) {
        hand.glide?.cancel();
        const from = hand.angle(minute);
        hand.element.style.setProperty('transform', rotate(from));
        hand.glide = hand.element.animate([{ transform: rotate(from) }, { transform: rotate(hand.angle(minute + 1)) }], {
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
      glidingMinute = null;
    },
  };
}

