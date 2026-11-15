/**
 * Randomised check of the engine against invariants that must hold whatever
 * happens: thousands of operations per seed mixing commands, normal time,
 * both kinds of sleep, throttling and device clock changes. Seeds are fixed,
 * so any failure reproduces exactly.
 */

import { describe, expect, it } from 'vitest';
import { focusedMs } from '../session/derive.ts';
import { HOUR, MINUTE } from '../session/fixtures.ts';
import { defaultRules } from '../session/rules.ts';
import { parseActiveState, parseSession } from '../session/validate.ts';
import { harness } from './harness.ts';
import type { Recorded } from './harness.ts';

/** mulberry32: a small, well-mixed, seedable generator. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const MODES = ['digits', 'ring', 'timeline'] as const;

interface RunOptions {
  readonly seed: number;
  readonly jumps: boolean;
  readonly steps: number;
  /** Run the abandonment rules and the heartbeat as the site does. */
  readonly rules?: boolean;
}

function run({ seed, jumps, steps, rules = false }: RunOptions) {
  const random = generator(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const h = harness({ seconds: pick(['blur-away', 'always', 'never'] as const), ...(rules ? { rules: defaultRules(), heartbeat: true } : {}) });

  // A model of the true focused time, kept only when the device clock is honest.
  let modelFocus = 0;
  let modelRunning = false;
  const passTime = (ms: number): void => {
    if (modelRunning) modelFocus += ms;
  };
  const lastFocus = new Map<string, number>();
  const lastHour = new Map<string, number>();
  const tally = { jumps: 0, milestones: 0, sessions: 0, views: 0 };

  const check = (events: readonly Recorded[]): void => {
    expect(h.errors).toEqual([]);
    expect(h.clock.pendingTimers).toBeLessThanOrEqual(1);
    const { session, view } = h.engine;
    expect(view.status).toBe(h.engine.status);
    expect(view.shownMs % view.precisionMs).toBe(0);
    expect(view.shownMs).toBeLessThanOrEqual(view.focusedMs);
    if (session !== null) {
      expect(() => parseSession(session)).not.toThrow();
      expect(view.focusedMs).toBe(focusedMs(session, view.at));
    }
    const state = h.engine.state;
    if (state !== null) expect(() => parseActiveState(JSON.parse(JSON.stringify(state)))).not.toThrow();
    for (const event of events) {
      if (event.type === 'session.started') lastFocus.set(event.payload.session.id, 0);
      // A missed check-in takes back the unconfirmed time, by design.
      if (event.type === 'session.paused' && event.payload.reason === 'checkin_missed') lastFocus.set(event.payload.session.id, 0);
      if (event.type === 'view.changed' && event.payload.view.status !== 'idle' && session !== null) {
        // Focus never goes backward within a session, whatever the clock does.
        const previous = lastFocus.get(session.id) ?? 0;
        expect(event.payload.view.focusedMs).toBeGreaterThanOrEqual(previous);
        lastFocus.set(session.id, event.payload.view.focusedMs);
      }
      if (event.type === 'milestone.hour') {
        const id = event.payload.session.id;
        expect(event.payload.hours).toBe((lastHour.get(id) ?? 0) + 1);
        lastHour.set(id, event.payload.hours);
        expect(focusedMs(event.payload.session, event.payload.at)).toBe(event.payload.hours * HOUR);
      }
      if (event.type === 'clock.jumped') expect(jumps).toBe(true);
    }
    if (!jumps && !rules) expect(session === null ? 0 : focusedMs(session, h.clock.now())).toBe(modelFocus);
  };

  for (let step = 0; step < steps; step += 1) {
    const roll = random();
    if (roll < 0.3) {
      const ms = Math.floor(random() < 0.8 ? random() * 2 * MINUTE : random() * 3 * HOUR);
      passTime(ms);
      h.clock.advance(ms);
    } else if (roll < 0.4) {
      const ms = Math.floor(random() * 4 * HOUR);
      passTime(ms);
      h.clock.sleep(ms, { monotonic: pick(['paused', 'advances'] as const) });
    } else if (roll < 0.45) {
      h.clock.throttle(pick([null, 1000, MINUTE]));
    } else if (roll < 0.55) {
      if (h.engine.start(pick(MODES))) {
        modelFocus = 0;
        modelRunning = true;
      }
    } else if (roll < 0.65) {
      if (h.engine.pause()) modelRunning = false;
    } else if (roll < 0.75) {
      if (h.engine.resume()) modelRunning = true;
    } else if (roll < 0.8) {
      if (h.engine.end(pick(['user', 'pause_timeout', 'checkin_missed', 'max_duration'] as const))) modelRunning = false;
    } else if (roll < 0.85) {
      h.engine.switchMode(pick(MODES));
    } else if (roll < 0.9) {
      if (rules && random() < 0.5) h.engine.answerCheckIn();
      else h.engine.sync();
    } else if (jumps) {
      const big = random() < 0.5;
      const delta = big ? Math.floor((random() - 0.5) * 4 * HOUR) : -Math.floor(random() * 200);
      h.clock.jumpDeviceClock(delta);
    } else {
      h.engine.sync();
    }
    const events = h.take();
    for (const event of events) {
      if (event.type === 'clock.jumped') tally.jumps += 1;
      if (event.type === 'milestone.hour') tally.milestones += 1;
      if (event.type === 'session.started') tally.sessions += 1;
      if (event.type === 'view.changed') tally.views += 1;
    }
    check(events);
  }
  return { h, tally };
}

describe('engine invariants under random operations', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('honest clock, seed %i: focus matches a model of true time exactly', (seed) => {
    const { tally } = run({ seed, jumps: false, steps: 1500 });
    expect(tally.sessions).toBeGreaterThan(10);
    expect(tally.milestones).toBeGreaterThan(0);
  });

  it.each([21, 22, 23, 24, 25, 26])('with the rules and heartbeat, seed %i: saved state stays valid through sleep and clock changes', (seed) => {
    const { h, tally } = run({ seed, jumps: true, steps: 1500, rules: true });
    expect(tally.sessions).toBeGreaterThan(5);
    expect(h.errors).toEqual([]);
  });

  it.each([11, 12, 13, 14, 15, 16, 17, 18])('changing clock, seed %i: sessions stay valid and focus never goes backward', (seed) => {
    const { tally } = run({ seed, jumps: true, steps: 1500 });
    // The run must actually have shifted open sessions to prove anything.
    expect(tally.jumps).toBeGreaterThan(5);
  });
});
