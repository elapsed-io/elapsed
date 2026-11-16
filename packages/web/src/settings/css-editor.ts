/**
 * The custom CSS editor, as drawn in the advanced frame: IBM Plex Mono with
 * line numbers, comments in the muted colour. Loaded only when the advanced
 * category opens (plan, Loading and performance > On choice), together with
 * the checker that cleans the CSS when it is saved.
 *
 * The text is a plain textarea (its value is the only place the CSS lives
 * while editing; it is never parsed as HTML). Its own text is transparent and
 * drawn instead by a line-by-line copy beneath it, filled with textContent,
 * so comments can be coloured. Lines never wrap, as in the frame; the box
 * scrolls only when its text is taller than its limit or wider than the panel.
 */

import { CONFIG } from '@stopwatch/core';
import { html } from '../dom.ts';
import type { FontLoader } from '../fonts/loader.ts';
import { fontEntry } from '../fonts/registry.ts';

export { cleanCss } from '../custom-css/clean.ts';

/** The face the editor uses, loaded when the editor first shows. */
const EDITOR_FONT = fontEntry('ibm-plex-mono');
const EDITOR_WEIGHT = '400';

interface Segment {
  readonly text: string;
  readonly comment: boolean;
}

/** Splits CSS into lines of plain and comment segments. Strings are skipped, so a "/*" in one starts no comment. */
export function highlightLines(text: string): Segment[][] {
  const lines: Segment[][] = [];
  let line: Segment[] = [];
  let current = '';
  let comment = false;
  let quote: string | null = null;
  const flush = (): void => {
    if (current !== '') line.push({ text: current, comment });
    current = '';
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? '';
    if (character === '\n') {
      flush();
      lines.push(line);
      line = [];
      quote = null;
      continue;
    }
    if (comment) {
      current += character;
      if (character === '*' && text[index + 1] === '/') {
        current += '/';
        index += 1;
        flush();
        comment = false;
      }
      continue;
    }
    if (quote !== null) {
      current += character;
      if (character === '\\' && text[index + 1] !== undefined && text[index + 1] !== '\n') {
        current += text[index + 1] ?? '';
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      flush();
      comment = true;
      current = '/*';
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    current += character;
  }
  flush();
  lines.push(line);
  return lines;
}

export interface CssEditorOptions {
  /** The textarea's id, for the "custom css" label. */
  readonly id: string;
  readonly text: string;
  readonly fonts: FontLoader;
}

export class CssEditor {
  readonly element: HTMLDivElement;
  readonly #doc: Document;
  readonly #input: HTMLTextAreaElement;
  readonly #gutter: HTMLDivElement;
  readonly #mirror: HTMLDivElement;
  /** What each mirror line shows, so only changed lines are redrawn. */
  #drawn: string[] = [];

  constructor(doc: Document, options: CssEditorOptions) {
    this.#doc = doc;
    this.#gutter = html(doc, 'div', { class: 'css-editor__gutter', attrs: { 'aria-hidden': 'true' } });
    this.#mirror = html(doc, 'div', { class: 'css-editor__mirror', attrs: { 'aria-hidden': 'true' } });
    this.#input = html(doc, 'textarea', {
      class: 'css-editor__input',
      attrs: { id: options.id, wrap: 'off', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off' },
    });
    this.#input.value = options.text;
    this.element = html(doc, 'div', { class: 'css-editor' }, [this.#gutter, html(doc, 'div', { class: 'css-editor__code' }, [this.#mirror, this.#input])]);
    this.element.style.setProperty('--editor-font-family', `"${EDITOR_FONT.family}", ui-monospace, monospace`);
    this.#input.addEventListener('input', () => {
      this.#draw();
    });
    this.#draw();
    // Once shown, and whenever the panel's width changes, the box decides again whether it must scroll.
    const view = doc.defaultView;
    if (view !== null) {
      new view.ResizeObserver(() => {
        this.#fit();
      }).observe(this.element);
    }
    // The editor's face only; the timer font choice loads all of a font's weights.
    void options.fonts.face(EDITOR_FONT, EDITOR_WEIGHT).catch(() => undefined);
  }

  get value(): string {
    return this.#input.value;
  }

  set value(text: string) {
    if (this.#input.value === text) return;
    this.#input.value = text;
    this.#draw();
  }

  focus(): void {
    this.#input.focus();
  }

  #draw(): void {
    const lines = highlightLines(this.#input.value);
    const doc = this.#doc;
    // Line numbers: one per line of text.
    const numbers = this.#gutter.children.length;
    for (let index = numbers; index < lines.length; index += 1) this.#gutter.append(html(doc, 'div', {}, [String(index + 1)]));
    for (let index = numbers; index > lines.length; index -= 1) this.#gutter.lastElementChild?.remove();
    // The copy beneath the textarea, line by line.
    for (let index = 0; index < lines.length; index += 1) {
      const segments = lines[index] ?? [];
      const key = segments.map((segment) => `${segment.comment ? '1' : '0'}${String(segment.text.length)}:${segment.text}`).join('');
      if (this.#drawn[index] === key) continue;
      this.#drawn[index] = key;
      const children = segments.map((segment) => (segment.comment ? html(doc, 'span', { class: 'css-editor__comment' }, [segment.text]) : doc.createTextNode(segment.text)));
      const existing = this.#mirror.children[index];
      if (existing === undefined) this.#mirror.append(html(doc, 'div', { class: 'css-editor__line' }, children));
      else existing.replaceChildren(...children);
    }
    while (this.#mirror.children.length > lines.length) this.#mirror.lastElementChild?.remove();
    this.#drawn.length = lines.length;
    this.#fit();
  }

  /** Scrolls only when needed: a scroll container is drawn on its own layer, which shifts edges by a fraction of a pixel. */
  #fit(): void {
    const box = this.element;
    if (!box.isConnected) return;
    const tall = this.#drawn.length > CONFIG.design.settings.editor.maxLines;
    box.removeAttribute('data-overflow');
    const wide = box.scrollWidth > box.clientWidth;
    box.toggleAttribute('data-overflow', tall || wide);
  }
}
