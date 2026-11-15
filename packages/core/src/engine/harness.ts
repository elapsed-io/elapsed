/** Test harness for the engine: a fake clock, a bus that records every event, and the engine. Used only by tests. */

import { EventBus } from '../events/bus.ts';
import { FakeClock } from '../testing/fake-clock.ts';
import { TimerEngine } from './engine.ts';
import type { TimerEvents } from './events.ts';
import type { SecondsDisplay, TimerView } from './view.ts';

export const EVENT_TYPES = [
  'session.started',
  'session.paused',
  'session.resumed',
  'session.ended',
  'mode.switched',
  'clock.jumped',
  'view.changed',
  'milestone.hour',
] as const satisfies readonly (keyof TimerEvents)[];

export type Recorded = { [K in keyof TimerEvents]: { readonly type: K; readonly payload: TimerEvents[K] } }[keyof TimerEvents];

export interface HarnessOptions {
  readonly now?: number;
  readonly seconds?: SecondsDisplay;
  readonly timeZone?: string;
}

export function harness(options: HarnessOptions = {}) {
  const clock = new FakeClock(options.now === undefined ? {} : { now: options.now });
  const errors: unknown[] = [];
  const bus = new EventBus<TimerEvents>({ onError: (error) => errors.push(error) });
  let zone = options.timeZone ?? 'UTC';
  let ids = 0;
  const engine = new TimerEngine({
    clock,
    events: bus,
    newId: () => {
      ids += 1;
      return `00000000-0000-4000-8000-${String(ids).padStart(12, '0')}`;
    },
    onError: (error) => errors.push(error),
    timeZone: () => zone,
    ...(options.seconds === undefined ? {} : { seconds: options.seconds }),
  });
  let log: Recorded[] = [];
  for (const type of EVENT_TYPES) {
    bus.on(type, (payload) => log.push({ type, payload } as Recorded));
  }
  return {
    clock,
    bus,
    engine,
    errors,
    setTimeZone(next: string): void {
      zone = next;
    },
    /** Returns the events recorded since the last call and starts a new record. */
    take(): Recorded[] {
      const taken = log;
      log = [];
      return taken;
    },
    types(events: readonly Recorded[]): string[] {
      return events.map((event) => event.type);
    },
    views(events: readonly Recorded[]): TimerView[] {
      return events.flatMap((event) => (event.type === 'view.changed' ? [event.payload.view] : []));
    },
  };
}
