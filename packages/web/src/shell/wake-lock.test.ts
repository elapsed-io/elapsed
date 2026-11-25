import { describe, expect, it } from 'vitest';
import { ScreenWake } from './wake-lock.ts';
import type { WakeLockApi, WakeSentinel } from './wake-lock.ts';

/**
 * A page whose visibility the test sets, and a wake lock that counts its requests and releases. A session is open
 * (running or paused) unless the test says it is idle.
 */
function setup(options: { refuse?: Error; idle?: boolean } = {}) {
  let visibility: DocumentVisibilityState = 'visible';
  const doc = {
    get visibilityState() {
      return visibility;
    },
  } as unknown as Document;
  const sentinels: (WakeSentinel & { fireRelease(): void })[] = [];
  let requests = 0;
  const api: WakeLockApi = {
    request: () => {
      requests += 1;
      if (options.refuse !== undefined) return Promise.reject(options.refuse);
      let released = false;
      const listeners: (() => void)[] = [];
      const sentinel = {
        get released() {
          return released;
        },
        release: () => {
          released = true;
          for (const listener of listeners) listener();
          return Promise.resolve();
        },
        addEventListener: (_type: 'release', listener: () => void) => {
          listeners.push(listener);
        },
        // The browser letting go on its own (the tab hidden).
        fireRelease: () => {
          released = true;
          for (const listener of listeners) listener();
        },
      };
      sentinels.push(sentinel);
      return Promise.resolve(sentinel);
    },
  };
  const errors: unknown[] = [];
  const wake = new ScreenWake(doc, api, (error) => errors.push(error));
  if (options.idle !== true) wake.session(true);
  return {
    wake,
    sentinels,
    errors,
    requests: () => requests,
    show: (shown: boolean) => {
      visibility = shown ? 'visible' : 'hidden';
    },
  };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('keep screen awake', () => {
  it('holds the screen only while a session is running or paused: never on the idle screen, let go on the results', async () => {
    const t = setup({ idle: true });
    t.wake.set(true);
    await settle();
    expect(t.requests()).toBe(0);
    // A session starts.
    t.wake.session(true);
    await settle();
    expect(t.wake.held).toBe(true);
    // Paused, it is still open: nothing more is asked of the browser.
    t.wake.session(true);
    await settle();
    expect(t.requests()).toBe(1);
    // Ended (the results, then the idle screen): let go.
    t.wake.session(false);
    expect(t.wake.held).toBe(false);
    expect(t.sentinels[0]?.released).toBe(true);
    t.wake.update();
    await settle();
    expect(t.requests()).toBe(1);
    // The next session asks again.
    t.wake.session(true);
    await settle();
    expect(t.wake.held).toBe(true);
    expect(t.requests()).toBe(2);
  });

  it('lets go at once of a lock granted after the session ended', async () => {
    const t = setup();
    t.wake.set(true);
    t.wake.session(false);
    await settle();
    expect(t.wake.held).toBe(false);
    expect(t.sentinels[0]?.released).toBe(true);
  });

  it('holds a screen wake lock while on and the page is seen, and lets go when switched off', async () => {
    const t = setup();
    t.wake.set(true);
    await settle();
    expect(t.wake.held).toBe(true);
    expect(t.requests()).toBe(1);
    // Asking again while held asks the browser for nothing more.
    t.wake.update();
    await settle();
    expect(t.requests()).toBe(1);
    t.wake.set(false);
    expect(t.wake.held).toBe(false);
    expect(t.sentinels[0]?.released).toBe(true);
  });

  it('is let go while the tab is hidden, and asked for again when it is seen', async () => {
    const t = setup();
    t.wake.set(true);
    await settle();
    t.show(false);
    // The browser lets go of a hidden page's lock itself.
    t.sentinels[0]?.fireRelease();
    t.wake.update();
    await settle();
    expect(t.wake.held).toBe(false);
    expect(t.requests()).toBe(1);
    t.show(true);
    t.wake.update();
    await settle();
    expect(t.wake.held).toBe(true);
    expect(t.requests()).toBe(2);
  });

  it('never asks while switched off or hidden', async () => {
    const t = setup();
    t.wake.set(false);
    t.show(false);
    t.wake.set(true);
    await settle();
    expect(t.requests()).toBe(0);
  });

  it('lets go at once of a lock granted after the setting went off', async () => {
    const t = setup();
    t.wake.set(true);
    t.wake.set(false);
    await settle();
    expect(t.wake.held).toBe(false);
    expect(t.sentinels[0]?.released).toBe(true);
  });

  it('accepts a refusal quietly, and reports only an error of another kind', async () => {
    const refused = setup({ refuse: new DOMException('battery saver', 'NotAllowedError') });
    refused.wake.set(true);
    await settle();
    expect(refused.wake.held).toBe(false);
    expect(refused.errors).toEqual([]);
    const broken = setup({ refuse: new TypeError('broken') });
    broken.wake.set(true);
    await settle();
    expect(broken.errors).toHaveLength(1);
  });

  it('does nothing where the browser has no wake lock', async () => {
    const wake = new ScreenWake({ visibilityState: 'visible' } as unknown as Document, null, () => undefined);
    wake.set(true);
    await settle();
    expect(wake.held).toBe(false);
  });
});
