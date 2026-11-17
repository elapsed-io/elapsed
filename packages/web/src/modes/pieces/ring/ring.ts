/**
 * The ring piece (the ring recipe): one revolution per cycle (an hour); an 8 px track in the faint colour; a round
 * head dot with a tail up to 55° long, drawn as one smooth conic gradient that
 * fades from the accent at the head to nothing (plan, Design system > Display
 * modes; the revised "ring" and "ring at 00:01" frames).
 *
 * The head and tail turn together on one rotor, never redrawn. While a session
 * runs, the rotor glides continuously through a linear CSS transform animation
 * on its own layer, 6° a minute; script sets the animation's start once a
 * minute and never runs a loop (as the timeline glides, decision 242). Paused
 * or waiting for a check-in, it holds where it had reached. With low power or
 * reduced motion it steps once a minute instead (owner, 2026-11-16).
 *
 * At the start of a session only the head shows at 12 o'clock; the tail grows
 * in behind it over the first nine minutes, always fading out over whatever
 * length it has, so it never covers time that has not passed and never ends in
 * a hard edge. Its length is a gradient, which no transform can stretch, and
 * timers belong to the one scheduler (which must not wake a hidden tab), so the
 * length grows once a minute, as the frames draw it; between, the tail turns
 * with the head and its transparent far end leaves 12 o'clock by up to 6°
 * (decision 267). Once whole, it never changes again.
 */

import 'virtual:tokens/ring.css';
import './ring.css';
import { RING_CONFIG } from '@stopwatch/core';
import type { RingLayer } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import { colourCss } from '../../recipe/colour.ts';
import type { Activity, Piece, PieceSetup } from '../../recipe/piece.ts';

const RING = RING_CONFIG;
const MINUTE_MS = 60_000;
/** A glide this far from focused time is set right (after the device slept, or the tab was hidden). */
const DRIFT_MS = 250;

export interface RingShape {
  /** Degrees the head turns a minute: a turn per cycle. */
  readonly degreesPerMinute: number;
  /** The tail's whole length, and whether it grows in over the first minutes or is whole from the start. */
  readonly tailDegrees: number;
  readonly growIn: boolean;
}

/** The ring piece's shape from its layer: one turn per cycle, its tail (55°, growing in, the revised frames). */
export function ringShape(layer: RingLayer, cycleMinutes: number): RingShape {
  return { degreesPerMinute: 360 / cycleMinutes, tailDegrees: layer.tail?.degrees ?? RING.tailDegrees, growIn: layer.tail?.growIn ?? true };
}

const HOUR: RingShape = { degreesPerMinute: 360 / (RING.revolution / MINUTE_MS), tailDegrees: RING.tailDegrees, growIn: true };

/**
 * Where the head points and how long the tail is, in degrees, after `focusedMs` of focus. The tail grows
 * on whole minutes. Stepped (low power, reduced motion), so does the head; gliding, the head is exact.
 * Unbounded, so the head always turns forward, also past 12 o'clock.
 */
export function ringAngles(focusedMs: number, stepped = true, shape: RingShape = HOUR): { readonly head: number; readonly tail: number } {
  const focused = Math.max(0, focusedMs);
  const minutes = Math.floor(focused / MINUTE_MS);
  const whole = minutes * shape.degreesPerMinute;
  const tail = shape.growIn ? Math.min(shape.tailDegrees, whole) : shape.tailDegrees;
  return { head: stepped ? whole : (focused / MINUTE_MS) * shape.degreesPerMinute, tail };
}

/** The ring (the `ring` piece): its track, and a rotor turning its tail and head. The time sits inside it. */
export function ringPiece({ doc, layer, recipe, context }: PieceSetup<RingLayer>): Piece {
  const cycle = recipe.cycles?.find((candidate) => candidate.id === layer.cycle);
  const shape = ringShape(layer, cycle?.minutes ?? RING.revolution / MINUTE_MS);
  const radius = layer.radius ?? RING.radiusPx;
  const thickness = layer.thickness ?? RING.trackPx;
  const head = layer.head?.size ?? RING.headPx;
  const diameter = 2 * radius + thickness;
  let glide: Animation | null = null;
  /** The minute the glide was set for, or null while the rotor stands still. */
  let glidingMinute: number | null = null;
  let still = '';
  let tail = '';

  const deg = (value: number): string => `${String(value)}deg`;
  const rotate = (value: number): string => `rotate(${deg(value)})`;
  const rotor = html(doc, 'div', { class: 'ring__rotor ring__rotor--still', attrs: { 'aria-hidden': 'true' } }, [html(doc, 'div', { class: 'ring__tail' }), html(doc, 'div', { class: 'ring__head' })]);
  const track = html(doc, 'div', { class: 'ring__track', attrs: { 'aria-hidden': 'true' } });
  // The recipe's geometry and colours, in reference pixels scaled with the time (ring.css).
  const box = { '--ring-diameter': diameter, '--ring-inset': (RING.boxPx - diameter) / 2, '--ring-track': thickness, '--ring-head': head, '--ring-head-left': RING.boxPx / 2 - head / 2, '--ring-head-top': RING.boxPx / 2 - radius - head / 2 };
  const colours = { '--ring-track-colour': colourCss(layer.track, 'var(--color-faint)'), '--ring-fill': colourCss(layer.fill, 'var(--color-accent)') };

  const showTail = (degrees: number): void => {
    const value = deg(degrees);
    if (value === tail) return;
    tail = value;
    rotor.style.setProperty('--ring-tail', value);
  };

  const place = (focusedMs: number, state: Activity): void => {
    const stepped = context.lowPower;
    if (state !== 'running' || stepped) {
      // Still: where the glide had reached (held), or on the minute (low power, reduced motion, idle).
      const angles = ringAngles(focusedMs, stepped || state === 'idle', shape);
      const key = `${String(angles.head)}/${state}`;
      showTail(angles.tail);
      if (glidingMinute === null && key === still) return;
      glide?.cancel();
      glide = null;
      glidingMinute = null;
      still = key;
      rotor.classList.add('ring__rotor--still');
      rotor.style.setProperty('transform', rotate(angles.head));
      return;
    }
    // Gliding: one minute's turn over the rest of this minute, set afresh only when the minute turns.
    still = '';
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const from = minute * shape.degreesPerMinute;
    const fresh = glide === null || glidingMinute !== minute;
    if (fresh) {
      glide?.cancel();
      rotor.classList.remove('ring__rotor--still');
      rotor.style.setProperty('transform', rotate(from));
      glide = rotor.animate([{ transform: rotate(from) }, { transform: rotate(from + shape.degreesPerMinute) }], {
        duration: MINUTE_MS,
        easing: 'linear',
        fill: 'forwards',
      });
      glidingMinute = minute;
    }
    if (glide === null) return;
    if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
    if (glide.playState !== 'running') glide.play();
    showTail(ringAngles(focusedMs, false, shape).tail);
  };

  return {
    figure: { className: 'ring', nodes: [track, rotor], style: { ...Object.fromEntries(Object.entries(box).map(([name, value]) => [name, String(value)])), ...colours } },
    render({ view, activity }) {
      place(view.focusedMs, activity);
    },
    unmount() {
      glide?.cancel();
      glide = null;
      glidingMinute = null;
    },
  };
}
