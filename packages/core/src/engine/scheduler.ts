/**
 * The one scheduler (plan, Infrastructure > Performance requirements): the
 * engine and, from round 4, check-ins and the heartbeat share a single timer
 * that wakes only for the earliest pending task. No module keeps its own
 * interval.
 *
 * Deadlines are kept in monotonic time, like the browser's own timers, so a
 * change to the device clock never delays or hurries a wake-up. A timer that
 * fires late (a throttled background tab, a sleeping device) runs every task
 * that has fallen due, once, in deadline order.
 */

import { CONFIG } from '../config.ts';
import type { Clock, TimerHandle } from '../time/clock.ts';

interface Task {
  readonly due: number;
  readonly order: number;
  readonly run: () => void;
}

export interface SchedulerOptions {
  readonly clock: Clock;
  readonly onError: (error: unknown) => void;
}

export class Scheduler {
  readonly #clock: Clock;
  readonly #onError: (error: unknown) => void;
  readonly #tasks = new Map<string, Task>();
  #timer: { readonly handle: TimerHandle } | null = null;
  #armedFor = Number.POSITIVE_INFINITY;
  #order = 0;

  constructor(options: SchedulerOptions) {
    this.#clock = options.clock;
    this.#onError = options.onError;
  }

  /** Runs `run` once, `delayMs` from now. A task with the same key is replaced. */
  set(key: string, delayMs: number, run: () => void): void {
    const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
    this.#order += 1;
    this.#tasks.set(key, { due: this.#clock.monotonic() + delay, order: this.#order, run });
    this.#arm();
  }

  clear(key: string): void {
    if (this.#tasks.delete(key)) this.#arm();
  }

  get size(): number {
    return this.#tasks.size;
  }

  dispose(): void {
    this.#tasks.clear();
    this.#arm();
  }

  #arm(): void {
    let earliest = Number.POSITIVE_INFINITY;
    for (const task of this.#tasks.values()) earliest = Math.min(earliest, task.due);
    if (earliest === this.#armedFor) return;
    if (this.#timer !== null) {
      this.#clock.clearTimer(this.#timer.handle);
      this.#timer = null;
    }
    this.#armedFor = earliest;
    if (earliest === Number.POSITIVE_INFINITY) return;
    this.#timer = {
      handle: this.#clock.setTimer(() => {
        this.#fire();
      }, Math.max(0, earliest - this.#clock.monotonic())),
    };
  }

  #fire(): void {
    this.#timer = null;
    this.#armedFor = Number.POSITIVE_INFINITY;
    const now = this.#clock.monotonic() + CONFIG.engine.timerEarlyTolerance;
    const due = [...this.#tasks.entries()]
      .filter(([, task]) => task.due <= now)
      .sort(([, a], [, b]) => a.due - b.due || a.order - b.order);
    for (const [key, task] of due) {
      // A task may have been replaced by an earlier one in this loop.
      if (this.#tasks.get(key) !== task) continue;
      this.#tasks.delete(key);
      try {
        task.run();
      } catch (error) {
        this.#onError(error);
      }
    }
    this.#arm();
  }
}
