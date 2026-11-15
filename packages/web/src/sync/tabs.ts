/**
 * One active session per browser (plan, Architecture invariant 15): open tabs
 * coordinate through a BroadcastChannel and show the same session.
 *
 * The stored state is the single source of truth. A tab writes it when its
 * own engine changes the session and tells the other tabs; a tab that hears
 * of a change, sees a storage event, wakes from its scheduler or becomes
 * visible again reads the stored state and adopts it if it changed. Reading
 * storage rather than trusting the message matters because a message can
 * arrive before the other tab's write is visible here, and because a tab
 * frozen in the background must catch up before it applies any rule.
 *
 * Messages carry no session data: "changed", or "ended" with the session id
 * and end reason, so a tab that was showing the same session can explain a
 * session maximum reached in another tab.
 */

import { isEndReason } from '@stopwatch/core';
import type { ActiveState, EndReason, TimerEngine } from '@stopwatch/core';
import type { SessionStore, StoredState } from '../storage/session-store.ts';

export const TAB_CHANNEL_NAME = 'timer';

export type TabMessage = { readonly type: 'changed' } | { readonly type: 'ended'; readonly id: string; readonly reason: EndReason };

const ID = /^[0-9a-f-]{36}$/;

/** Validates a message from another tab; anything unexpected is ignored. */
export function parseTabMessage(data: unknown): TabMessage | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const fields = data as Readonly<Record<string, unknown>>;
  const keys = Object.keys(fields).sort().join(',');
  if (fields['type'] === 'changed' && keys === 'type') return { type: 'changed' };
  if (fields['type'] === 'ended' && keys === 'id,reason,type') {
    const { id, reason } = fields;
    if (typeof id === 'string' && ID.test(id) && isEndReason(reason)) return { type: 'ended', id, reason };
  }
  return null;
}

/** The part of BroadcastChannel this module uses. */
export interface TabChannel {
  postMessage(message: TabMessage): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

export function openTabChannel(): TabChannel | null {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(TAB_CHANNEL_NAME) : null;
}

export interface TabSyncOptions {
  readonly store: SessionStore;
  readonly channel: TabChannel | null;
  /** Another tab ended the session this tab was showing. */
  readonly onEndedElsewhere: (reason: EndReason) => void;
}

export class TabSync {
  readonly #store: SessionStore;
  readonly #channel: TabChannel | null;
  readonly #onEndedElsewhere: (reason: EndReason) => void;
  #engine: TimerEngine | null = null;
  /** The last open session this tab showed. */
  #shownId: string | null = null;

  constructor(options: TabSyncOptions) {
    this.#store = options.store;
    this.#channel = options.channel;
    this.#onEndedElsewhere = options.onEndedElsewhere;
    this.#channel?.addEventListener('message', (event) => {
      this.#receive(event.data);
    });
  }

  /** Restores the session saved on this device (as the store loaded it) into a new engine. */
  attach(engine: TimerEngine, stored: StoredState): void {
    this.#engine = engine;
    if (stored.kind === 'state') {
      this.#shownId = stored.state.session.id;
      engine.restore(stored.state, this.#store.heartbeat());
    }
  }

  /** Takes up whatever other tabs saved since this tab last looked. */
  pull(): void {
    const engine = this.#engine;
    if (engine === null) return;
    const stored = this.#store.pull();
    if (stored !== null) {
      const state = stored.kind === 'state' ? stored.state : null;
      if (state !== null) this.#shownId = state.session.id;
      engine.adopt(state);
    }
    const beat = this.#store.heartbeat();
    if (beat !== null) engine.observeHeartbeat(beat);
  }

  /** This tab's engine changed the state to keep. */
  saved(state: ActiveState | null): void {
    if (state !== null) this.#shownId = state.session.id;
    if (this.#store.save(state)) this.#channel?.postMessage({ type: 'changed' });
  }

  heartbeat(at: number): void {
    this.#store.saveHeartbeat(at);
  }

  /** This tab's engine ended a session. */
  ended(id: string, reason: EndReason): void {
    this.#channel?.postMessage({ type: 'ended', id, reason });
  }

  #receive(data: unknown): void {
    const message = parseTabMessage(data);
    if (message === null) return;
    const endedHere = message.type === 'ended' && message.id === this.#shownId;
    this.pull();
    if (endedHere) this.#onEndedElsewhere(message.reason);
  }
}
