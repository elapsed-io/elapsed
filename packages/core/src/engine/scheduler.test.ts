import { describe, expect, it } from 'vitest';
import { FakeClock } from '../testing/fake-clock.ts';
import { Scheduler } from './scheduler.ts';

function setup() {
  const clock = new FakeClock({ now: 0, monotonic: 0 });
  const errors: unknown[] = [];
  const scheduler = new Scheduler({ clock, onError: (error) => errors.push(error) });
  return { clock, scheduler, errors };
}

describe('Scheduler', () => {
  it('keeps one timer, armed for the earliest task', () => {
    const { clock, scheduler } = setup();
    const seen: string[] = [];
    scheduler.set('slow', 5000, () => seen.push('slow'));
    scheduler.set('fast', 1000, () => seen.push('fast'));
    expect(clock.pendingTimers).toBe(1);
    clock.advance(1000);
    expect(seen).toEqual(['fast']);
    expect(clock.pendingTimers).toBe(1);
    clock.advance(4000);
    expect(seen).toEqual(['fast', 'slow']);
    expect(clock.pendingTimers).toBe(0);
    expect(clock.firedTimers).toBe(2);
  });

  it('lets a task with slack wait for a wake that happens anyway, and never past its slack', () => {
    const { clock, scheduler } = setup();
    const seen: string[] = [];
    // The heartbeat falls due 15 ms before the minute's redraw: one wake runs both.
    scheduler.set('heartbeat', 29_985, () => seen.push('heartbeat'), 5000);
    scheduler.set('minute', 30_000, () => seen.push('minute'));
    clock.advance(29_985);
    expect(seen).toEqual([]);
    clock.advance(15);
    expect(seen).toEqual(['heartbeat', 'minute']);
    expect(clock.firedTimers).toBe(1);
    // A wake that comes a little before it is due takes it along too.
    scheduler.set('heartbeat', 30_011, () => seen.push('early heartbeat'), 5000);
    scheduler.set('minute', 30_000, () => seen.push('next minute'));
    clock.advance(30_000);
    expect(seen.slice(-2)).toEqual(['next minute', 'early heartbeat']);
    expect(clock.firedTimers).toBe(2);
    // With nothing else coming within its slack, it runs on time.
    scheduler.set('heartbeat', 30_000, () => seen.push('heartbeat again'), 5000);
    scheduler.set('later', 40_000, () => seen.push('later'));
    const count = seen.length;
    clock.advance(29_999);
    expect(seen).toHaveLength(count);
    clock.advance(1);
    expect(seen.at(-1)).toBe('heartbeat again');
  });

  it('replaces a task with the same key and cancels by key', () => {
    const { clock, scheduler } = setup();
    const seen: string[] = [];
    scheduler.set('view', 1000, () => seen.push('old'));
    scheduler.set('view', 2000, () => seen.push('new'));
    scheduler.set('other', 1500, () => seen.push('other'));
    scheduler.clear('other');
    clock.advance(3000);
    expect(seen).toEqual(['new']);
  });

  it('runs every overdue task once, in deadline order, when its timer fires late', () => {
    const { clock, scheduler } = setup();
    const seen: string[] = [];
    scheduler.set('b', 2000, () => seen.push('b'));
    scheduler.set('a', 1000, () => seen.push('a'));
    scheduler.set('c', 3000, () => seen.push('c'));
    clock.sleep(10_000, { monotonic: 'advances' });
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(clock.firedTimers).toBe(1);
  });

  it('is not hurried or delayed by a device clock change', () => {
    const { clock, scheduler } = setup();
    const seen: number[] = [];
    scheduler.set('view', 1000, () => seen.push(clock.monotonic()));
    clock.jumpDeviceClock(-3_600_000);
    clock.advance(999);
    expect(seen).toEqual([]);
    clock.advance(1);
    expect(seen).toEqual([1000]);
  });

  it('reports a failing task and still runs the others', () => {
    const { clock, scheduler, errors } = setup();
    let ran = false;
    scheduler.set('bad', 10, () => {
      throw new Error('task failed');
    });
    scheduler.set('good', 10, () => (ran = true));
    clock.advance(10);
    expect(ran).toBe(true);
    expect(errors).toHaveLength(1);
  });

  it('lets a task reschedule itself', () => {
    const { clock, scheduler } = setup();
    let count = 0;
    const run = (): void => {
      count += 1;
      if (count < 5) scheduler.set('loop', 100, run);
    };
    scheduler.set('loop', 100, run);
    clock.advance(1000);
    expect(count).toBe(5);
    expect(clock.firedTimers).toBe(5);
  });

  it('stops everything on dispose', () => {
    const { clock, scheduler } = setup();
    scheduler.set('a', 10, () => undefined);
    scheduler.dispose();
    expect(clock.pendingTimers).toBe(0);
    expect(scheduler.size).toBe(0);
  });
});
