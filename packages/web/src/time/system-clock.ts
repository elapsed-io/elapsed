import type { Clock, TimerHandle } from '@stopwatch/core';

/** The browser's clocks and timers, given to the engine (plan, Architecture invariant 1). */
export function systemClock(): Clock {
  return {
    now: () => Date.now(),
    monotonic: () => performance.now(),
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: (handle: TimerHandle) => {
      if (typeof handle === 'number') window.clearTimeout(handle);
    },
  };
}
