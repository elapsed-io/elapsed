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
import { spokenDuration } from './spoken.ts';
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
  readonly #veil: HTMLDivElement;
  #held: boolean | null = null;
  #fade: Animation | null = null;
  readonly #missed: HTMLSpanElement;
  readonly #checkIn: HTMLDivElement;
  readonly #context: DisplayContext;
  #blurAway = false;
  #missedText = '';
  /** The last view drawn, so a change of size can re-pin the blur-away to the session's own time. */
  #view: TimerView | null = null;
  /** The time's font size when last seen; '' before the first look. */
  #fontSize = '';

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
    // The time can always be read on request: Tab to it, or read the page. It is never announced by itself.
    this.#main.element.setAttribute('role', 'timer');
    this.#main.element.setAttribute('tabindex', '0');
    this.#pausedFor.element.setAttribute('role', 'timer');
    this.#pausedFor.element.tabIndex = -1;
    this.#body = html(doc, 'div', { class: 'time-stack__body' }, [...compose(this.#main.element)]);
    // While the held state fades in or out, a veil blurs what is under it at a fixed radius (time.css).
    this.#veil = html(doc, 'div', { class: 'time-stack__veil', attrs: { 'aria-hidden': 'true' } });
    this.element = html(doc, 'div', { class: 'time-stack' }, [this.#body, this.#veil, this.#overlay, this.#checkIn]);
    // Opening settings (or any overlay that changes the room the time has) resizes the time while the
    // seconds may be sliding away; see #resized.
    const view = doc.defaultView;
    if (view !== null && 'ResizeObserver' in view) {
      new view.ResizeObserver(() => {
        this.#resized();
      }).observe(this.#main.element);
    }
  }

  /**
   * The time changed size. Its blur-away moves by distances in em of the time's size; a browser that runs
   * the animation on the compositor keeps the distances it resolved when the animation started, so the
   * slide would end a jump away from where the time now belongs (plan, Product principles: opening
   * settings or any other overlay never restarts, skips or jumps a time-based animation). The animations
   * are built afresh at the new size and pinned to the session's own time, in the same frame.
   */
  #resized(): void {
    const element = this.#main.element;
    const size = getComputedStyle(element).fontSize;
    const first = this.#fontSize === '';
    if (size === this.#fontSize) return;
    this.#fontSize = size;
    const view = this.#view;
    if (first || !this.#blurAway || view === null) return;
    element.classList.remove('time--blur-away');
    // Asking for the animations brings the style up to date, which ends the old ones before the new start.
    element.getAnimations();
    element.classList.add('time--blur-away');
    const running = view.status === 'running';
    const focusedMs = running ? view.focusedMs + Math.max(0, Date.now() - view.at) : view.focusedMs;
    syncAnimations(element, focusedMs, running);
  }

  /** Measures the font once it is ready; until then the blur-away cannot re-centre exactly. */
  measure(): void {
    this.#main.measure();
  }

  render(view: TimerView): void {
    this.#view = view;
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
    this.#hold(held);
    // Held, the blurred display is decoration: hidden from screen readers and out of the tab order; the text over it
    // (the pause length, or the check-in line) is what is read.
    this.#body.toggleAttribute('aria-hidden', held);
    this.#main.element.tabIndex = held ? -1 : 0;
    this.#pausedFor.element.tabIndex = paused ? 0 : -1;
    const focused = BRAND.copy.timer.spoken.focused.replace('{time}', spokenDuration(view.shownMs, layout === 'full'));
    this.#label(this.#main.element, focused);
    this.#show(this.#overlay, paused);
    this.#show(this.#checkIn, checkIn);
    if (paused) {
      this.#pausedFor.show(view.pausedForShownMs ?? 0, 'full');
      this.#showMissed(view.missedCheckInAt);
      const pause = BRAND.copy.timer.spoken.pausedFor.replace('{time}', spokenDuration(view.pausedForShownMs ?? 0, true));
      this.#label(this.#pausedFor.element, [pause, focused, this.#missedText].filter((part) => part !== '').join('. '));
    }
  }

  /**
   * Holds or releases the display. At rest, held is the frame's look: the display itself blurred 10 px
   * (static) at 40 %. The blurred state fades in and out over the interface's 180 ms fade without the blur ever
   * changing: for the fade, a veil blurs what is under it at the same fixed radius and only its opacity
   * moves (while the display fades between full and 40 %); when the fade ends, the display's own blur
   * takes over, which looks the same. The first render, and a display not yet in the page, take the
   * resting state at once.
   */
  #hold(held: boolean): void {
    if (this.#held === held) return;
    const first = this.#held === null;
    this.#held = held;
    const body = this.#body;
    const veil = this.#veil;
    const from = this.#fade === null ? (held ? 0 : 1) : Number(getComputedStyle(veil).opacity);
    this.#fade?.cancel();
    this.#fade = null;
    body.classList.toggle('time-stack__body--held', held);
    body.classList.remove('time-stack__body--blurred');
    if (first || !veil.isConnected) {
      veil.classList.remove('time-stack__veil--on');
      body.classList.toggle('time-stack__body--blurred', held);
      return;
    }
    veil.classList.add('time-stack__veil--on');
    const style = getComputedStyle(this.element);
    const fade = veil.animate([{ opacity: from }, { opacity: held ? 1 : 0 }], {
      duration: durationMs(style.getPropertyValue('--motion-fade')),
      easing: style.getPropertyValue('--ease-standard').trim() || 'ease',
      fill: 'forwards',
    });
    this.#fade = fade;
    void fade.finished.then(
      () => {
        if (this.#fade !== fade) return;
        this.#fade = null;
        body.classList.toggle('time-stack__body--blurred', held);
        veil.classList.remove('time-stack__veil--on');
        fade.cancel();
      },
      () => undefined,
    );
  }

  /** Labels a time in words when the words change (a timer's label is read on request, never announced). */
  #label(element: HTMLElement, label: string): void {
    if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
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

/** A CSS time ("200ms", "0.2s") in milliseconds; 0 when it cannot be read. */
function durationMs(value: string): number {
  const text = value.trim();
  const number = Number.parseFloat(text);
  if (!Number.isFinite(number)) return 0;
  return text.endsWith('ms') ? number : number * 1000;
}
