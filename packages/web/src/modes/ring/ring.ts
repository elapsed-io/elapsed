/**
 * Ring: one revolution per hour; an 8 px track in the faint colour; a round
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
import { CONFIG } from '@stopwatch/core';
import type { Session, TimerView } from '@stopwatch/core';
import { html } from '../../dom.ts';
import type { DisplayContext, DisplayMode } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';
import { drawRings } from './ring-replay.ts';

const RING = CONFIG.modes.ring;
const MINUTE_MS = 60_000;
const DEGREES_PER_MINUTE = 360 / (RING.revolution / MINUTE_MS);
/** A glide this far from focused time is set right (after the device slept, or the tab was hidden). */
const DRIFT_MS = 250;

/**
 * Where the head points and how long the tail is, in degrees, after `focusedMs` of focus. The tail grows
 * on whole minutes. Stepped (low power, reduced motion), so does the head; gliding, the head is exact.
 * Unbounded, so the head always turns forward, also past 12 o'clock.
 */
export function ringAngles(focusedMs: number, stepped = true): { readonly head: number; readonly tail: number } {
  const focused = Math.max(0, focusedMs);
  const minutes = Math.floor(focused / MINUTE_MS);
  const whole = minutes * DEGREES_PER_MINUTE;
  const tail = Math.min(RING.tailDegrees, whole);
  return { head: stepped ? whole : (focused / MINUTE_MS) * DEGREES_PER_MINUTE, tail };
}

type State = 'idle' | 'running' | 'held';

export function createRingMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let rotor: HTMLDivElement | null = null;
  let glide: Animation | null = null;
  /** The minute the glide was set for, or null while the rotor stands still. */
  let glidingMinute: number | null = null;
  let still = '';
  let tail = '';

  const deg = (value: number): string => `${String(value)}deg`;
  const rotate = (value: number): string => `rotate(${deg(value)})`;

  const showTail = (degrees: number): void => {
    const value = deg(degrees);
    if (value === tail || rotor === null) return;
    tail = value;
    rotor.style.setProperty('--ring-tail', value);
  };

  const place = (focusedMs: number, state: State): void => {
    if (rotor === null) return;
    const stepped = context?.lowPower === true;
    if (state !== 'running' || stepped) {
      // Still: where the glide had reached (held), or on the minute (low power, reduced motion, idle).
      const angles = ringAngles(focusedMs, stepped || state === 'idle');
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
    // Gliding: 6° over the rest of this minute, set afresh only when the minute turns.
    still = '';
    const minute = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
    const into = Math.max(0, focusedMs) - minute * MINUTE_MS;
    const from = minute * DEGREES_PER_MINUTE;
    const fresh = glide === null || glidingMinute !== minute;
    if (fresh) {
      glide?.cancel();
      rotor.classList.remove('ring__rotor--still');
      rotor.style.setProperty('transform', rotate(from));
      glide = rotor.animate([{ transform: rotate(from) }, { transform: rotate(from + DEGREES_PER_MINUTE) }], {
        duration: MINUTE_MS,
        easing: 'linear',
        fill: 'forwards',
      });
      glidingMinute = minute;
    }
    if (glide === null) return;
    if (fresh || glide.playState === 'finished' || Math.abs(Number(glide.currentTime) - into) >= DRIFT_MS) glide.currentTime = into;
    if (glide.playState !== 'running') glide.play();
    showTail(ringAngles(focusedMs, false).tail);
  };

  return {
    id: 'ring',
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      glide = null;
      glidingMinute = null;
      still = '';
      tail = '';
      const doc = element.ownerDocument;
      rotor = html(doc, 'div', { class: 'ring__rotor ring__rotor--still' }, [html(doc, 'div', { class: 'ring__tail' }), html(doc, 'div', { class: 'ring__head' })]);
      const ring = rotor;
      display = new TimeDisplay(doc, displayContext, (time) => [
        html(doc, 'div', { class: 'ring' }, [html(doc, 'div', { class: 'ring__track', attrs: { 'aria-hidden': 'true' } }), ring, time]),
      ]);
      rotor.setAttribute('aria-hidden', 'true');
      element.replaceChildren(display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      const state: State = view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
      place(view.focusedMs, state);
    },
    replay(target: HTMLElement, session: Session) {
      drawRings(target, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      glide?.cancel();
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      rotor = null;
      glide = null;
      glidingMinute = null;
    },
  };
}
