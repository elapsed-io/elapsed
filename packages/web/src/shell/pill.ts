/**
 * Notices (plan, Interface; the "notice: fullscreen tip" frame): one small reusable pill, 20 px tall with
 * 11 px text, shown just above the time without moving it, with a dismiss ×. A notice that points to a
 * setting carries the one universal link, "change", which makes that change at once (turns a switch on, or picks a
 * choice: the seconds tip's blur away) and opens settings on it. Which notice shows, and when, is the shell's call; the pill only draws one and reports the presses.
 *
 * The pill hangs from the top of the time (position absolute, bottom 100%), so the time never moves when it
 * appears or goes.
 */

import { BRAND, type SettingKey, type Settings } from '@stopwatch/core';
import { html, svg } from '../dom.ts';
import { ICONS } from '../icons/icons.ts';

/** What a notice's "change" sets: one setting to one value (a switch turned on, or a choice). */
export type NoticeChange = { [K in SettingKey]: { readonly key: K; readonly value: Settings[K] } }[SettingKey];

export interface Notice {
  /** Kept when dismissed; lowercase words joined by hyphens. */
  readonly id: string;
  readonly text: string;
  /** What "change" sets, when the notice points to a setting. */
  readonly change?: NoticeChange;
}

export interface PillHost {
  dismiss(notice: Notice): void;
  change(notice: Notice, change: NoticeChange): void;
}

export class Pill {
  readonly element: HTMLElement;
  /** The words, a bare text node before the links, as the frame writes them. */
  readonly #text: Text;
  readonly #change: HTMLButtonElement;
  #notice: Notice | null = null;

  constructor(doc: Document, host: PillHost) {
    const copy = BRAND.copy.notices;
    this.#text = doc.createTextNode('');
    this.#change = html(doc, 'button', { class: 'pill__change', attrs: { type: 'button' } }, [copy.change]);
    this.#change.addEventListener('click', () => {
      const notice = this.#notice;
      if (notice?.change !== undefined) host.change(notice, notice.change);
    });
    const cross = svg(
      doc,
      'svg',
      { class: 'pill__cross', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'aria-hidden': 'true', focusable: 'false' },
      ICONS.close.map(({ tag, attributes }) => svg(doc, tag, attributes)),
    );
    const dismiss = html(doc, 'button', { class: 'pill__dismiss', attrs: { type: 'button', 'aria-label': copy.dismiss } }, [cross]);
    dismiss.addEventListener('click', () => {
      const notice = this.#notice;
      if (notice !== null) host.dismiss(notice);
    });
    // In the page only while it shows a notice, so a screen reader hears it arrive.
    this.element = html(doc, 'div', { class: 'pill', attrs: { role: 'status' } }, [this.#text, this.#change, dismiss]);
  }

  get notice(): Notice | null {
    return this.#notice;
  }

  /**
   * Shows a notice hanging from the top of `time`, or takes the pill away for null. Called whenever the notice or
   * the mode's time may have changed (a mode switch, or an option that rebuilds the time).
   */
  show(notice: Notice | null, time: HTMLElement | null): void {
    if (notice === null || time === null) {
      this.#notice = null;
      this.element.remove();
      return;
    }
    if (notice.id !== this.#notice?.id) {
      this.#notice = notice;
      this.#text.data = notice.text;
      this.#change.hidden = notice.change === undefined;
    }
    if (this.element.parentElement !== time) time.append(this.element);
  }
}
