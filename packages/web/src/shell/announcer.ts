/**
 * A polite live region for things that happen without the user acting: a
 * check-in falling due (plan, Session lifecycle: "it is always announced to
 * screen readers"), a pause after a missed check-in, the session maximum.
 * It is in the page from the start, so screen readers are listening before
 * the first announcement.
 */

import { html } from '../dom.ts';

export class Announcer {
  readonly #region: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.#region = html(parent.ownerDocument, 'div', { class: 'visually-hidden', attrs: { role: 'status', 'aria-live': 'polite' } });
    parent.append(this.#region);
  }

  /** Announces `text`. A new text node is announced even when the words repeat. */
  say(text: string): void {
    this.#region.replaceChildren(this.#region.ownerDocument.createTextNode(text));
  }
}
