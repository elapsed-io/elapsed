/**
 * A mode's time with its pause and check-in treatment (plan, Design system >
 * Motion: "Check-in and pause: time blurred 10 px at 40% opacity, with the
 * foreground text centered on it").
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

export class TimeDisplay {
  readonly element: HTMLDivElement;
  readonly #main: TimeText;
  readonly #pausedFor: TimeText;
  readonly #overlay: HTMLDivElement;
  readonly #missed: HTMLSpanElement;
  readonly #checkIn: HTMLDivElement;
  readonly #context: DisplayContext;
  #blurAway = false;
  #missedText = '';

  constructor(doc: Document, context: DisplayContext) {
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
    this.element = html(doc, 'div', { class: 'time-stack' }, [this.#main.element, this.#overlay, this.#checkIn]);
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
    this.#main.element.classList.toggle('time--held', held);
    this.#main.element.setAttribute('aria-hidden', held ? 'true' : 'false');
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
