/**
 * A mode's whole display with its pause and check-in treatment (plan, Design
 * system > Motion: "In every display mode, the whole display (the time and its
 * graphics) blurs 10 px at 40% opacity, and "paused for" with the pause
 * length, or the check-in line, sits at the center of the display. Buttons
 * stay sharp"; the "ring, paused" and "timeline, paused" frames).
 *
 * The mode puts its graphics and the time in the display's body; the body
 * blurs while held, and the text sits centred over all of it.
 *
 * - Paused frame: "paused for" above the pause length.
 * - Paused after a missed check-in: also "a check-in went unanswered at
 *   2:00 pm" below it.
 * - Check-in frame: "press any key if you're still here" over the held time,
 *   while the session keeps running.
 */

import type { TimerView } from '@stopwatch/core';
import { BRAND } from '@stopwatch/core';
import { html, syncAnimations } from '../../dom.ts';
import { formatClockTime } from '../../shell/clock-time.ts';
import type { DisplayContext } from '../contract.ts';
import { TimeText, timeLayoutFor } from './time-text.ts';
import './time.css';

/** Arranges a mode's body around its time: digits show the time alone. */
export type Compose = (time: HTMLElement) => readonly Node[];

export class TimeDisplay {
  /** The whole display: the body, and the text centred over it. */
  readonly element: HTMLDivElement;
  readonly #body: HTMLDivElement;
  readonly #main: TimeText;
  readonly #pausedFor: TimeText;
  readonly #overlay: HTMLDivElement;
  readonly #missed: HTMLSpanElement;
  readonly #checkIn: HTMLDivElement;
  readonly #context: DisplayContext;
  #blurAway = false;
  #missedText = '';

  constructor(doc: Document, context: DisplayContext, compose: Compose = (time) => [time]) {
    this.#context = context;
    this.#main = new TimeText(doc, 'time--main');
    this.#pausedFor = new TimeText(doc, 'time--paused-for');
    this.#missed = html(doc, 'span', { class: 'paused__missed' });
    this.#missed.hidden = true;
    this.#pausedFor.element.append(html(doc, 'span', { class: 'paused__label' }, [BRAND.copy.timer.pausedFor]), this.#missed);
    this.#overlay = html(doc, 'div', { class: 'paused overlay', attrs: { 'aria-hidden': 'true' } }, [this.#pausedFor.element]);
    this.#checkIn = html(doc, 'div', { class: 'check-in overlay', attrs: { 'aria-hidden': 'true' } }, [
      html(doc, 'span', { class: 'check-in__text' }, [BRAND.copy.timer.checkIn]),
    ]);
    this.#body = html(doc, 'div', { class: 'time-stack__body' }, [...compose(this.#main.element)]);
    this.element = html(doc, 'div', { class: 'time-stack' }, [this.#body, this.#overlay, this.#checkIn]);
  }

  /** Measures the font once it is ready; until then the blur-away cannot re-centre exactly. */
  measure(): void {
    this.#main.measure();
  }

  render(view: TimerView): void {
    const { status } = view;
    const { layout, blurAway } = timeLayoutFor(this.#context.seconds, status, view.focusedMs);
    this.#main.show(view.shownMs, layout);

    if (blurAway !== this.#blurAway) {
      this.#blurAway = blurAway;
      this.#main.element.classList.toggle('time--blur-away', blurAway);
      // The seconds may have been hidden when the font was measured (the seconds setting changed).
      if (blurAway) this.#main.measure();
    }
    // CSS runs the blur-away; this only pins it to focused time and holds it while paused.
    if (blurAway) syncAnimations(this.#main.element, view.focusedMs, status === 'running');

    const paused = status === 'paused';
    const checkIn = status === 'running' && view.checkInDueAt !== null;
    const held = paused || checkIn;
    this.#body.classList.toggle('time-stack__body--held', held);
    this.#body.setAttribute('aria-hidden', held ? 'true' : 'false');
    this.#show(this.#overlay, paused);
    this.#show(this.#checkIn, checkIn);
    if (paused) {
      this.#pausedFor.show(view.pausedForShownMs ?? 0, 'full');
      this.#showMissed(view.missedCheckInAt);
    }
  }

  #show(overlay: HTMLElement, shown: boolean): void {
    overlay.classList.toggle('overlay--shown', shown);
    overlay.setAttribute('aria-hidden', shown ? 'false' : 'true');
  }

  #showMissed(at: number | null): void {
    // Compared as text, so a changed clock format shows at the next render.
    const text = at === null ? '' : BRAND.copy.timer.missedCheckIn.replace('{time}', formatClockTime(at));
    if (text === this.#missedText) return;
    this.#missedText = text;
    this.#missed.hidden = at === null;
    this.#missed.textContent = text;
  }
}
