import { describe, expect, it } from 'vitest';
import { FakeClock } from './fake-clock.ts';

describe('FakeClock', () => {
  it('fires timers in due order as time advances, moving both clocks together', () => {
    const clock = new FakeClock({ now: 0, monotonic: 0 });
    const seen: string[] = [];
    clock.setTimer(() => seen.push(`b@${String(clock.now())}`), 200);
    clock.setTimer(() => seen.push(`a@${String(clock.now())}`), 100);
    clock.advance(150);
    expect(seen).toEqual(['a@100']);
    clock.advance(100);
    expect(seen).toEqual(['a@100', 'b@200']);
    expect(clock.now()).toBe(250);
    expect(clock.monotonic()).toBe(250);
  });

  it('runs a timer set by a timer in the same advance', () => {
    const clock = new FakeClock({ now: 0, monotonic: 0 });
    const seen: number[] = [];
    const tick = (): void => {
      seen.push(clock.now());
      if (seen.length < 3) clock.setTimer(tick, 10);
    };
    clock.setTimer(tick, 10);
    clock.advance(100);
    expect(seen).toEqual([10, 20, 30]);
  });

  it('sleeps with the monotonic clock paused: timers wait out their delay after waking', () => {
    const clock = new FakeClock({ now: 0, monotonic: 0 });
    const seen: number[] = [];
    clock.setTimer(() => seen.push(clock.now()), 1000);
    clock.advance(400);
    clock.sleep(3_600_000);
    expect(seen).toEqual([]);
    clock.advance(600);
    expect(seen).toEqual([3_601_000]);
  });

  it('sleeps with the monotonic clock running: overdue timers fire on waking', () => {
    const clock = new FakeClock({ now: 0, monotonic: 0 });
    const seen: number[] = [];
    clock.setTimer(() => seen.push(clock.now()), 1000);
    clock.sleep(3_600_000, { monotonic: 'advances' });
    expect(seen).toEqual([3_600_000]);
  });

  it('throttles timers to a coarse grid', () => {
    const clock = new FakeClock({ now: 0, monotonic: 0 });
    clock.throttle(60_000);
    const seen: number[] = [];
    clock.setTimer(() => seen.push(clock.monotonic()), 1000);
    clock.advance(120_000);
    expect(seen).toEqual([60_000]);
  });

  it('changes the device clock without touching timers or the monotonic clock', () => {
    const clock = new FakeClock({ now: 10_000, monotonic: 0 });
    const seen: number[] = [];
    clock.setTimer(() => seen.push(clock.now()), 1000);
    clock.jumpDeviceClock(-5000);
    expect(clock.now()).toBe(5000);
    expect(clock.monotonic()).toBe(0);
    clock.advance(1000);
    expect(seen).toEqual([6000]);
  });

  it('cancels timers and counts what fired', () => {
    const clock = new FakeClock();
    const handle = clock.setTimer(() => undefined, 10);
    clock.setTimer(() => undefined, 20);
    clock.clearTimer(handle);
    expect(clock.pendingTimers).toBe(1);
    clock.advance(100);
    expect(clock.firedTimers).toBe(1);
    expect(clock.pendingTimers).toBe(0);
  });
});
