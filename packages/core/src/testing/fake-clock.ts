/**
 * A controllable clock for tests (plan, Working rules: engine logic is
 * unit-tested with a fake clock). It keeps the device clock and the monotonic
 * clock separately, and runs timers on monotonic time as browsers do, so
 * tests can reproduce what real devices do:
 *
 * - advance: normal running; timers fire on time.
 * - sleep: the device sleeps. The device clock moves on. On some platforms
 *   (macOS) the monotonic clock pauses, so pending timers wait out their
 *   remaining delay after waking; on others it keeps going and overdue timers
 *   fire as soon as the device wakes.
 * - throttle: a background tab. Timers fire late, aligned to a coarse grid
 *   (1 s for hidden tabs, 1 min under Chrome's intensive throttling).
 * - jumpDeviceClock: the user or the network changes the device clock.
 */

import type { Clock, TimerHandle } from '../time/clock.ts';

interface FakeTimer {
  readonly id: number;
  readonly due: number;
  readonly callback: () => void;
}

export interface FakeClockOptions {
  /** Starting device time, epoch ms. Defaults to 2026-11-16 14:00:00 UTC. */
  readonly now?: number;
  /** Starting monotonic time. Defaults to 1000. */
  readonly monotonic?: number;
}

export interface SleepOptions {
  /** Whether the monotonic clock keeps counting while the device sleeps. Defaults to 'paused' (macOS). */
  readonly monotonic?: 'paused' | 'advances';
}

const MAX_TIMERS_PER_STEP = 1_000_000;

export class FakeClock implements Clock {
  #wall: number;
  #monotonic: number;
  #timers = new Map<number, FakeTimer>();
  #nextId = 1;
  #alignMs: number | null = null;
  #fired = 0;

  constructor(options: FakeClockOptions = {}) {
    this.#wall = options.now ?? Date.UTC(2026, 10, 16, 14, 0, 0);
    this.#monotonic = options.monotonic ?? 1000;
  }

  now(): number {
    return this.#wall;
  }

  monotonic(): number {
    return this.#monotonic;
  }

  setTimer(callback: () => void, delayMs: number): TimerHandle {
    let due = this.#monotonic + Math.max(0, delayMs);
    if (this.#alignMs !== null) due = Math.ceil(due / this.#alignMs) * this.#alignMs;
    const id = this.#nextId;
    this.#nextId += 1;
    this.#timers.set(id, { id, due, callback });
    return id;
  }

  clearTimer(handle: TimerHandle): void {
    if (typeof handle === 'number') this.#timers.delete(handle);
  }

  /** Lets `ms` pass with the device awake, firing timers at their due times. */
  advance(ms: number): void {
    const target = this.#monotonic + ms;
    this.#runDue(target, true);
    this.#wall += target - this.#monotonic;
    this.#monotonic = target;
  }

  /** The device sleeps for `ms`, then wakes. */
  sleep(ms: number, options: SleepOptions = {}): void {
    this.#wall += ms;
    if (options.monotonic === 'advances') {
      this.#monotonic += ms;
      // Waking: every overdue timer fires now, in order, without time passing.
      this.#runDue(this.#monotonic, false);
    }
  }

  /** Changes the device clock by `deltaMs` (negative sets it back). Timers are unaffected. */
  jumpDeviceClock(deltaMs: number): void {
    this.#wall += deltaMs;
  }

  /** Makes new timers fire late, at the next multiple of `alignMs` of monotonic time. Pass null to stop. */
  throttle(alignMs: number | null): void {
    this.#alignMs = alignMs;
  }

  /** How many timer callbacks have run. */
  get firedTimers(): number {
    return this.#fired;
  }

  get pendingTimers(): number {
    return this.#timers.size;
  }

  #runDue(until: number, moveTime: boolean): void {
    for (let count = 0; ; count += 1) {
      if (count > MAX_TIMERS_PER_STEP) throw new Error('FakeClock: timers keep rescheduling themselves');
      let next: FakeTimer | undefined;
      for (const timer of this.#timers.values()) {
        if (timer.due <= until && (next === undefined || timer.due < next.due || (timer.due === next.due && timer.id < next.id))) {
          next = timer;
        }
      }
      if (next === undefined) return;
      if (moveTime && next.due > this.#monotonic) {
        this.#wall += next.due - this.#monotonic;
        this.#monotonic = next.due;
      }
      this.#timers.delete(next.id);
      this.#fired += 1;
      next.callback();
    }
  }
}
