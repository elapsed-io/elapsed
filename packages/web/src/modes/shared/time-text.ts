/**
 * The time as text: hh:mm:ss with tightened, raised colons (plan, Design
 * system > Type), shared by every Release 1 mode.
 *
 * Structure, so the seconds can blur away using only transform, opacity and
 * filter:
 *
 *   .time
 *     .time__shift--ones      translates right as the ones digit's width goes
 *       .time__shift--tens    translates right as the tens digit's width goes
 *         hh .time__colon mm  .time__tens(: s)  .time__ones(s)
 *
 * The widths that drive the translations are measured from the font in em,
 * so they follow any font and any size.
 */

import { CONFIG, durationParts } from '@stopwatch/core';
import { html } from '../../dom.ts';

export type TimeLayout = 'full' | 'short';

const pad = (value: number): string => String(value).padStart(2, '0');

function colon(doc: Document): HTMLSpanElement {
  return html(doc, 'span', { class: 'time__colon' }, [':']);
}

export class TimeText {
  readonly element: HTMLDivElement;
  readonly #hours: Text;
  readonly #minutes: Text;
  readonly #tens: Text;
  readonly #ones: Text;
  readonly #tensBox: HTMLSpanElement;
  readonly #onesBox: HTMLSpanElement;
  #layout: TimeLayout = 'full';

  constructor(doc: Document, className: string) {
    this.#hours = doc.createTextNode('00');
    this.#minutes = doc.createTextNode('00');
    this.#tens = doc.createTextNode('0');
    this.#ones = doc.createTextNode('0');
    this.#tensBox = html(doc, 'span', { class: 'time__tens' }, [colon(doc), this.#tens]);
    this.#onesBox = html(doc, 'span', { class: 'time__ones' }, [this.#ones]);
    const tensShift = html(doc, 'span', { class: 'time__shift time__shift--tens' }, [
      this.#hours,
      colon(doc),
      this.#minutes,
      this.#tensBox,
      this.#onesBox,
    ]);
    const onesShift = html(doc, 'span', { class: 'time__shift time__shift--ones' }, [tensShift]);
    this.element = html(doc, 'div', { class: `time ${className}` }, [onesShift]);
  }

  /** Shows a duration. The short layout is hh:mm. */
  show(ms: number, layout: TimeLayout): void {
    const { hours, minutes, seconds } = durationParts(ms);
    const set = (node: Text, value: string): void => {
      if (node.data !== value) node.data = value;
    };
    set(this.#hours, pad(hours));
    set(this.#minutes, pad(minutes));
    set(this.#tens, String(Math.floor(seconds / 10)));
    set(this.#ones, String(seconds % 10));
    if (layout !== this.#layout) {
      this.#layout = layout;
      this.element.classList.toggle('time--short', layout === 'short');
    }
  }

  /**
   * Records how far the time must move as each seconds digit's width goes, in
   * em of the time's own size. Called once the font has loaded.
   */
  measure(): void {
    const fontSize = Number.parseFloat(getComputedStyle(this.element).fontSize);
    if (!(fontSize > 0) || this.#layout !== 'full') return;
    const half = (box: HTMLElement): string => `${String(box.getBoundingClientRect().width / fontSize / 2)}em`;
    this.element.style.setProperty('--time-ones-shift', half(this.#onesBox));
    this.element.style.setProperty('--time-tens-shift', half(this.#tensBox));
  }
}

/** The layout and blur-away state the seconds setting asks for at a moment of focus. */
export function timeLayoutFor(
  seconds: 'blur-away' | 'always' | 'never',
  status: 'idle' | 'running' | 'paused' | 'ended',
  focusedMs: number,
): { readonly layout: TimeLayout; readonly blurAway: boolean } {
  if (seconds === 'always') return { layout: 'full', blurAway: false };
  if (seconds === 'never') return { layout: 'short', blurAway: false };
  if (status === 'idle' || status === 'ended') return { layout: 'full', blurAway: false };
  if (focusedMs >= CONFIG.motion.tensBlurWindow.end) return { layout: 'short', blurAway: false };
  return { layout: 'full', blurAway: true };
}
