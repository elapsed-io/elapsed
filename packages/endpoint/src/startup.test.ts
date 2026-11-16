/**
 * Cloudflare refuses random values, timers and I/O at a Worker's global scope (error 10021: "Disallowed
 * operation called within global scope"). The deploy of 2026-11-16 failed on exactly that. These check it in
 * node; tooling/worker-runtime.ts checks it in Cloudflare's own runtime.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the Worker at startup', () => {
  it('makes no random value, timer or request while its modules load', async () => {
    const random = vi.spyOn(crypto, 'getRandomValues');
    const uuid = vi.spyOn(crypto, 'randomUUID');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const interval = vi.spyOn(globalThis, 'setInterval');
    const request = vi.spyOn(globalThis, 'fetch');
    vi.resetModules();
    const worker = await import('./worker.ts');
    expect(typeof worker.default.fetch).toBe('function');
    expect([random, uuid, timeout, interval, request].map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0, 0, 0]);
  });

  it('creates the rate limiter’s salt inside a request, not when the limiter is made', async () => {
    const random = vi.spyOn(crypto, 'getRandomValues');
    const { RateLimiter } = await import('./rate-limit.ts');
    const limiter = new RateLimiter();
    expect(random).not.toHaveBeenCalled();
    expect(await limiter.allow('203.0.113.7', 0)).toBe(true);
    expect(random).toHaveBeenCalledTimes(1);
    expect(await limiter.allow('203.0.113.7', 1)).toBe(true);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('forgets an address when a request arrives after its minute, with no timer', async () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const { RateLimiter } = await import('./rate-limit.ts');
    const limiter = new RateLimiter(5, 60_000);
    for (let i = 0; i < 5; i += 1) await limiter.allow('203.0.113.7', 0);
    expect(await limiter.allow('203.0.113.7', 59_999)).toBe(false);
    expect(limiter.size).toBe(1);
    // Another address arriving after the minute clears the first.
    expect(await limiter.allow('198.51.100.1', 60_000)).toBe(true);
    expect(limiter.size).toBe(1);
    expect(await limiter.allow('203.0.113.7', 60_000)).toBe(true);
    expect(timeout).not.toHaveBeenCalled();
  });
});
