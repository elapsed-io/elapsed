import { EventBus, TimerEngine, createSession, endSession, serializeSession } from '@stopwatch/core';
import type { ActiveState, EndReason, TimerEvents } from '@stopwatch/core';
import { FakeClock } from '@stopwatch/core/testing';
import { describe, expect, it } from 'vitest';
import type { SessionStore, StoredState } from '../storage/session-store.ts';
import { TabSync, parseTabMessage } from './tabs.ts';
import type { TabChannel, TabMessage } from './tabs.ts';

const ID = '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f';

describe('tab messages', () => {
  it('accept only the two known shapes', () => {
    expect(parseTabMessage({ type: 'changed' })).toEqual({ type: 'changed' });
    const finished = serializeSession(endSession(createSession({ id: ID, mode: 'digits', at: 0, timeZone: 'UTC' }), 'max_duration', 60_000));
    expect(parseTabMessage({ type: 'ended', id: ID, reason: 'max_duration', session: finished })).toMatchObject({ type: 'ended', reason: 'max_duration', session: { id: ID } });
    for (const data of [
      null,
      'changed',
      [],
      { type: 'changed', state: {} },
      { type: 'ended', id: ID, reason: 'max_duration' },
      { type: 'ended', id: 'x', reason: 'max_duration', session: finished },
      { type: 'ended', id: ID, reason: 'bored', session: finished },
      { type: 'ended', id: ID, reason: 'user', session: finished },
      { type: 'ended', id: ID, reason: 'max_duration', session: '{"schema":1}' },
      { type: 'ended', id: ID, reason: 'max_duration', session: finished.replace('"endReason":"max_duration"', '"endReason":null') },
      { type: 'other' },
    ]) {
      expect(parseTabMessage(data), JSON.stringify(data)).toBeNull();
    }
  });
});

/** Two tabs sharing one storage and one channel. */
function world() {
  let saved: ActiveState | null = null;
  let heartbeat: number | null = null;
  const listeners: ((event: MessageEvent) => void)[] = [];
  const posted: TabMessage[] = [];
  const tab = (name: string, clock: FakeClock) => {
    let seen: ActiveState | null = null;
    const store: SessionStore = {
      load: (): StoredState => {
        seen = saved;
        return saved === null ? { kind: 'none' } : { kind: 'state', state: saved };
      },
      pull: (): StoredState | null => {
        if (saved === seen) return null;
        seen = saved;
        return saved === null ? { kind: 'none' } : { kind: 'state', state: saved };
      },
      save: (state) => {
        if (state === seen) return false;
        saved = state;
        seen = state;
        return true;
      },
      heartbeat: () => heartbeat,
      saveHeartbeat: (at) => {
        heartbeat = at;
      },
      owns: () => true,
    };
    const ownListeners: ((event: MessageEvent) => void)[] = [];
    const channel: TabChannel = {
      postMessage: (message) => {
        posted.push(message);
        // Delivered to every other tab.
        for (const listener of listeners) if (!ownListeners.includes(listener)) listener({ data: message } as MessageEvent);
      },
      addEventListener: (_type, listener) => {
        listeners.push(listener);
        ownListeners.push(listener);
      },
    };
    const endings: EndReason[] = [];
    const sync = new TabSync({ store, channel, onEndedElsewhere: (reason) => endings.push(reason) });
    const bus = new EventBus<TimerEvents>({ onError: (error) => { throw error; } });
    const engine = new TimerEngine({
      clock,
      events: bus,
      newId: () => ID,
      onError: (error) => {
        throw error;
      },
      timeZone: () => 'UTC',
      beforeWake: () => {
        sync.pull();
      },
    });
    bus.on('state.changed', ({ state }) => {
      sync.saved(state);
    });
    bus.on('heartbeat', ({ at }) => {
      sync.heartbeat(at);
    });
    bus.on('session.ended', ({ session }) => {
      sync.ended(session);
    });
    sync.attach(engine, store.load());
    return { name, engine, sync, endings };
  };
  return { tab, posted, saved: () => saved };
}

describe('tabs sharing one session', () => {
  it('show a session started in another tab and follow its pause', () => {
    const clock = new FakeClock();
    const w = world();
    const a = w.tab('a', clock);
    const b = w.tab('b', clock);
    a.engine.start('digits');
    expect(b.engine.view.status).toBe('running');
    clock.advance(60_000);
    b.engine.pause();
    expect(a.engine.view.status).toBe('paused');
    expect(a.engine.state?.session.segments).toEqual(b.engine.state?.session.segments);
  });

  it('restore the stored session in a tab opened later, without writing it again', () => {
    const clock = new FakeClock();
    const w = world();
    const a = w.tab('a', clock);
    a.engine.start('digits');
    clock.advance(5 * 60_000);
    const before = w.posted.length;
    const b = w.tab('b', clock);
    expect(b.engine.view).toMatchObject({ status: 'running', focusedMs: 5 * 60_000 });
    expect(w.posted.length).toBe(before);
  });

  it('explain a session maximum reached in another tab', () => {
    const clock = new FakeClock();
    const w = world();
    const a = w.tab('a', clock);
    a.engine.start('digits');
    const b = w.tab('b', clock);
    a.engine.end('max_duration');
    expect(b.engine.status).toBe('idle');
    expect(b.endings).toEqual(['max_duration']);
    expect(w.saved()).toBeNull();
  });
});
