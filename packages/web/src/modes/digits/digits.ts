/** Digits: the time on its own (the idle, running and paused frames). Core tier. */

import type { TimerView } from '@stopwatch/core';
import type { DisplayContext, DisplayMode } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

export function createDigitsMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  return {
    id: 'digits',
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      display = new TimeDisplay(element.ownerDocument, context);
      element.replaceChildren(display.element);
      void element.ownerDocument.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
    },
    replay() {
      // Round 5: the focus-strip replay.
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      display = null;
    },
  };
}
