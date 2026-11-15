/**
 * The timer engine (plan, Release 1 round 2; Architecture invariants 1 to 3).
 *
 * - Elapsed time is always computed from the session's timestamps, never
 *   counted in ticks, so throttled timers and sleeping devices lose nothing.
 * - It wakes only when the visible value will next change, through the one
 *   shared scheduler.
 * - It emits typed events and calls nothing outside itself.
 *
 * Device clock changes (owner decision, 2026-11-15): on every wake and command
 * the engine compares how far the device clock moved with how far the
 * monotonic clock moved. If the device clock fell behind by more than the
 * tolerance, it was set back: the open session is shifted back by the same
 * amount, so no focused time is lost and segments stay in order. A forward
 * jump cannot be told apart from a sleeping device, so it counts like sleep;
 * round 4's check-ins cap it and the Release 3 server checks it.
 *
 * The abandonment rules (check-ins, pause limit, session maximum) and the
 * heartbeat arrive in round 4; they slot in at `#refresh`.
 */

import { CONFIG } from '../config.ts';
import type { Emitter } from '../events/bus.ts';
import { createSession, endSession, pauseSession, resumeSession, shiftSession, switchMode } from '../session/commands.ts';
import { currentMode, focusedMs, latestStamp, sessionStatus, timeWhenFocusReached } from '../session/derive.ts';
import { isEndReason } from '../session/session.ts';
import type { EndReason, Session } from '../session/session.ts';
import type { Clock } from '../time/clock.ts';
import { systemTimeZone } from '../time/local-day.ts';
import type { TimerEvents } from './events.ts';
import { Scheduler } from './scheduler.ts';
import { computeView, isSecondsDisplay, msUntilNextChange, viewKey } from './view.ts';
import type { SecondsDisplay, TimerStatus, TimerView } from './view.ts';

const HOUR = 60 * 60 * 1000;
const VIEW_TASK = 'engine.view';

export interface TimerEngineOptions {
  readonly clock: Clock;
  readonly events: Emitter<TimerEvents>;
  /** Returns a new random UUID for each session (crypto.randomUUID in the browser). */
  readonly newId: () => string;
  /** Receives errors thrown by scheduled work, so a failure is reported rather than lost. */
  readonly onError: (error: unknown) => void;
  /** The device's time zone, read when a session starts. Defaults to the runtime's. */
  readonly timeZone?: () => string;
  readonly seconds?: SecondsDisplay;
}

interface ClockReference {
  /** The engine's notion of now, in device-clock time. Never goes backward except by a detected jump. */
  readonly effective: number;
  readonly monotonic: number;
}

export class TimerEngine {
  readonly #clock: Clock;
  readonly #events: Emitter<TimerEvents>;
  readonly #newId: () => string;
  readonly #timeZone: () => string;
  readonly #scheduler: Scheduler;
  #seconds: SecondsDisplay;
  #session: Session | null = null;
  #reference: ClockReference | null = null;
  #view: TimerView;
  #viewKey: string;
  #hoursReached = 0;
  #disposed = false;

  constructor(options: TimerEngineOptions) {
    this.#clock = options.clock;
    this.#events = options.events;
    this.#newId = options.newId;
    this.#timeZone = options.timeZone ?? systemTimeZone;
    this.#seconds = options.seconds ?? 'blur-away';
    this.#scheduler = new Scheduler({ clock: options.clock, onError: options.onError });
    this.#view = computeView(null, this.#observe(), this.#seconds);
    this.#viewKey = viewKey(this.#view);
  }

  /** The current session, frozen; null before the first start. An ended session stays until the next start. */
  get session(): Session | null {
    return this.#session;
  }

  get status(): TimerStatus {
    return this.#session === null ? 'idle' : sessionStatus(this.#session);
  }

  /** The view as of the last wake or command. Subscribe to `view.changed` to follow it. */
  get view(): TimerView {
    return this.#view;
  }

  /** Starts a new session showing `mode`. Returns false if a session is already open. */
  start(mode: string): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    if (this.status === 'running' || this.status === 'paused') return false;
    this.#session = createSession({ id: this.#newId(), mode, at: now, timeZone: this.#timeZone() });
    this.#hoursReached = 0;
    this.#events.emit('session.started', { at: now, session: this.#session });
    this.#afterChange(now);
    return true;
  }

  /** Pauses a running session. Returns false if it is not running or has reached its segment limit. */
  pause(): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const session = this.#session;
    if (session === null || sessionStatus(session) !== 'running') return false;
    if (session.segments.length >= CONFIG.session.limits.maxSegments) return false;
    this.#emitMilestones(now);
    const at = this.#stamp(session, now);
    this.#session = pauseSession(session, at);
    this.#events.emit('session.paused', { at, session: this.#session });
    this.#afterChange(now);
    return true;
  }

  /** Resumes a paused session. Returns false if it is not paused. */
  resume(): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const session = this.#session;
    if (session === null || sessionStatus(session) !== 'paused') return false;
    const at = this.#stamp(session, now);
    this.#session = resumeSession(session, at);
    this.#events.emit('session.resumed', { at, session: this.#session });
    this.#afterChange(now);
    return true;
  }

  /** Ends the open session. Returns false if there is none. */
  end(reason: EndReason = 'user'): boolean {
    if (this.#disposed) return false;
    if (!isEndReason(reason)) throw new TypeError(`not an end reason: ${JSON.stringify(reason)}`);
    const now = this.#observe();
    const session = this.#session;
    if (session === null || sessionStatus(session) === 'ended') return false;
    this.#emitMilestones(now);
    const at = this.#stamp(session, now);
    this.#session = endSession(session, reason, at);
    this.#events.emit('session.ended', { at, session: this.#session, reason });
    this.#afterChange(now);
    return true;
  }

  /**
   * Records that the session is now shown in another display mode. Returns
   * false if nothing changed. An invalid mode id is a programming error and throws.
   */
  switchMode(mode: string): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const session = this.#session;
    if (session === null || sessionStatus(session) === 'ended' || currentMode(session) === mode) return false;
    if (session.modes.length >= CONFIG.session.limits.maxModeSpans) return false;
    const at = this.#stamp(session, now);
    this.#session = switchMode(session, mode, at);
    this.#events.emit('mode.switched', { at, mode, session: this.#session });
    this.#afterChange(now);
    return true;
  }

  /** Changes how much of the seconds is visible, which changes how often the view updates. */
  setSecondsDisplay(display: SecondsDisplay): void {
    if (!isSecondsDisplay(display)) throw new TypeError(`not a seconds display: ${JSON.stringify(display)}`);
    this.#seconds = display;
    this.sync();
  }

  /**
   * Brings the view up to date now. The site calls this when the page becomes
   * visible again, so a woken device shows the right time without waiting for
   * the next scheduled wake.
   */
  sync(): void {
    if (this.#disposed) return;
    const now = this.#observe();
    this.#emitMilestones(now);
    this.#afterChange(now);
  }

  /** Stops all timers. The engine emits nothing afterwards. */
  dispose(): void {
    this.#disposed = true;
    this.#scheduler.dispose();
  }

  /** Reads both clocks, handles a device clock set back, and returns the engine's current time. */
  #observe(): number {
    const wall = this.#clock.now();
    const monotonic = this.#clock.monotonic();
    const previous = this.#reference;
    let effective = wall;
    let shifted = false;
    if (previous !== null) {
      // Where the device clock would be if it had only moved with the monotonic clock.
      const expected = previous.effective + (monotonic - previous.monotonic);
      const behind = Math.round(expected - wall);
      if (behind > CONFIG.engine.clockJumpTolerance) {
        shifted = this.#shiftOpenSession(-behind, wall);
      } else {
        // Small backward steps are absorbed: time holds still until the clock catches up.
        effective = Math.max(wall, previous.effective);
      }
    }
    this.#reference = { effective, monotonic };
    // The view and the next wake were worked out in the old clock frame; redo them,
    // even if the command that observed the jump then turns out not to apply.
    if (shifted) this.#afterChange(effective);
    return effective;
  }

  /** Returns whether the open session was shifted. */
  #shiftOpenSession(deltaMs: number, at: number): boolean {
    const session = this.#session;
    if (session === null || sessionStatus(session) === 'ended') return false;
    const first = session.segments[0]?.start ?? 0;
    // Move far enough that no record is later than now, but never before 1970.
    const delta = Math.max(-first, Math.min(deltaMs, at - latestStamp(session)));
    if (delta === 0) return false;
    this.#session = shiftSession(session, delta);
    this.#events.emit('clock.jumped', { at, deltaMs: delta, session: this.#session });
    return true;
  }

  /** The time to record for a command: now, but never before what the session already holds. */
  #stamp(session: Session, now: number): number {
    return Math.max(now, latestStamp(session));
  }

  /** Emits one milestone for each whole hour of focus reached since the last, dated exactly. */
  #emitMilestones(now: number): void {
    const session = this.#session;
    if (session === null || sessionStatus(session) !== 'running') return;
    const hours = Math.floor(focusedMs(session, now) / HOUR);
    while (this.#hoursReached < hours) {
      this.#hoursReached += 1;
      const at = timeWhenFocusReached(session, this.#hoursReached * HOUR, now) ?? now;
      this.#events.emit('milestone.hour', { at, hours: this.#hoursReached, session });
    }
  }

  /** Recomputes the view, emits it if it looks different, and schedules the next wake. */
  #afterChange(now: number): void {
    const view = computeView(this.#session, now, this.#seconds);
    const key = viewKey(view);
    this.#view = view;
    if (key !== this.#viewKey) {
      this.#viewKey = key;
      this.#events.emit('view.changed', { view });
    }
    const delay = msUntilNextChange(view);
    if (delay === null) {
      this.#scheduler.clear(VIEW_TASK);
    } else {
      this.#scheduler.set(VIEW_TASK, delay, () => {
        this.sync();
      });
    }
  }
}
