/**
 * The clock the engine is given (plan, Architecture invariant 1). Core never
 * reads the system clock or sets timers itself; the site passes a clock built
 * on Date.now, performance.now and setTimeout, and tests pass a FakeClock.
 */

/** An opaque timer handle: a number in browsers, an object in Node. */
export type TimerHandle = unknown;

export interface Clock {
  /** The device's wall-clock time in epoch milliseconds (UTC). Can jump when the device clock is changed. */
  now(): number;
  /**
   * A monotonic time in milliseconds from an arbitrary origin. It never goes
   * backward and is unaffected by device clock changes. Whether it advances
   * while the device sleeps depends on the platform.
   */
  monotonic(): number;
  /** Runs `callback` once after `delayMs` of monotonic time. */
  setTimer(callback: () => void, delayMs: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
}
