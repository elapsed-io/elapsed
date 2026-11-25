/**
 * Picture-in-picture (plan, Settings catalog: a display setting, off by default, that "adds a button to the
 * timer's top-right icons that opens a small floating timer window", only where the browser offers a window for a
 * page). Moved to a later release (owner, answer 38): kept behind the test flag, so the app fetches this module only
 * on a visit opened with `?test=modes`, and only where the browser has the Document Picture-in-Picture API. Without
 * both, neither the settings row nor the corner button exists and none of this is downloaded.
 *
 * The button joins the corner icons left of settings (Tabler's "picture-in-picture", the same size and colour as
 * the others). It opens a small window with the same time and buttons as the timer: the buttons do what the timer's
 * own do, and the window follows every change of the timer's view. Closing the window, switching the setting off or
 * leaving the page lets go of everything it held.
 *
 * Everything is made with createElement from the site's own strings, styled by the site's own stylesheets (linked
 * by address) and constructed sheets (copied by their rules), so the window keeps the page's Content Security
 * Policy and Trusted Types, which it inherits.
 */

import { BRAND, durationParts } from '@stopwatch/core';
import type { TimerView } from '@stopwatch/core';
import { html, svg } from '../dom.ts';
import { ICON_SVG_ATTRIBUTES } from '../icons/icons.ts';
import './pip.css';

/** The setting's row and the button's name (plan, Settings catalog). */
export const PIP_COPY = {
  label: 'picture-in-picture',
  help: 'adds a button to the timer that opens a small floating timer. shown only in browsers that offer it.',
  button: 'picture-in-picture',
} as const;

/** The floating window's size in CSS pixels, and its time's size. */
export const PIP_LAYOUT = { widthPx: 320, heightPx: 180, timePx: 48, gapPx: 14 } as const;

/** Tabler Icons' outline "picture-in-picture" (MIT, v3.31.0), as the corner's other icons are drawn. */
const PIP_ICON: readonly { readonly d: string }[] = [
  { d: 'M11 19h-6a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v4' },
  { d: 'M14 14m0 1a1 1 0 0 1 1 -1h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1z' },
];

/** What this module uses of `window.documentPictureInPicture`. */
export interface PipApi {
  requestWindow(options: { readonly width: number; readonly height: number }): Promise<Window>;
}

/** The browser's Document Picture-in-Picture, or null where it offers no window for a page. */
export function browserPip(win: Window): PipApi | null {
  return (win as Window & { readonly documentPictureInPicture?: PipApi }).documentPictureInPicture ?? null;
}

export interface PipHost {
  /** The corner icons, and the settings button the new one goes to the left of. */
  readonly corner: HTMLElement;
  readonly settingsButton: HTMLElement;
  /** The timer's view now, and every later one. */
  readonly view: () => TimerView;
  readonly onView: (listener: (view: TimerView) => void) => () => void;
  /** The timer's own buttons' actions. */
  readonly primary: () => void;
  readonly end: () => void;
  readonly onError: (error: unknown) => void;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** The time as the timer shows it: hh:mm:ss while seconds show, hh:mm once they have gone. */
export function pipTime(view: TimerView): string {
  const { hours, minutes, seconds } = durationParts(view.shownMs);
  return view.precisionMs >= 60_000 ? `${pad(hours)}:${pad(minutes)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** The primary button's label for a view: start, pause or resume, as the timer's. */
export function pipPrimary(view: TimerView): string {
  const { timer } = BRAND.copy;
  if (view.status === 'running') return timer.pause;
  if (view.status === 'paused') return timer.resume;
  return timer.start;
}

/** The window's own layout, over the site's stylesheets. */
function pipCss(): string {
  const { timePx, gapPx } = PIP_LAYOUT;
  return [
    'html, body { margin: 0; height: 100%; }',
    `body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${String(gapPx)}px; background: var(--color-background); color: var(--color-foreground); font-family: var(--font-family); font-stretch: var(--font-stretch); }`,
    `.pip__time { font-size: ${String(timePx)}px; font-weight: 300; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; white-space: nowrap; }`,
    `.pip__controls { display: flex; gap: ${String(gapPx)}px; }`,
  ].join('\n');
}

export class PictureInPicture {
  readonly #doc: Document;
  readonly #api: PipApi;
  readonly #host: PipHost;
  #button: HTMLButtonElement | null = null;
  #window: Window | null = null;
  #stop: (() => void) | null = null;

  constructor(doc: Document, api: PipApi, host: PipHost) {
    this.#doc = doc;
    this.#api = api;
    this.#host = host;
  }

  /** The open floating window, if any. */
  get window(): Window | null {
    return this.#window;
  }

  /** The setting changed (or was read at load): the corner button comes or goes; off closes the window. */
  set(on: boolean): void {
    if (on && this.#button === null) {
      const doc = this.#doc;
      const icon = svg(doc, 'svg', ICON_SVG_ATTRIBUTES, PIP_ICON.map(({ d }) => svg(doc, 'path', { d })));
      const button = html(doc, 'button', { class: 'icon-button icon-button--pip', attrs: { type: 'button', 'aria-label': PIP_COPY.button } }, [icon]);
      button.addEventListener('click', () => {
        void this.open();
      });
      this.#host.corner.insertBefore(button, this.#host.settingsButton);
      this.#button = button;
    } else if (!on && this.#button !== null) {
      this.#button.remove();
      this.#button = null;
      this.close();
    }
  }

  /** Opens the floating timer (from the button's click: the browser asks for a person's gesture). */
  async open(): Promise<void> {
    if (this.#window !== null) {
      this.#window.focus();
      return;
    }
    let pip: Window;
    try {
      pip = await this.#api.requestWindow({ width: PIP_LAYOUT.widthPx, height: PIP_LAYOUT.heightPx });
    } catch (error) {
      // Refused (no gesture, or the browser's own limits): nothing opens, as if the button had not been pressed.
      if (!(error instanceof DOMException)) this.#host.onError(error);
      return;
    }
    this.#window = pip;
    this.#fill(pip);
    pip.addEventListener(
      'pagehide',
      () => {
        this.#closed(pip);
      },
      { once: true },
    );
  }

  /** Closes the floating timer, if open. */
  close(): void {
    const pip = this.#window;
    if (pip === null) return;
    this.#closed(pip);
    pip.close();
  }

  #closed(pip: Window): void {
    if (this.#window !== pip) return;
    this.#stop?.();
    this.#stop = null;
    this.#window = null;
  }

  #fill(pip: Window): void {
    const doc = pip.document;
    doc.documentElement.lang = this.#doc.documentElement.lang;
    // The page's colour scheme and theme attributes, so the site's stylesheets read the same.
    for (const name of ['data-scheme', 'data-theme']) {
      const value = this.#doc.documentElement.getAttribute(name);
      if (value !== null) doc.documentElement.setAttribute(name, value);
    }
    doc.title = BRAND.name;
    // The site's stylesheets, by address; its constructed sheets (the theme, custom properties), by their rules.
    for (const link of this.#doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
      doc.head.append(html(doc, 'link', { attrs: { rel: 'stylesheet', href: link.href } }));
    }
    // A constructed sheet belongs to the document whose window made it: each is made again in the window.
    const Sheet = (pip as Window & typeof globalThis).CSSStyleSheet;
    const sheets: CSSStyleSheet[] = [];
    for (const sheet of this.#doc.adoptedStyleSheets) {
      const copy = new Sheet();
      copy.replaceSync([...sheet.cssRules].map((rule) => rule.cssText).join('\n'));
      sheets.push(copy);
    }
    const own = new Sheet();
    own.replaceSync(pipCss());
    doc.adoptedStyleSheets = [...sheets, own];

    const time = html(doc, 'div', { class: 'pip__time', attrs: { role: 'timer', 'aria-live': 'off' } });
    const primary = html(doc, 'button', { class: 'button button--primary', attrs: { type: 'button' } });
    const end = html(doc, 'button', { class: 'button button--end', attrs: { type: 'button' } }, [BRAND.copy.timer.end]);
    primary.addEventListener('click', () => {
      this.#host.primary();
    });
    end.addEventListener('click', () => {
      this.#host.end();
    });
    doc.body.replaceChildren(html(doc, 'main', { class: 'pip' }, [time, html(doc, 'div', { class: 'pip__controls' }, [primary, end])]));

    const show = (view: TimerView): void => {
      time.textContent = pipTime(view);
      time.setAttribute('aria-label', time.textContent);
      primary.textContent = pipPrimary(view);
      end.hidden = view.status !== 'running' && view.status !== 'paused';
    };
    show(this.#host.view());
    this.#stop = this.#host.onView(show);
  }
}
