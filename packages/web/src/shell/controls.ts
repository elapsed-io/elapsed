/**
 * The start / pause / resume and end buttons (plan, Decisions > Controls;
 * Design system > Motion: "Start morphs into pause and end fades in to its
 * right, over 200 ms").
 *
 * The primary button keeps one element, so keyboard focus survives the morph.
 * It holds one face per label; the active face sets its width and the others
 * crossfade over it. The row re-centres by sliding, never by animating width.
 */

import { BRAND } from '@stopwatch/core';
import { html } from '../dom.ts';
import { cancelAnimations, fade, readMotion, slideFrom } from './motion.ts';

export type ControlsState = 'idle' | 'running' | 'paused';
type Face = 'start' | 'pause' | 'resume';

const FACE_FOR: Readonly<Record<ControlsState, Face>> = { idle: 'start', running: 'pause', paused: 'resume' };

export interface ControlActions {
  readonly primary: () => void;
  readonly end: () => void;
}

export class Controls {
  readonly #primary: HTMLButtonElement;
  readonly #end: HTMLButtonElement;
  readonly #faces: ReadonlyMap<Face, HTMLSpanElement>;
  #state: ControlsState = 'idle';

  constructor(container: HTMLElement, actions: ControlActions) {
    const doc = container.ownerDocument;
    const { timer } = BRAND.copy;
    const face = (name: Face, label: string): HTMLSpanElement =>
      html(doc, 'span', { class: `button__face button__face--${name}`, attrs: { 'aria-hidden': 'true' } }, [label]);
    this.#faces = new Map<Face, HTMLSpanElement>([
      ['start', face('start', timer.start)],
      ['pause', face('pause', timer.pause)],
      ['resume', face('resume', timer.resume)],
    ]);
    this.#primary = html(doc, 'button', { class: 'button button--primary', attrs: { type: 'button' } }, [...this.#faces.values()]);
    this.#end = html(doc, 'button', { class: 'button button--end', attrs: { type: 'button' } }, [timer.end]);
    this.#end.hidden = true;
    this.#primary.addEventListener('click', actions.primary);
    this.#end.addEventListener('click', actions.end);
    this.#show('start');
    container.replaceChildren(this.#primary, this.#end);
  }

  get primary(): HTMLButtonElement {
    return this.#primary;
  }

  update(state: ControlsState): void {
    if (state === this.#state) return;
    const motion = readMotion(this.#primary.ownerDocument);
    const moving = [this.#primary, this.#end];
    const before = moving.map((element) => element.getBoundingClientRect());
    moving.forEach(cancelAnimations);

    const endWasShown = !this.#end.hidden;
    const endShown = state !== 'idle';
    this.#state = state;
    this.#show(FACE_FOR[state]);

    if (endShown && !endWasShown) {
      this.#end.hidden = false;
      fade(this.#end, 0, 1, motion);
    } else if (!endShown && endWasShown) {
      this.#hideEnd(before[1], motion);
    }
    slideFrom(moving, before, motion);
  }

  #show(active: Face): void {
    for (const [name, element] of this.#faces) element.classList.toggle('button__face--active', name === active);
    this.#primary.setAttribute('aria-label', this.#faces.get(active)?.textContent ?? active);
  }

  /** Fades the end button out where it stood while the row re-centres without it. */
  #hideEnd(rect: DOMRect | undefined, motion: ReturnType<typeof readMotion>): void {
    const end = this.#end;
    const hadFocus = end.ownerDocument.activeElement === end;
    const parent = end.offsetParent;
    const finish = (): void => {
      end.hidden = true;
      end.classList.remove('button--leaving');
      end.style.removeProperty('left');
      end.style.removeProperty('top');
    };
    if (hadFocus) this.#primary.focus();
    if (rect === undefined || !(parent instanceof HTMLElement)) {
      finish();
      return;
    }
    const origin = parent.getBoundingClientRect();
    end.classList.add('button--leaving');
    end.style.setProperty('left', `${String(rect.left - origin.left)}px`);
    end.style.setProperty('top', `${String(rect.top - origin.top)}px`);
    const animation = fade(end, 1, 0, motion);
    if (animation === null) finish();
    else void animation.finished.then(finish, finish);
  }
}
