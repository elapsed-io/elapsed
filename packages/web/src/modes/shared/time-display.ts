/**
 * A mode's time with its pause treatment (plan, Design system > Motion:
 * "Check-in and pause: time blurred 10 px at 40% opacity, with the foreground
 * text centered on it"; the paused frame: "paused for" above the pause length).
 */

import type { TimerView } from '@stopwatch/core';
import { BRAND } from '@stopwatch/core';
import { html, syncAnimations } from '../../dom.ts';
import type { DisplayContext } from '../contract.ts';
import { TimeText, timeLayoutFor } from './time-text.ts';
import './time.css';

export class TimeDisplay {
  readonly element: HTMLDivElement;
  readonly #main: TimeText;
  readonly #pausedFor: TimeText;
  readonly #overlay: HTMLDivElement;
  readonly #context: DisplayContext;
  #blurAway = false;

  constructor(doc: Document, context: DisplayContext) {
    this.#context = context;
    this.#main = new TimeText(doc, 'time--main');
    this.#pausedFor = new TimeText(doc, 'time--paused-for');
    this.#pausedFor.element.append(html(doc, 'span', { class: 'paused__label' }, [BRAND.copy.timer.pausedFor]));
    this.#overlay = html(doc, 'div', { class: 'paused', attrs: { 'aria-hidden': 'true' } }, [this.#pausedFor.element]);
    this.element = html(doc, 'div', { class: 'time-stack' }, [this.#main.element, this.#overlay]);
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
    }
    // CSS runs the blur-away; this only pins it to focused time and holds it while paused.
    if (blurAway) syncAnimations(this.#main.element, view.focusedMs, status === 'running');

    const paused = status === 'paused';
    this.#main.element.classList.toggle('time--held', paused);
    this.#main.element.setAttribute('aria-hidden', paused ? 'true' : 'false');
    this.#overlay.classList.toggle('paused--shown', paused);
    this.#overlay.setAttribute('aria-hidden', paused ? 'false' : 'true');
    if (paused) this.#pausedFor.show(view.pausedForShownMs ?? 0, 'full');
  }
}
