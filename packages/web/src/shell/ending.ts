/**
 * The ending countdown (plan, Decisions > Controls: "Ending opens a
 * 'tabulating results' screen with a 5-second progress bar, cancel on the
 * left and end now on the right ... End now ignores input for its first
 * 300 ms"; the ending countdown frame).
 *
 * The browser fills the bar at a constant rate (a transform animation); the
 * animation finishing is the countdown finishing, so no timer is needed. End
 * now finishes the same animation, so both reach one completion path. Once complete the buttons are hidden but
 * keep their place, and the screen becomes the tabulating screen that the
 * results fade in over (decision 135).
 */

import { BRAND, CONFIG } from '@stopwatch/core';
import { html } from '../dom.ts';

export interface EndingActions {
  readonly cancel: () => void;
  /** The bar is full: the countdown ran out or end now was pressed. */
  readonly complete: () => void;
}

export class EndingCountdown {
  readonly element: HTMLElement;
  readonly #fill: HTMLDivElement;
  readonly #cancel: HTMLButtonElement;
  readonly #endNow: HTMLButtonElement;
  readonly #actions: EndingActions;
  #countdown: Animation | null = null;

  constructor(doc: Document, actions: EndingActions) {
    const copy = BRAND.copy.ending;
    this.#actions = actions;
    this.#fill = html(doc, 'div', { class: 'ending__fill' });
    this.#cancel = html(doc, 'button', { class: 'button button--secondary', attrs: { type: 'button' } }, [copy.cancel]);
    this.#endNow = html(doc, 'button', { class: 'button button--end', attrs: { type: 'button' } }, [copy.endNow]);
    this.element = html(doc, 'section', { class: 'ending', attrs: { 'aria-label': copy.tabulating } }, [
      html(doc, 'p', { class: 'ending__text' }, [copy.tabulating]),
      html(doc, 'div', { class: 'ending__bar', attrs: { 'aria-hidden': 'true' } }, [this.#fill]),
      html(doc, 'div', { class: 'ending__spacer' }),
      html(doc, 'div', { class: 'controls ending__controls' }, [this.#cancel, this.#endNow]),
    ]);
    this.element.hidden = true;
    this.#cancel.addEventListener('click', () => {
      this.cancel();
    });
    this.#endNow.addEventListener('click', () => {
      this.endNow();
    });
  }

  get shown(): boolean {
    return !this.element.hidden;
  }

  /** Whether the countdown is still running (cancel and end now apply). */
  get running(): boolean {
    return this.#countdown !== null;
  }

  /** Starts the countdown. Focus moves to cancel when it was on a control that is now hidden. */
  start(takeFocus: boolean): void {
    this.#stop();
    this.element.classList.remove('ending--done');
    this.element.hidden = false;
    const countdown = this.#fill.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], {
      duration: CONFIG.session.endingCountdown,
      easing: 'linear',
      fill: 'forwards',
    });
    this.#countdown = countdown;
    countdown.addEventListener('finish', () => {
      if (this.#countdown !== countdown) return;
      this.#countdown = null;
      this.element.classList.add('ending--done');
      this.#actions.complete();
    });
    if (takeFocus) this.#cancel.focus({ preventScroll: true });
  }

  /** The tabulating screen for a session that ended on its own: a full bar and no buttons. */
  showComplete(): void {
    this.#stop();
    this.element.classList.add('ending--done');
    this.element.hidden = false;
  }

  cancel(): void {
    if (this.#countdown === null) return;
    this.hide();
    this.#actions.cancel();
  }

  /** Ignored for the first 300 ms, so a double press on end cannot skip the countdown. */
  endNow(): void {
    const countdown = this.#countdown;
    if (countdown === null) return;
    const elapsed = countdown.currentTime;
    if (typeof elapsed === 'number' && elapsed < CONFIG.session.endNowGuard) return;
    countdown.finish();
  }

  hide(): void {
    this.#stop();
    this.element.hidden = true;
    this.element.classList.remove('ending--done');
  }

  #stop(): void {
    this.#countdown = null;
    // Also the last countdown, finished by end now and held at its end: nothing is left on the bar.
    for (const animation of this.#fill.getAnimations()) animation.cancel();
  }
}
