import { describe, expect, it } from 'vitest';
import { EventBus } from './bus.ts';

interface Events {
  a: { n: number };
  b: { s: string };
}

function setup() {
  const errors: unknown[] = [];
  const bus = new EventBus<Events>({ onError: (error) => errors.push(error) });
  return { bus, errors };
}

describe('EventBus', () => {
  it('delivers typed payloads to subscribers of that type only', () => {
    const { bus } = setup();
    const seen: string[] = [];
    bus.on('a', ({ n }) => seen.push(`a${String(n)}`));
    bus.on('b', ({ s }) => seen.push(`b${s}`));
    bus.emit('a', { n: 1 });
    bus.emit('b', { s: 'x' });
    expect(seen).toEqual(['a1', 'bx']);
  });

  it('unsubscribes', () => {
    const { bus } = setup();
    let count = 0;
    const off = bus.on('a', () => (count += 1));
    bus.emit('a', { n: 1 });
    off();
    bus.emit('a', { n: 2 });
    expect(count).toBe(1);
  });

  it('queues events emitted by a handler until the current event is delivered to everyone', () => {
    const { bus } = setup();
    const seen: string[] = [];
    bus.on('a', ({ n }) => {
      seen.push(`first a${String(n)}`);
      if (n === 1) bus.emit('b', { s: 'nested' });
    });
    bus.on('a', ({ n }) => seen.push(`second a${String(n)}`));
    bus.on('b', ({ s }) => seen.push(`b ${s}`));
    bus.emit('a', { n: 1 });
    expect(seen).toEqual(['first a1', 'second a1', 'b nested']);
  });

  it('reports a throwing handler and still delivers to the rest', () => {
    const { bus, errors } = setup();
    const failure = new Error('boom');
    let delivered = false;
    bus.on('a', () => {
      throw failure;
    });
    bus.on('a', () => (delivered = true));
    bus.emit('a', { n: 1 });
    expect(delivered).toBe(true);
    expect(errors).toEqual([failure]);
    // The bus keeps working afterwards.
    bus.emit('a', { n: 2 });
    expect(errors).toHaveLength(2);
  });

  it('starts handlers added during delivery with the next event, and stops removed ones at once', () => {
    const { bus } = setup();
    const seen: string[] = [];
    let offSecond = (): void => undefined;
    bus.on('a', ({ n }) => {
      seen.push(`first ${String(n)}`);
      offSecond();
      bus.on('a', ({ n: m }) => seen.push(`late ${String(m)}`));
    });
    offSecond = bus.on('a', ({ n }) => seen.push(`second ${String(n)}`));
    bus.emit('a', { n: 1 });
    expect(seen).toEqual(['first 1']);
  });

  it('clears every handler', () => {
    const { bus } = setup();
    let count = 0;
    bus.on('a', () => (count += 1));
    bus.clear();
    bus.emit('a', { n: 1 });
    expect(count).toBe(0);
  });
});
