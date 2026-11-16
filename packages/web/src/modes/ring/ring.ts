/**
 * Ring: one revolution per hour; an 8 px track in the faint colour; a round
 * head dot with a tail up to 55° long, drawn as one smooth conic gradient that
 * fades from the accent at the head to nothing (plan, Design system > Display
 * modes; the revised "ring" and "ring at 00:01" frames).
 *
 * The head and tail turn by a CSS transform set once a minute, never redrawn.
 * At the start of a session only the head shows at 12 o'clock; the tail grows
 * in behind it over the first nine minutes, always fading out over whatever
 * length it has, so it never covers time that has not passed and never ends in
 * a hard edge.
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

/** Where the head points and how long the tail is, in degrees, after `focusedMs` of focus: whole minutes only. */
export function ringAngles(focusedMs: number): { readonly head: number; readonly tail: number } {
  const minutes = Math.floor(Math.max(0, focusedMs) / MINUTE_MS);
  const head = minutes * DEGREES_PER_MINUTE;
  return { head, tail: Math.min(RING.tailDegrees, head) };
}

export function createRingMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let rotor: HTMLDivElement | null = null;
  let shown = '';

  return {
    id: 'ring',
    replayTiming: CONFIG.modes.ring.replay,
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      shown = '';
      const doc = element.ownerDocument;
      rotor = html(doc, 'div', { class: 'ring__rotor' }, [html(doc, 'div', { class: 'ring__tail' }), html(doc, 'div', { class: 'ring__head' })]);
      const ring = rotor;
      display = new TimeDisplay(doc, context, (time) => [
        html(doc, 'div', { class: 'ring' }, [html(doc, 'div', { class: 'ring__track', attrs: { 'aria-hidden': 'true' } }), ring, time]),
      ]);
      rotor.setAttribute('aria-hidden', 'true');
      element.replaceChildren(display.element);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      if (rotor === null) return;
      const { head, tail } = ringAngles(view.focusedMs);
      const key = `${String(head)}/${String(tail)}`;
      if (key === shown) return;
      shown = key;
      // Unbounded, so the head always turns forward, also past 12 o'clock.
      rotor.style.setProperty('--ring-angle', `${String(head)}deg`);
      rotor.style.setProperty('--ring-tail', `${String(tail)}deg`);
    },
    replay(target: HTMLElement, session: Session) {
      drawRings(target, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      display = null;
      rotor = null;
    },
  };
}
