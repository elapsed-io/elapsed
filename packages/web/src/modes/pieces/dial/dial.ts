/**
 * The dial piece (the analog stopwatch's recipe; plan, Design system > Display
 * modes > Analog stopwatch; the redesigned "analog" frame).
 *
 * The dial is the frame's own drawing, an SVG whose block is the 260 × 260 units around the dial (one a reference
 * pixel at a radius of 130; the crown overhangs it above, round 2.13),
 * drawn once: a polished case with a ridged crown at 12 that dips whenever end is pressed, an outer track of
 * ticks with its numbers turned to follow the edge, slim baton indices that stop short of (or leave out) any
 * small dial in their way, and the small dials. Each hand and the centre pin are HTML on top of it, each a
 * drawing of its own that the browser turns on the compositor: while a session runs every hand glides through a
 * linear CSS rotation set by script once a minute (the minute hand 6° a minute, the hours hand 0.5°, a seconds
 * hand a whole turn), never redrawn and never in a loop; paused or waiting for a check-in they hold where they
 * reached; with low power (or reduced motion) they step once a minute, so a seconds hand rests at its 60 (plan,
 * Product principles; owner, 2026-11-16 and changes 4). The frame shows no digits: the time is still in the
 * page for screen readers (a timer, read on request), and "paused for" shows over the dial as in every mode.
 *
 * Its results replay is the ring replay: one ring per hour, with the hands (the "results: analog and ring"
 * frame).
 */

import 'virtual:tokens/analog.css';
import './dial.css';
import { ANALOG_CONFIG, CONFIG, PIECES_CONFIG } from '@stopwatch/core';
import type { Cycle, DialLayer, Subdial } from '@stopwatch/core';
import { html, svg } from '../../../dom.ts';
import { motionScale } from '../../../shell/motion.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';

const ANALOG = ANALOG_CONFIG;
const MINUTE_MS = 60_000;
/** The dial's centre, in the drawing's own units. */
const CENTRE = ANALOG.centre;
const FRAME_RADIUS = ANALOG.caseRadius;
/** The block: the 260 px square around the dial (the frame's view box); the crown overhangs it above. */
const BOX = ANALOG.box;
const VIEW_BOX = `${String(BOX.x)} ${String(BOX.y)} ${String(BOX.width)} ${String(BOX.height)}`;
const SVG_HIDDEN = { 'aria-hidden': 'true', focusable: 'false' } as const;

/** Each dial's gradients need ids of their own in the page. */
let dials = 0;

/** The point at `radius` and `degrees` (clockwise from 12) around a centre, to one decimal, as the frame writes it. */
function around(centre: { readonly x: number; readonly y: number }, radius: number, degrees: number): { x: string; y: string } {
  const angle = (degrees * Math.PI) / 180;
  return { x: (centre.x + radius * Math.sin(angle)).toFixed(1), y: (centre.y - radius * Math.cos(angle)).toFixed(1) };
}

/** A line from `inner` to `outer` along the ray at `degrees` about a centre. */
function ray(doc: Document, centre: { readonly x: number; readonly y: number }, outer: number, inner: number, degrees: number, attributes: Readonly<Record<string, string | number>>): SVGLineElement {
  const from = around(centre, outer, degrees);
  const to = around(centre, inner, degrees);
  return svg(doc, 'line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, ...attributes });
}

/** A subdial as the piece draws it: where, how large, what it counts, and its hand. */
interface SubdialShape {
  readonly spec: Subdial;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly cycle: Cycle | undefined;
  readonly hand: number;
  readonly tail: number;
  readonly width: number;
  /** A small dial of its own (its marks and numbers), not a hand alone. */
  readonly face: boolean;
}

interface DialShape {
  readonly cycleMinutes: number;
  readonly major: number;
  readonly minor: number;
  readonly labels: number;
  readonly format: 'minutes' | 'hours' | 'none';
  readonly batons: number;
  readonly subdials: readonly SubdialShape[];
}

/** How many marks a small dial has: its ticks, else one a number, or an hour of its cycle. */
function marksOf(sub: SubdialShape): number {
  if (sub.spec.ticks !== undefined) return sub.spec.ticks;
  if ((sub.spec.labels ?? 0) > 0) return sub.spec.labels ?? 0;
  return Math.max(1, Math.round((sub.cycle?.minutes ?? PIECES_CONFIG.dial.cycleMinutes) / 60));
}

/** A small dial's numbers, the first at 12: seconds on a dial of a minute or less, minutes up to an hour, else hours. */
function numbersOf(count: number, cycleMinutes: number): string[] {
  const total = cycleMinutes <= 1 ? cycleMinutes * 60 : cycleMinutes <= 60 ? cycleMinutes : cycleMinutes / 60;
  return Array.from({ length: count }, (_, index) => String(Math.round(((index === 0 ? count : index) * total) / count)));
}

/**
 * Where a baton at `degrees` ends, inward from the edge: its own inner radius, or the nearest point to the centre
 * from which it stays clear of every small dial (the frame's 25 and 35), or null when even its outer end would
 * touch one (the frame's 30, over the seconds dial).
 */
function batonInner(degrees: number, subdials: readonly SubdialShape[]): number | null {
  const { outer, inner, clearance }: { readonly outer: number; readonly inner: number; readonly clearance: number } = ANALOG.batons;
  const angle = (degrees * Math.PI) / 180;
  const clear = (radius: number): boolean =>
    subdials.every((sub) => !sub.face || Math.hypot(CENTRE.x + radius * Math.sin(angle) - sub.x, CENTRE.y - radius * Math.cos(angle) - sub.y) >= sub.radius + clearance);
  if (!clear(outer)) return null;
  let end = outer;
  for (let radius = outer; radius >= inner; radius -= 0.5) {
    if (!clear(radius)) break;
    end = radius;
  }
  return outer - end < 2 ? null : end;
}

/** The case, the crown, the face, the outer track and its numbers, the batons and the small dials. */
function dial(doc: Document, shape: DialShape): { readonly drawing: SVGSVGElement; readonly crown: SVGGElement } {
  dials += 1;
  const caseId = `dial-case-${String(dials)}`;
  const crownId = `dial-crown-${String(dials)}`;
  const stop = (offset: number, name: string): SVGStopElement => svg(doc, 'stop', { offset, class: `analog__stop analog__stop--${name}` });
  const defs = svg(doc, 'defs', {}, [
    svg(doc, 'linearGradient', { id: caseId, x1: 0, y1: 0, x2: 1, y2: 1 }, [stop(0, 'gray'), stop(0.5, 'faint'), stop(1, 'track')]),
    svg(doc, 'linearGradient', { id: crownId, x1: 0, y1: 0, x2: 0, y2: 1 }, [stop(0, 'gray'), stop(1, 'faint')]),
  ]);

  const { stem, cap, ridges } = ANALOG.crown;
  const crown = svg(doc, 'g', { class: 'analog__crown' }, [
    svg(doc, 'rect', { x: stem.x, y: stem.y, width: stem.width, height: stem.height, fill: `url(#${crownId})` }),
    svg(doc, 'rect', { x: cap.x, y: cap.y, width: cap.width, height: cap.height, rx: cap.radius, fill: `url(#${crownId})` }),
    ...Array.from({ length: ridges.count }, (_, index) => {
      const x = ridges.firstX + index * ridges.step;
      return svg(doc, 'line', { class: 'analog__ridge', x1: x, y1: ridges.top, x2: x, y2: ridges.bottom, 'stroke-width': 1 });
    }),
  ]);

  // The outer track: every minor tick, and the major ticks longer and heavier where they fall.
  const { ticks } = ANALOG;
  const majorAngles = Array.from({ length: shape.major }, (_, index) => (index * 360) / shape.major);
  const isMajor = (degrees: number): boolean => majorAngles.some((angle) => Math.abs(angle - degrees) < 1e-6);
  const track = [
    ...Array.from({ length: shape.minor }, (_, index) => (index * 360) / shape.minor).filter((degrees) => !isMajor(degrees)),
    ...majorAngles,
  ]
    .sort((a, b) => a - b)
    .map((degrees) => {
      const major = isMajor(degrees);
      return ray(doc, CENTRE, ticks.outer, major ? ticks.major : ticks.minor, degrees, { class: 'analog__tick', 'stroke-width': major ? ticks.majorWidth : ticks.minorWidth });
    });

  // The numbers, each turned to follow the edge: 5 to 60 for minutes, 1 to 12 for hours. One that would crowd a
  // small dial is left out, as the frame leaves out its 30 over the seconds dial.
  const numbers = Array.from({ length: shape.format === 'none' ? 0 : shape.labels }, (_, index) => {
    const degrees = (360 * index) / shape.labels;
    const { x, y } = around(CENTRE, ANALOG.numbers.radius, degrees);
    const crowds = shape.subdials.some((sub) => sub.face && Math.hypot(Number(x) - sub.x, Number(y) - sub.y) < sub.radius + ANALOG.batons.clearance + ANALOG.labelPx / 2);
    if (crowds) return null;
    const value = shape.format === 'hours' ? (index === 0 ? shape.labels : index) : ((index === 0 ? shape.labels : index) * shape.cycleMinutes) / shape.labels;
    return svg(doc, 'text', { class: 'analog__label', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', transform: `rotate(${String(degrees)} ${x} ${y})` }, [String(value)]);
  });
  // The frame draws the 12 o'clock number last.
  const orderedNumbers = [...numbers.slice(1), ...numbers.slice(0, 1)].filter((text): text is SVGTextElement => text !== null);

  // A baton runs from its outer radius inward; one cut short ends nearer the edge (the frame's 25 and 35).
  const batonLines = Array.from({ length: shape.batons }, (_, index) => (index * 360) / shape.batons).flatMap((degrees) => {
    const end = batonInner(degrees, shape.subdials);
    if (end === null) return [];
    return [ray(doc, CENTRE, ANALOG.batons.outer, end, degrees, { class: 'analog__baton', 'stroke-opacity': ANALOG.batons.opacity, 'stroke-width': ANALOG.batons.width, 'stroke-linecap': 'round' })];
  });

  const sub = ANALOG.subdial;
  const small = shape.subdials.flatMap((dialShape) => {
    if (!dialShape.face) return [];
    const count = marksOf(dialShape);
    const labels = dialShape.spec.labels ?? 0;
    // Long ticks at each number when a dial has more ticks than numbers; every mark long otherwise.
    const longEvery = labels > 0 && count > labels && count % labels === 0 ? count / labels : 1;
    const marks = Array.from({ length: count }, (_, index) =>
      ray(doc, dialShape, dialShape.radius * sub.tickOuter, dialShape.radius * (index % longEvery === 0 ? sub.longTick : sub.shortTick), (index * 360) / count, {
        class: 'analog__tick',
        'stroke-width': sub.tickWidth,
      }),
    );
    const values = numbersOf(labels, dialShape.cycle?.minutes ?? 1);
    const numberText = values.map((value, index) => {
      const { x, y } = around(dialShape, dialShape.radius * sub.numbers, (index * 360) / labels);
      const text = svg(doc, 'text', { class: 'analog__subnumber', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, [value]);
      if (index === 0 && dialShape.spec.topColor !== undefined) text.style.setProperty('fill', colourCss(dialShape.spec.topColor, 'var(--color-muted)'));
      return text;
    });
    // The frame draws the 12 o'clock number last.
    const orderedValues = [...numberText.slice(1), ...numberText.slice(0, 1)];
    return [
      svg(doc, 'circle', { class: 'analog__subdial', cx: dialShape.x, cy: dialShape.y, r: dialShape.radius, 'fill-opacity': ANALOG.subdialFill, 'stroke-width': sub.rimWidth }),
      ...marks,
      ...orderedValues,
    ];
  });

  const drawing = svg(doc, 'svg', { class: 'analog__dial', viewBox: VIEW_BOX, ...SVG_HIDDEN }, [
    defs,
    crown,
    svg(doc, 'circle', { cx: CENTRE.x, cy: CENTRE.y, r: ANALOG.caseRadius, fill: `url(#${caseId})` }),
    svg(doc, 'circle', { class: 'analog__rim', cx: CENTRE.x, cy: CENTRE.y, r: ANALOG.rimRadius, 'stroke-opacity': ANALOG.rimOpacity, 'stroke-width': 1 }),
    svg(doc, 'circle', { class: 'analog__face', cx: CENTRE.x, cy: CENTRE.y, r: ANALOG.faceRadius }),
    ...track,
    ...orderedNumbers,
    ...batonLines,
    ...small,
  ]);
  return { drawing, crown };
}

interface Hand {
  readonly element: HTMLElement;
  /** Where it points after `minutes` of focus, in degrees. */
  readonly angle: (minutes: number) => number;
  readonly glides: boolean;
  /** A seconds hand (a turn a minute or faster): it rests at its 60 when the seconds are set never to show. */
  readonly seconds: boolean;
  glide: Animation | null;
}

/**
 * The dial (the `dial` piece): its case, track, numbers and batons drawn once, a hand turning once a cycle, and up
 * to eight subdials: small dials with their own hands (the seconds dial) and further hands from the centre (the
 * hours hand, a sweeping seconds hand). The time is in the page for screen readers only, as the frames show no
 * digits.
 */
export function dialPiece({ doc, layer, recipe, context }: PieceSetup<DialLayer>): Piece {
  const cycleOf = (id: string): Cycle | undefined => recipe.cycles?.find((cycle) => cycle.id === id);
  const subdials: SubdialShape[] = (layer.subdials ?? []).map((spec) => {
    const offset = spec.offset ?? [0, 0];
    const radius = spec.radius ?? PIECES_CONFIG.dial.subdialRadius;
    return {
      spec,
      x: CENTRE.x + offset[0],
      y: CENTRE.y + offset[1],
      radius,
      cycle: cycleOf(spec.cycle),
      hand: spec.hand?.length ?? radius * PIECES_CONFIG.dial.subdialHandShare,
      tail: spec.hand?.tail ?? 0,
      width: spec.hand?.width ?? PIECES_CONFIG.dial.subdialHandWidth,
      face: (spec.face ?? 'dial') === 'dial',
    };
  });
  const shape: DialShape = {
    cycleMinutes: cycleOf(layer.cycle)?.minutes ?? ANALOG.revolution / MINUTE_MS,
    major: layer.ticks?.major ?? PIECES_CONFIG.dial.majorTicks,
    minor: layer.ticks?.minor ?? PIECES_CONFIG.dial.minorTicks,
    labels: layer.labels?.count ?? ANALOG.revolution / MINUTE_MS / ANALOG.labelEveryMinutes,
    format: layer.labels?.format ?? 'minutes',
    batons: layer.batons ?? 0,
    subdials,
  };
  let glidingMinute: number | null = null;
  let still = '';
  const rotate = (value: number): string => `rotate(${String(value)}deg)`;
  // Each hand is the frame's own line (and a small dial's hub) in a drawing of its own, which CSS turns about the
  // point it is pinned at.
  const handDrawing = (name: string, about: { readonly x: number; readonly y: number }, length: number, tail: number, width: number, colour: string): HTMLDivElement => {
    const element = html(doc, 'div', { class: `analog__hand analog__hand--${name}` }, [
      svg(doc, 'svg', { class: 'analog__hand-drawing', viewBox: VIEW_BOX, ...SVG_HIDDEN }, [
        svg(doc, 'line', { class: 'analog__hand-line', 'stroke-linecap': 'round', x1: about.x, y1: about.y + tail, x2: about.x, y2: about.y - length, 'stroke-width': width }),
      ]),
    ]);
    // The pivot, from the block's corner.
    element.style.setProperty('--hand-x', String(about.x - BOX.x));
    element.style.setProperty('--hand-y', String(about.y - BOX.y));
    element.style.setProperty('--hand-colour', colour);
    return element;
  };
  const mainMinutes = shape.cycleMinutes;
  const minuteHand: Hand = {
    element: handDrawing(
      'minute',
      CENTRE,
      layer.hand?.length ?? ANALOG.minuteHand.length,
      layer.hand?.tail ?? ANALOG.minuteHand.tail,
      layer.hand?.width ?? ANALOG.minuteHand.width,
      colourCss(layer.hand?.color, 'var(--color-accent)'),
    ),
    angle: (minutes) => (minutes * 360) / mainMinutes,
    glides: true,
    seconds: mainMinutes <= 1,
    glide: null,
  };
  const hubs: SVGCircleElement[] = [];
  // Drawn bottom to top: the small dials' hands, then the hands from the centre, the slowest underneath (the
  // frame: seconds, hours, minutes, then the pin).
  const subHands: { readonly hand: Hand; readonly layer: number; readonly turn: number }[] = subdials.map((sub) => {
    const cycle = sub.cycle;
    const atCentre = sub.x === CENTRE.x && sub.y === CENTRE.y;
    const colour = colourCss(sub.spec.hand?.color, 'var(--color-foreground)');
    const element = handDrawing(atCentre ? 'centre' : 'sub', sub, sub.hand, sub.tail, sub.width, colour);
    // A small dial's hub sits still over its hand, in a drawing of its own, so it is never turned and resampled.
    if (sub.face && !atCentre) {
      const hub = svg(doc, 'circle', { class: 'analog__hub', cx: sub.x, cy: sub.y, r: ANALOG.subdial.hub });
      hub.style.setProperty('fill', colour);
      hubs.push(hub);
    }
    element.dataset['cycle'] = sub.spec.cycle;
    const turn = cycle?.minutes ?? ANALOG.hoursRevolution / MINUTE_MS;
    return { hand: { element, angle: (minutes) => (minutes * 360) / turn, glides: true, seconds: turn <= 1, glide: null }, layer: atCentre ? 2 : 1, turn };
  });
  const ordered = [...subHands, { hand: minuteHand, layer: 2, turn: mainMinutes }].sort((a, b) => a.layer - b.layer || b.turn - a.turn);
  const hands = ordered.map(({ hand }) => hand);
  // The hubs over the small dials' hands and under the hands from the centre, as the frame stacks them.
  const hubLayer = hubs.length === 0 ? [] : [html(doc, 'div', { class: 'analog__hubs' }, [svg(doc, 'svg', { class: 'analog__hand-drawing', viewBox: VIEW_BOX, ...SVG_HIDDEN }, hubs)])];
  const underHubs = ordered.filter(({ layer }) => layer < 2).map(({ hand }) => hand);
  const overHubs = ordered.filter(({ layer }) => layer >= 2).map(({ hand }) => hand);
  const { drawing, crown } = dial(doc, shape);
  const pinColour = colourCss(layer.hand?.color, 'var(--color-accent)');
  const pin = html(doc, 'div', { class: 'analog__pin' }, [
    svg(doc, 'svg', { class: 'analog__hand-drawing', viewBox: VIEW_BOX, ...SVG_HIDDEN }, [
      svg(doc, 'circle', { class: 'analog__pin-disc', cx: CENTRE.x, cy: CENTRE.y, r: ANALOG.pin.radius }),
      svg(doc, 'circle', { class: 'analog__pin-hole', cx: CENTRE.x, cy: CENTRE.y, r: ANALOG.pin.hole }),
    ]),
  ]);
  pin.style.setProperty('--hand-colour', pinColour);
  const face = html(doc, 'div', { class: 'analog analog--still', attrs: { 'aria-hidden': 'true' } }, [
    drawing,
    ...underHubs.map((hand) => hand.element),
    ...hubLayer,
    ...overHubs.map((hand) => hand.element),
    pin,
  ]);
  // The recipe's size: a radius of 130 is the frame's 260 px block (the shared dial).
  const scale = (layer.radius ?? FRAME_RADIUS) / FRAME_RADIUS;
  const style: Record<string, string> = {
    '--analog-width': String(BOX.width * scale),
    '--analog-height': String(BOX.height * scale),
    '--analog-unit': String(scale),
  };

  /** The crown dips once, by transform alone, as the frame's press does: down and back up in a half sine. */
  let dip: Animation | null = null;
  const pressCrown = (): void => {
    if (context.reducedMotion || dip?.playState === 'running') return;
    const { dip: depth, dipMs } = ANALOG.crown;
    dip = crown.animate(
      [
        { transform: 'translateY(0px)', easing: 'cubic-bezier(0.61, 1, 0.88, 1)' },
        { transform: `translateY(${String(depth)}px)`, offset: 0.5, easing: 'cubic-bezier(0.12, 0, 0.39, 0)' },
        { transform: 'translateY(0px)' },
      ],
      { duration: dipMs * motionScale(doc) },
    );
  };

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    const exact = Math.max(0, focusedMs) / MINUTE_MS;
    const noSeconds = context.seconds === 'never';
    const at = (hand: Hand, minutes: number): number => (hand.seconds && noSeconds ? 0 : hand.angle(minutes));
    if (state !== 'running' || stepped) {
      const minutes = stepped || state === 'idle' ? Math.floor(exact) : exact;
      const key = `${String(minutes)}/${state}/${String(noSeconds)}`;
      if (glidingMinute === null && key === still) return;
      glidingMinute = null;
      still = key;
      face.classList.add('analog--still');
      for (const hand of hands) {
        hand.glide?.cancel();
        hand.glide = null;
        hand.element.style.setProperty('transform', rotate(at(hand, minutes)));
      }
      return;
    }
    // Gliding: each hand turns its share of a minute over the rest of this minute, set afresh when it turns; a
    // seconds hand with the seconds set never to show stands at its 60.
    still = '';
    const minute = Math.floor(exact);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const moving = (hand: Hand): boolean => hand.glides && !(hand.seconds && noSeconds);
    const fresh = glidingMinute !== minute || hands.some((hand) => moving(hand) === (hand.glide === null));
    face.classList.remove('analog--still');
    for (const hand of hands) {
      if (!moving(hand)) {
        if (fresh) {
          hand.glide?.cancel();
          hand.glide = null;
          hand.element.style.setProperty('transform', rotate(at(hand, minute)));
        }
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
      if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= CONFIG.motion.glideDriftMs) glide.currentTime = into;
      if (glide.playState !== 'running') glide.play();
    }
    glidingMinute = minute;
  };

  return {
    figure: { className: 'analog-stack', nodes: [face], style, hold: (time) => html(doc, 'div', { class: 'analog__time' }, [time]) },
    render({ view, activity }) {
      place(view.focusedMs, activity);
    },
    onEvent(event) {
      if (event.type === 'end.pressed') pressCrown();
    },
    unmount() {
      for (const hand of hands) hand.glide?.cancel();
      dip?.cancel();
      glidingMinute = null;
    },
  };
}
