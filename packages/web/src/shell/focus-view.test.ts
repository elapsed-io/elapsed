import { describe, expect, it } from 'vitest';
import { FocusView } from './focus-view.ts';

/** A window that only collects listeners, a screen that only keeps classes, and a clock the test moves. */
function setup(options: { quietMs?: number | null; active?: boolean } = {}) {
  const listeners = new Map<string, () => void>();
  const win = { addEventListener: (type: string, listener: () => void) => listeners.set(type, listener) } as unknown as Window;
  const classes = new Set<string>();
  const screen = { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name), contains: (name: string) => classes.has(name) } } as unknown as HTMLElement;
  let now = 0;
  let active = options.active ?? true;
  const wakes: { at: number; run: () => void }[] = [];
  let cancels = 0;
  const view = new FocusView(win, screen, {
    quietMs: () => (options.quietMs === undefined ? 3000 : options.quietMs),
    active: () => active,
    now: () => now,
    wakeAfter: (delay, run) => {
      wakes.push({ at: now + delay, run });
    },
    cancelWake: () => {
      cancels += 1;
      wakes.length = 0;
    },
  });
  const advance = (ms: number): void => {
    now += ms;
    for (const wake of [...wakes]) {
      if (wake.at <= now) {
        wakes.splice(wakes.indexOf(wake), 1);
        wake.run();
      }
    }
  };
  return {
    view,
    touch: (type = 'pointermove') => listeners.get(type)?.(),
    advance,
    shown: () => classes.has('screen--focus'),
    wakes: () => wakes.length,
    cancels: () => cancels,
    setActive: (value: boolean) => {
      active = value;
    },
    listened: () => [...listeners.keys()].sort(),
  };
}

describe('focus view (round 2.8)', () => {
  it('watches pointer moves and presses, keys, touches and the wheel', () => {
    expect(setup().listened()).toEqual(['keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel']);
  });

  it('shows after the quiet spell, waiting on the one shared timer, and a touch never sets a timer', () => {
    const focus = setup();
    focus.view.update();
    expect(focus.wakes()).toBe(1);
    for (let i = 0; i < 100; i += 1) {
      focus.advance(10);
      focus.touch();
    }
    // A thousand milliseconds of moves later: still the one wake.
    expect(focus.wakes()).toBe(1);
    focus.advance(2000);
    expect(focus.shown()).toBe(false);
    focus.advance(1000);
    expect(focus.shown()).toBe(true);
    expect(focus.wakes()).toBe(0);
  });

  it('a touch brings everything back, until the next quiet spell', () => {
    const focus = setup();
    focus.view.update();
    focus.advance(3000);
    expect(focus.shown()).toBe(true);
    focus.touch('keydown');
    expect(focus.shown()).toBe(false);
    focus.advance(2999);
    expect(focus.shown()).toBe(false);
    focus.advance(1);
    expect(focus.shown()).toBe(true);
  });

  it('never shows while it may not (paused, a check-in, settings, a hidden tab), nor with never', () => {
    const paused = setup({ active: false });
    paused.view.update();
    paused.advance(60_000);
    expect(paused.shown()).toBe(false);
    expect(paused.wakes()).toBe(0);
    const never = setup({ quietMs: null });
    never.view.update();
    never.advance(60_000);
    expect(never.shown()).toBe(false);
    expect(never.wakes()).toBe(0);
  });

  it('stops waiting, and comes back, the moment it may no longer show', () => {
    const focus = setup();
    focus.view.update();
    focus.advance(3000);
    expect(focus.shown()).toBe(true);
    focus.setActive(false);
    focus.view.update();
    expect(focus.shown()).toBe(false);
    focus.setActive(true);
    focus.touch();
    focus.view.update();
    expect(focus.wakes()).toBe(1);
    focus.setActive(false);
    focus.view.update();
    expect(focus.wakes()).toBe(0);
    expect(focus.cancels()).toBe(1);
  });
});
