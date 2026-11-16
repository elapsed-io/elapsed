import { CONFIG } from '@stopwatch/core';
/** Digits: the time on its own (the idle, running and paused frames). Core tier. */

import type { Session, TimerView } from '@stopwatch/core';
import type { DisplayContext, DisplayMode, ReplaySurface } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

export function createDigitsMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  return {
    id: 'digits',
    replayTiming: CONFIG.modes.digits.replay,
    replayLayout: 'strip',
    mount(element: HTMLElement, context: DisplayContext) {
      root = element;
      display = new TimeDisplay(element.ownerDocument, context);
      element.replaceChildren(display.element);
      void element.ownerDocument.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
    },
    async replay(surface: ReplaySurface, session: Session) {
      // The focus strip loads with the results, not with the timer.
      const { drawStrip } = await import('../shared/strip-replay.ts');
      drawStrip(surface.graphic, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      root?.replaceChildren();
      root = null;
      display = null;
    },
  };
}
