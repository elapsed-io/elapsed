/**
 * Focus view (plan, Interface; the "running, recently touched", "running, untouched" and "the motion, on a loop"
 * frames): while a session runs and nobody has touched the page for a while (the "hide controls while focusing"
 * setting, 3 s by default), the screen takes `screen--focus`: pause and end drop and fade out, the corner icons
 * fade with them, the pointer hides, and the time grows and settles lower, so it stays centred (main.css). Any
 * mouse move, click, tap or key brings everything back at once and just as fast, and the controls stay until the
 * next quiet spell. The key still does its job: nothing here stops it. Paused and check-in screens never hide
 * their controls: `active` says when it may happen. Only transforms and opacity animate (main.css).
 */

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
const CLASS = 'screen--focus';

export interface FocusViewOptions {
  /** How long the page must stay untouched, in milliseconds; null never. */
  readonly quietMs: () => number | null;
  /** Whether a focus view may show now (a session runs, no check-in, the timer showing, settings closed, the tab seen). */
  readonly active: () => boolean;
  /** Monotonic milliseconds. */
  readonly now: () => number;
  /** A wake on the site's one shared timer (the engine's scheduler), replacing the last; and its cancelling. */
  readonly wakeAfter: (delayMs: number, run: () => void) => void;
  readonly cancelWake: () => void;
}

/**
 * A touch only notes the moment and brings the controls back: it never sets a timer, so a moving mouse costs
 * nothing. One wake waits for the end of the quiet spell and looks again, waiting on if the page was touched in
 * the meantime.
 */
export class FocusView {
  readonly #screen: HTMLElement;
  readonly #options: FocusViewOptions;
  #touchedAt: number;
  #waiting = false;

  constructor(win: Window, screen: HTMLElement, options: FocusViewOptions) {
    this.#screen = screen;
    this.#options = options;
    this.#touchedAt = options.now();
    const touched = (): void => {
      this.#touched();
    };
    for (const type of ACTIVITY) win.addEventListener(type, touched, { capture: true, passive: true });
  }

  get shown(): boolean {
    return this.#screen.classList.contains(CLASS);
  }

  /** The timer's state, the screen, the tab or a setting changed: hide, or wait, as they now allow. */
  update(): void {
    const quiet = this.#options.quietMs();
    if (!this.#options.active() || quiet === null) {
      this.#stopWaiting();
      this.#screen.classList.remove(CLASS);
      return;
    }
    if (this.shown) return;
    const left = this.#touchedAt + quiet - this.#options.now();
    if (left <= 0) {
      this.#stopWaiting();
      this.#screen.classList.add(CLASS);
      return;
    }
    if (this.#waiting) return;
    this.#waiting = true;
    this.#options.wakeAfter(left, () => {
      this.#waiting = false;
      this.update();
    });
  }

  #touched(): void {
    this.#touchedAt = this.#options.now();
    if (!this.shown) return;
    this.#screen.classList.remove(CLASS);
    this.update();
  }

  #stopWaiting(): void {
    if (!this.#waiting) return;
    this.#waiting = false;
    this.#options.cancelWake();
  }
}
