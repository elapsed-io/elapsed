/**
 * The session maximum notice (plan, Session lifecycle: "the session ends and
 * is saved, and a notice explains the 16-hour maximum"; the session maximum
 * frame). It takes the place of the time and controls; the corner icons stay.
 *
 * Until the results screen arrives in round 5, "view results" returns to the
 * idle screen (owner decision, 2026-11-15).
 */

import { BRAND, CONFIG, durationParts } from '@stopwatch/core';
import { html, svg } from '../dom.ts';
import { ICONS } from '../icons/icons.ts';

const pad = (value: number): string => String(value).padStart(2, '0');

function hours(text: string): string {
  return text.replaceAll('{hours}', String(CONFIG.session.maxFocus / (60 * 60 * 1000)));
}

/** hh:mm:ss with the time's tightened, raised colons. */
function timeOf(doc: Document, ms: number): HTMLDivElement {
  const { hours: h, minutes, seconds } = durationParts(ms);
  const colon = (): HTMLSpanElement => html(doc, 'span', { class: 'time__colon' }, [':']);
  return html(doc, 'div', { class: 'time notice__time' }, [pad(h), colon(), pad(minutes), colon(), pad(seconds)]);
}

export class MaximumNotice {
  readonly element: HTMLElement;
  readonly #action: HTMLButtonElement;

  constructor(doc: Document, onAction: () => void) {
    const copy = BRAND.copy.maximum;
    const icon = svg(
      doc,
      'svg',
      { class: 'notice__icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' },
      ICONS.maximum.map(({ tag, attributes }) => svg(doc, tag, attributes)),
    );
    this.#action = html(doc, 'button', { class: 'button button--accent', attrs: { type: 'button' } }, [copy.action]);
    this.#action.addEventListener('click', onAction);
    this.element = html(doc, 'section', { class: 'notice', attrs: { 'aria-labelledby': 'notice-heading' } }, [
      icon,
      html(doc, 'h1', { class: 'notice__heading', attrs: { id: 'notice-heading' } }, [hours(copy.heading)]),
      timeOf(doc, CONFIG.session.maxFocus),
      html(doc, 'p', { class: 'notice__body' }, [hours(copy.body)]),
      html(doc, 'div', { class: 'controls' }, [this.#action]),
    ]);
    this.element.hidden = true;
  }

  get shown(): boolean {
    return !this.element.hidden;
  }

  /** The words a screen reader hears when the notice appears. */
  get announcement(): string {
    return `${hours(BRAND.copy.maximum.heading)}. ${hours(BRAND.copy.maximum.body)}`;
  }

  show(takeFocus: boolean): void {
    this.element.hidden = false;
    if (takeFocus) this.#action.focus({ preventScroll: true });
  }

  hide(): void {
    this.element.hidden = true;
  }
}
