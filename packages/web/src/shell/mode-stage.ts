/**
 * The display mode on screen, and the next one getting ready (plan-release-2, round 2.10: mode loading is one
 * pipeline that can be cancelled).
 *
 * A chosen mode loads in the background while the current one stays on screen: its code is fetched
 * (recipe/library.ts, cancellable), then it is mounted out of sight in a root of its own beside the live one (at
 * once for a core mode, so the switch lands on the frame of the choice; for a download, in a background task of its
 * own, after input and drawing, never holding a frame), and once it is whole (its art loaded, its images decoded:
 * DisplayMode.ready) the two swap on one frame. The leaving mode is taken down completely (DisplayMode.unmount); only
 * its environment stays, for a crossfade of 120 ms at most, and never more than one at a time.
 *
 * A newer choice cancels a load still running, and so do the session's controls (start, pause, end: the app calls
 * cancel first). The session never waits on a load: it records the choice when it is made (app.ts).
 */

import type { DisplayContext, DisplayMode } from '../modes/contract.ts';
import type { RegisteredMode } from '../modes/registry.ts';

/** The site's context for one mode: the site changes its values and the mode reads them as they are (contract.ts). */
export type ModeContext = { -readonly [K in keyof DisplayContext]-?: DisplayContext[K] };

export interface LiveMode {
  readonly registered: RegisteredMode;
  readonly mode: DisplayMode;
  readonly root: HTMLElement;
  readonly context: ModeContext;
}

export interface ModeStageHost {
  /** A context for a mode about to mount: the site's values now, with that mode's options. */
  contextFor(next: RegisteredMode): ModeContext;
  /** Draws the timer's current view into a mode (the staged one, before it shows, so it shows whole). */
  draw(mode: DisplayMode): void;
  /** A mode's code arrived (the service worker keeps a download for offline use). */
  loaded(next: RegisteredMode): void;
  /** The swap happened: `live` is on screen and `leaving` gone. */
  swapped(live: LiveMode, leaving: RegisteredMode): void;
  /** Runs `task` as a background task of its own, after input and drawing; returns a cancel. */
  idle(task: () => void): () => void;
  /** The environment crossfade's length now, in milliseconds (0 with reduced motion). */
  fadeMs(): number;
  report(error: unknown): void;
}

interface Pending {
  readonly registered: RegisteredMode;
  readonly controller: AbortController;
  cancelIdle: (() => void) | null;
  staged: LiveMode | null;
}

const STAGE_CLASS = 'mode-stage';

export class ModeStage {
  readonly #host: ModeStageHost;
  #live: LiveMode;
  #pending: Pending | null = null;
  #leaving: { readonly element: HTMLElement; readonly fade: Animation | null } | null = null;

  constructor(live: LiveMode, host: ModeStageHost) {
    this.#live = live;
    this.#host = host;
  }

  get live(): LiveMode {
    return this.#live;
  }

  /** The mode still loading, if any. */
  get loading(): RegisteredMode | null {
    return this.#pending?.registered ?? null;
  }

  /** Starts showing `next`: cancels any load still running; the current mode stays until `next` is whole. */
  show(next: RegisteredMode): void {
    this.cancel();
    if (next.manifest.id === this.#live.registered.manifest.id) return;
    const pending: Pending = { registered: next, controller: new AbortController(), cancelIdle: null, staged: null };
    this.#pending = pending;
    const { signal } = pending.controller;
    // Read through a function: cancel() aborts it while the load awaits, where TypeScript cannot see it.
    const stopped = (): boolean => signal.aborted;
    void next
      .load(signal)
      .then(async (factory) => {
        this.#host.loaded(next);
        if (stopped()) return;
        /** A background task of its own, or at once if the load is cancelled meanwhile. */
        const background = async (): Promise<void> => {
          await new Promise<void>((resolve) => {
            pending.cancelIdle = this.#host.idle(resolve);
            signal.addEventListener('abort', () => {
              resolve();
            });
          });
          pending.cancelIdle = null;
        };
        // A core mode mounts at once, on the frame of the choice; a download in a task of its own.
        const core = next.manifest.tier === 'core';
        if (!core) await background();
        if (stopped()) return;
        const live = this.#live.root;
        const root = live.ownerDocument.createElement('div');
        root.className = STAGE_CLASS;
        // The mode's own tokens ([data-mode]) apply in the stage as they will on the screen.
        root.dataset['mode'] = next.manifest.id;
        root.setAttribute('aria-hidden', 'true');
        root.inert = true;
        live.after(root);
        const context = this.#host.contextFor(next);
        const mode = factory();
        pending.staged = { registered: next, mode, root, context };
        mode.mount(root, context);
        this.#host.draw(mode);
        await mode.ready?.();
        if (stopped()) return;
        if (!core) {
          // Its styles and layout, worked out in a task of their own, so the swap's frame has only to paint it.
          await background();
          if (stopped()) return;
          root.getBoundingClientRect();
          await background();
          if (stopped()) return;
        }
        this.#swap(pending.staged);
      })
      .catch((error: unknown) => {
        if (!stopped()) this.#host.report(error);
        if (this.#pending === pending) this.cancel();
      });
  }

  /** Cancels the load still running, if any, taking down whatever of it was mounted. Returns the mode it was. */
  cancel(): RegisteredMode | null {
    const pending = this.#pending;
    if (pending === null) return null;
    this.#pending = null;
    pending.controller.abort();
    pending.cancelIdle?.();
    if (pending.staged !== null) {
      pending.staged.mode.unmount();
      pending.staged.root.remove();
    }
    return pending.registered;
  }

  /** On one frame: the leaving mode goes completely, its environment kept for the crossfade, and the staged root takes its place. */
  #swap(staged: LiveMode): void {
    this.#pending = null;
    const leaving = this.#live;
    const environment = this.#keepEnvironment(leaving.root);
    leaving.mode.unmount();
    const { root } = staged;
    root.className = 'mode-root';
    delete root.dataset['mode'];
    root.removeAttribute('aria-hidden');
    root.inert = false;
    root.hidden = leaving.root.hidden;
    leaving.root.remove();
    this.#live = staged;
    this.#host.swapped(staged, leaving.registered);
    this.#crossfade(environment);
  }

  /**
   * The leaving environment (a mode's water, sky or space) is held where it was, behind the screen, while the next
   * one fades in over it or while it fades out itself. Its glides stop where they are. Only one is ever kept: one
   * still fading goes at once.
   */
  #keepEnvironment(root: HTMLElement): HTMLElement | null {
    this.#dropLeaving();
    const environment = root.querySelector<HTMLElement>(':scope > .environment');
    if (environment === null || this.#host.fadeMs() <= 0) return null;
    for (const animation of environment.getAnimations({ subtree: true })) {
      if (!(animation instanceof CSSTransition)) animation.commitStyles();
      animation.cancel();
    }
    environment.classList.add('environment--leaving');
    root.parentElement?.prepend(environment);
    return environment;
  }

  #crossfade(leaving: HTMLElement | null): void {
    if (leaving === null) return;
    const arriving = this.#live.root.querySelector<HTMLElement>(':scope > .environment');
    const fading = arriving ?? leaving;
    const fade = fading.animate([{ opacity: arriving === null ? 1 : 0 }, { opacity: arriving === null ? 0 : 1 }], { duration: this.#host.fadeMs(), easing: 'ease-in-out' });
    this.#leaving = { element: leaving, fade };
    const done = (): void => {
      if (this.#leaving?.element === leaving) this.#leaving = null;
      leaving.remove();
    };
    fade.addEventListener('finish', done);
    fade.addEventListener('cancel', done);
  }

  #dropLeaving(): void {
    const leaving = this.#leaving;
    if (leaving === null) return;
    this.#leaving = null;
    leaving.fade?.finish();
    leaving.element.remove();
  }
}
