/**
 * Keep screen awake (Release 2; plan, Settings catalog: "while elapsed is the active tab", on by default): a screen
 * wake lock while the setting is on, a session is running or paused, and the page is visible (plan version 14, answer
 * 40). It is let go on the idle screen and on the results, and whenever the tab is hidden (the browser lets go of it
 * then too); it is asked for again as soon as all three hold again. Where the browser has no wake lock,
 * or refuses one (a battery saver, a policy), the screen sleeps as it always would: nothing is shown or stored, and
 * only an error of another kind is reported.
 *
 * The Permissions-Policy header leaves `screen-wake-lock` at its default, the site's own pages (build/headers.ts;
 * a test fails if the header ever disables it).
 */

/** What this module uses of a `WakeLockSentinel`. */
export interface WakeSentinel {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

/** What this module uses of `navigator.wakeLock`. */
export interface WakeLockApi {
  request(type: 'screen'): Promise<WakeSentinel>;
}

export class ScreenWake {
  readonly #doc: Document;
  readonly #api: WakeLockApi | null;
  readonly #onError: (error: unknown) => void;
  #wanted = false;
  #session = false;
  #sentinel: WakeSentinel | null = null;
  #requesting = false;

  constructor(doc: Document, api: WakeLockApi | null, onError: (error: unknown) => void) {
    this.#doc = doc;
    this.#api = api;
    this.#onError = onError;
  }

  /** Whether the screen is being kept awake now. */
  get held(): boolean {
    return this.#sentinel !== null && !this.#sentinel.released;
  }

  /** The setting changed (or was read at load). */
  set(on: boolean): void {
    this.#wanted = on;
    this.update();
  }

  /** Whether a session is running or paused (not on the idle screen, nor on the results). */
  session(open: boolean): void {
    if (open === this.#session) return;
    this.#session = open;
    this.update();
  }

  /** The tab was hidden or seen again, or something above changed: let go, or ask again. */
  update(): void {
    if (this.#keep()) this.#request();
    else this.#release();
  }

  #keep(): boolean {
    return this.#wanted && this.#session && this.#doc.visibilityState === 'visible';
  }

  #request(): void {
    const api = this.#api;
    if (api === null || this.held || this.#requesting) return;
    this.#requesting = true;
    api.request('screen').then(
      (sentinel) => {
        this.#requesting = false;
        this.#sentinel = sentinel;
        sentinel.addEventListener('release', () => {
          if (this.#sentinel === sentinel) this.#sentinel = null;
        });
        // The setting went off, the session ended or the tab was hidden while the browser answered.
        if (!this.#keep()) this.#release();
      },
      (error: unknown) => {
        this.#requesting = false;
        // A refusal (hidden by the time it was asked, a battery saver, a policy) is the browser's to make.
        if (!(error instanceof DOMException)) this.#onError(error);
      },
    );
  }

  #release(): void {
    const sentinel = this.#sentinel;
    this.#sentinel = null;
    if (sentinel === null || sentinel.released) return;
    sentinel.release().catch((error: unknown) => {
      if (!(error instanceof DOMException)) this.#onError(error);
    });
  }
}

/** The browser's wake lock, or null where it has none. */
export function browserWakeLock(win: Window): WakeLockApi | null {
  const navigator = win.navigator as unknown as { readonly wakeLock?: WakeLockApi };
  return navigator.wakeLock ?? null;
}
