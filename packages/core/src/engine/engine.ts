/**
 * The timer engine (plan, Release 1 rounds 2 and 4; Architecture invariants 1
 * to 3; Session lifecycle and abandonment).
 *
 * - Elapsed time is always computed from the session's timestamps, never
 *   counted in ticks, so throttled timers and sleeping devices lose nothing.
 * - It wakes only when something visible will change, when a rule falls due,
 *   or for the 30-second heartbeat, all through the one shared scheduler.
 * - It emits typed events and calls nothing outside itself.
 *
 * Device clock changes (plan, Session lifecycle > Clock changes): on every
 * wake and command the engine compares how far the device clock moved with
 * how far the monotonic clock moved. If the device clock fell behind by more
 * than the tolerance, it was set back, and the open session shifts back by the
 * same amount. When a saved session is restored with the clock behind its last
 * heartbeat, it resumes from its last saved elapsed time. A forward jump
 * counts like sleep.
 *
 * Abandonment rules (session/rules.ts) are replayed in order on every wake,
 * so after sleep or a reopened tab the session is exactly what it would have
 * been had the page stayed open.
 */

import { CONFIG } from '../config.ts';
import type { Emitter } from '../events/bus.ts';
import { createSession, endSession, pauseSession, resumeSession, switchMode } from '../session/commands.ts';
import { currentMode, focusedMs, lastSegment, latestStamp, sessionStatus, timeWhenFocusReached } from '../session/derive.ts';
import { advance, checkInDueAt, defaultRules, nextTrigger, normaliseRules, pendingCheckIn } from '../session/rules.ts';
import type { RuleSettings } from '../session/rules.ts';
import { isEndReason } from '../session/session.ts';
import type { EndReason, Session } from '../session/session.ts';
import { freezeState, recordGap, shiftState, startState } from '../session/state.ts';
import type { ActiveState } from '../session/state.ts';
import type { Clock } from '../time/clock.ts';
import { systemTimeZone } from '../time/local-day.ts';
import type { TimerEvents } from './events.ts';
import { Scheduler } from './scheduler.ts';
import { computeView, isSecondsDisplay, msUntilNextChange, viewKey } from './view.ts';
import type { SecondsDisplay, TimerStatus, TimerView } from './view.ts';

const HOUR = 60 * 60 * 1000;
const VIEW_TASK = 'engine.view';
const RULES_TASK = 'engine.rules';
const HEARTBEAT_TASK = 'engine.heartbeat';

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
  /**
   * Check-in interval and pause limit. Defaults to the plan's defaults. null
   * turns the abandonment rules off, which only tests of pure timekeeping do;
   * check-ins are always on in Release 1.
   */
  readonly rules?: RuleSettings | null;
  /** Write a heartbeat every 30 seconds while a session is open. Defaults to true. */
  readonly heartbeat?: boolean;
  /**
   * Called at the start of every scheduled wake, before the engine looks at
   * its state. The site uses it to take up what other tabs saved meanwhile
   * (adopt, observeHeartbeat), so a tab that was frozen in the background
   * never applies the rules to a state another tab has already moved on from.
   */
  readonly beforeWake?: () => void;
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
  readonly #heartbeatOn: boolean;
  readonly #beforeWake: (() => void) | null;
  #seconds: SecondsDisplay;
  #rules: RuleSettings | null;
  /** The open session and what the rules remember about it. */
  #state: ActiveState | null = null;
  /** The last ended session, shown until the next start. */
  #ended: Session | null = null;
  #heartbeatAt: number | null = null;
  #heartbeatScheduled = false;
  #background = false;
  #reference: ClockReference | null = null;
  #view: TimerView;
  #viewKey: string;
  #hoursReached = 0;
  #announcedCheckIn: number | null = null;
  /** The pause (by when it began) whose coming end was announced. */
  #announcedPauseEnd: number | null = null;
  #dirty = false;
  #disposed = false;

  constructor(options: TimerEngineOptions) {
    this.#clock = options.clock;
    this.#events = options.events;
    this.#newId = options.newId;
    this.#timeZone = options.timeZone ?? systemTimeZone;
    this.#seconds = options.seconds ?? 'blur-away';
    this.#rules = options.rules === null ? null : normaliseRules(options.rules ?? defaultRules());
    this.#heartbeatOn = options.heartbeat ?? true;
    this.#beforeWake = options.beforeWake ?? null;
    this.#scheduler = new Scheduler({ clock: options.clock, onError: options.onError });
    this.#view = computeView(null, this.#observe(), this.#seconds);
    this.#viewKey = viewKey(this.#view);
  }

  /** The current or last ended session, frozen; null before the first start. */
  get session(): Session | null {
    return this.#state?.session ?? this.#ended;
  }

  /** The state to keep on the device: the open session and what the rules remember. */
  get state(): ActiveState | null {
    return this.#state;
  }

  get status(): TimerStatus {
    const session = this.session;
    return session === null ? 'idle' : sessionStatus(session);
  }

  /** The view as of the last wake or command. Subscribe to `view.changed` to follow it. */
  get view(): TimerView {
    return this.#view;
  }

  /** Starts a new session showing `mode`. Returns false if a session is already open. */
  start(mode: string): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    if (this.#state !== null) return false;
    const session = createSession({ id: this.#newId(), mode, at: now, timeZone: this.#timeZone() });
    this.#state = startState(session, this.#interval());
    this.#ended = null;
    this.#hoursReached = 0;
    this.#announcedCheckIn = null;
    this.#heartbeatAt = now;
    this.#dirty = true;
    this.#events.emit('session.started', { at: now, session });
    if (this.#heartbeatOn) this.#events.emit('heartbeat', { at: now });
    this.#afterChange(now);
    return true;
  }

  /** Pauses a running session (a sign of presence). Returns false if it is not running or has reached its segment limit. */
  pause(): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const state = this.#state;
    if (state === null || sessionStatus(state.session) !== 'running') return false;
    if (state.session.segments.length >= CONFIG.session.limits.maxSegments) return false;
    this.#emitMilestones(now);
    const at = this.#stamp(state.session, now);
    this.#state = freezeState({
      ...state,
      session: pauseSession(state.session, at),
      presenceAt: at,
      missedCheckInAt: null,
      pauseLimitMs: (this.#rules ?? defaultRules()).pauseLimit,
      checkInIntervalMs: this.#interval(),
    });
    this.#announcedCheckIn = null;
    this.#dirty = true;
    this.#events.emit('session.paused', { at, session: this.#state.session, reason: 'user' });
    this.#announcePauseEnding(now);
    this.#afterChange(now);
    return true;
  }

  /** Resumes a paused session (a sign of presence), including one paused by a missed check-in. */
  resume(): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const state = this.#state;
    if (state === null || sessionStatus(state.session) !== 'paused') return false;
    const at = this.#stamp(state.session, now);
    this.#state = freezeState({
      ...state,
      session: resumeSession(state.session, at),
      presenceAt: at,
      missedCheckInAt: null,
      pauseLimitMs: null,
      checkInIntervalMs: this.#interval(),
    });
    this.#announcedCheckIn = null;
    this.#dirty = true;
    this.#events.emit('session.resumed', { at, session: this.#state.session });
    this.#afterChange(now);
    return true;
  }

  /**
   * Ends the open session. Returns false if there is none.
   *
   * `options.at` dates the end earlier than now: the site ends a session at
   * the moment end was pressed, after the 5-second countdown (owner decision,
   * 2026-11-15). It is never earlier than the session's last pause or resume,
   * so time a later pause recorded is kept as it was.
   */
  end(reason: EndReason = 'user', options: { readonly at?: number } = {}): boolean {
    if (this.#disposed) return false;
    if (!isEndReason(reason)) throw new TypeError(`not an end reason: ${JSON.stringify(reason)}`);
    const now = this.#observe();
    const state = this.#state;
    if (state === null) return false;
    if (options.at === undefined) {
      this.#emitMilestones(now);
      const at = this.#stamp(state.session, now);
      this.#finish(endSession(state.session, reason, at), reason, at);
    } else {
      const last = lastSegment(state.session);
      const at = Math.min(now, Math.max(Math.round(options.at), last.end ?? last.start));
      this.#emitMilestones(at);
      this.#finish(endSession(state.session, reason, at, { backdate: true }), reason, at);
    }
    this.#afterChange(now);
    return true;
  }

  /** The check-in interval to fix at a sign of presence. */
  #interval(): number {
    return (this.#rules ?? defaultRules()).checkInInterval;
  }

  /** The engine's current time: the device clock, corrected for any jump it has detected. */
  now(): number {
    return this.#observe();
  }

  /** Answers the check-in waiting for any key, click or tap. Returns false if none is waiting. */
  answerCheckIn(): boolean {
    if (this.#disposed) return false;
    const now = this.#observe();
    const state = this.#state;
    if (state === null || this.#rules === null || pendingCheckIn(state, this.#rules, now) === null) return false;
    this.#state = freezeState({ ...state, presenceAt: now, checkInIntervalMs: this.#interval() });
    this.#announcedCheckIn = null;
    this.#dirty = true;
    this.#events.emit('checkin.answered', { at: now, session: state.session });
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
    const state = this.#state;
    if (state === null || currentMode(state.session) === mode) return false;
    if (state.session.modes.length >= CONFIG.session.limits.maxModeSpans) return false;
    const at = this.#stamp(state.session, now);
    this.#state = freezeState({ ...state, session: switchMode(state.session, mode, at) });
    this.#dirty = true;
    this.#events.emit('mode.switched', { at, mode, session: this.#state.session });
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
   * Changes the check-in interval and pause limit. Both apply from the next
   * sign of presence or pause: a running stretch keeps the interval it began
   * with, and a pause keeps its limit.
   */
  setRules(rules: RuleSettings): void {
    this.#rules = normaliseRules(rules);
    this.sync();
  }

  /**
   * Restores a session saved on this device (a refresh or reopened tab), with
   * the last heartbeat written for it. Applies the clock rule, records a gap
   * if the heartbeat is stale, then replays the rules up to now.
   */
  restore(state: ActiveState, heartbeatAt: number | null): boolean {
    if (this.#disposed || this.#state !== null) return false;
    const now = this.#observe();
    let restored = state;
    let heartbeat = heartbeatAt ?? now;
    // The device clock is behind the last heartbeat: resume from the last saved elapsed time.
    if (now < heartbeat - CONFIG.engine.clockJumpTolerance) {
      const delta = Math.max(-(restored.session.segments[0]?.start ?? 0), Math.round(now - heartbeat));
      restored = shiftState(restored, delta);
      heartbeat = now;
      this.#events.emit('clock.jumped', { at: now, deltaMs: delta, session: restored.session });
    }
    this.#state = restored;
    this.#ended = null;
    this.#heartbeatAt = heartbeat;
    this.#hoursReached = Math.floor(focusedMs(restored.session, Math.min(now, heartbeat)) / HOUR);
    this.#announcedCheckIn = null;
    this.#dirty = true;
    this.#refresh(now);
    return true;
  }

  /**
   * Takes the state another tab saved (plan, invariant 15: one active session
   * per browser). null means the other tab ended or cleared the session.
   */
  adopt(state: ActiveState | null): void {
    if (this.#disposed) return;
    const now = this.#observe();
    if (state === null) {
      this.#state = null;
      this.#ended = null;
    } else {
      if (this.#state?.session.id !== state.session.id) {
        this.#hoursReached = Math.floor(focusedMs(state.session, now) / HOUR);
        this.#announcedCheckIn = null;
      }
      this.#state = state;
      this.#ended = null;
      this.#heartbeatAt ??= now;
    }
    // A check-in already announced for this session is not announced again.
    this.#refresh(now);
  }

  /**
   * Notes a heartbeat another tab wrote for the same session, so time that tab
   * was watching is not recorded as a gap here.
   */
  observeHeartbeat(at: number): void {
    if (this.#disposed || !Number.isFinite(at)) return;
    const now = this.#observe();
    const seen = Math.min(Math.round(at), now);
    if (this.#heartbeatAt === null || seen > this.#heartbeatAt) this.#heartbeatAt = seen;
  }

  /**
   * Brings everything up to date now. The site calls this when the page becomes
   * visible again, so a woken device shows the right time at once.
   */
  sync(): void {
    if (this.#disposed) return;
    this.#refresh(this.#observe());
  }

  /** A scheduled wake: take up other tabs' changes first, then bring everything up to date. */
  #wake(): void {
    this.#beforeWake?.();
    this.sync();
  }

  /**
   * In the background (a hidden tab), the engine wakes only for the heartbeat, every 30 s while a session
   * is open, and brings everything up to date in that wake: the view (so the tab title follows), the rules
   * (a check-in or the pause limit is applied at most 30 s late, dated as it fell due) and other tabs'
   * changes. Back in the foreground it catches up at once and wakes for visible changes again (plan,
   * Performance requirements > One scheduler).
   */
  setBackground(background: boolean): void {
    if (this.#background === background) return;
    this.#background = background;
    if (!this.#disposed) this.sync();
  }

  /**
   * A wake for the site's own use (the focus view's quiet spell), on the one shared timer (plan, Performance
   * requirements > One scheduler). A wake with the same key replaces the last; the engine never looks at it.
   */
  wakeAfter(key: string, delayMs: number, run: () => void): void {
    if (this.#disposed) return;
    this.#scheduler.set(`site:${key}`, delayMs, run);
  }

  cancelWake(key: string): void {
    this.#scheduler.clear(`site:${key}`);
  }

  /** Stops all timers. The engine emits nothing afterwards. */
  dispose(): void {
    this.#disposed = true;
    this.#scheduler.dispose();
  }

  /** Observes the clocks; a detected jump shifts the open state. Returns the engine's now. */
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
        shifted = this.#shiftOpenState(-behind, wall);
      } else {
        // Small backward steps are absorbed: time holds still until the clock catches up.
        effective = Math.max(wall, previous.effective);
      }
    }
    this.#reference = { effective, monotonic };
    // The view and the next wake were worked out in the old clock frame; redo them,
    // even if the command that observed the jump then turns out not to apply.
    if (shifted) this.#refresh(effective);
    return effective;
  }

  /** Returns whether the open state was shifted. */
  #shiftOpenState(deltaMs: number, at: number): boolean {
    const state = this.#state;
    if (state === null) {
      if (this.#heartbeatAt !== null) this.#heartbeatAt += deltaMs;
      return false;
    }
    const first = state.session.segments[0]?.start ?? 0;
    // Move far enough that no record is later than now, but never before 1970.
    const delta = Math.max(-first, Math.min(deltaMs, at - latestStamp(state.session)));
    if (this.#heartbeatAt !== null) this.#heartbeatAt += delta;
    if (delta === 0) return false;
    this.#state = shiftState(state, delta);
    if (this.#announcedCheckIn !== null) this.#announcedCheckIn += delta;
    this.#dirty = true;
    this.#events.emit('clock.jumped', { at, deltaMs: delta, session: this.#state.session });
    return true;
  }

  /** The time to record for a command: now, but never before what the session already holds. */
  #stamp(session: Session, now: number): number {
    return Math.max(now, latestStamp(session));
  }

  #finish(ended: Session, reason: EndReason, at: number): void {
    this.#state = null;
    this.#ended = ended;
    this.#announcedCheckIn = null;
    this.#dirty = true;
    this.#events.emit('session.ended', { at, session: ended, reason });
  }

  /** Heartbeat and gaps, the rules in order, milestones and check-ins, then the view. */
  #refresh(now: number): void {
    this.#beat(now);
    this.#applyRules(now);
    this.#emitMilestones(now);
    this.#announceCheckIn(now);
    this.#announcePauseEnding(now);
    this.#afterChange(now);
  }

  /** Records a gap if the last heartbeat is stale, then writes a fresh one. */
  #beat(now: number): void {
    const state = this.#state;
    if (state === null || !this.#heartbeatOn) return;
    const last = this.#heartbeatAt;
    if (last !== null && now - last > CONFIG.session.gapThreshold) {
      const gap = { start: last, end: now };
      const session = recordGap(state.session, gap);
      if (session !== state.session) {
        this.#state = freezeState({ ...state, session });
        this.#dirty = true;
        this.#events.emit('gap.detected', { at: now, gap, session });
      }
    }
    if (last === null || now - last >= CONFIG.session.heartbeatInterval || this.#dirty) {
      this.#heartbeatAt = now;
      this.#events.emit('heartbeat', { at: now });
    }
  }

  #applyRules(now: number): void {
    const state = this.#state;
    if (state === null || this.#rules === null) return;
    for (const outcome of advance(state, this.#rules, now)) {
      // Hours reached before the rule's outcome are real; any reached after it (in time a missed
      // check-in takes back) never happened.
      this.#emitMilestones(outcome.at);
      if (outcome.kind === 'paused') {
        this.#state = outcome.state;
        this.#dirty = true;
        this.#events.emit('session.paused', { at: outcome.at, session: outcome.state.session, reason: 'checkin_missed' });
      } else {
        this.#finish(outcome.session, outcome.reason, outcome.at);
      }
    }
  }

  /** Emits one milestone for each whole hour of focus reached by `upTo` since the last, dated exactly. */
  #emitMilestones(upTo: number): void {
    const session = this.#state?.session;
    if (session === undefined || sessionStatus(session) !== 'running') return;
    const now = upTo;
    const hours = Math.floor(focusedMs(session, upTo) / HOUR);
    while (this.#hoursReached < hours) {
      this.#hoursReached += 1;
      const at = timeWhenFocusReached(session, this.#hoursReached * HOUR, now) ?? now;
      this.#events.emit('milestone.hour', { at, hours: this.#hoursReached, session });
    }
  }

  #announceCheckIn(now: number): void {
    const state = this.#state;
    if (state === null || this.#rules === null) return;
    const due = pendingCheckIn(state, this.#rules, now);
    if (due !== null && due !== this.#announcedCheckIn) {
      this.#announcedCheckIn = due;
      this.#events.emit('checkin.due', { at: due, session: state.session });
    }
  }

  /** When the open pause will end the session, and when to say so; null when no pause limit applies. */
  #pauseEnding(): { readonly pausedAt: number; readonly warnAt: number; readonly endsAt: number } | null {
    const state = this.#state;
    if (state === null || this.#rules === null || state.missedCheckInAt !== null) return null;
    if (sessionStatus(state.session) !== 'paused') return null;
    const last = lastSegment(state.session);
    const pausedAt = last.end ?? last.start;
    const endsAt = pausedAt + (state.pauseLimitMs ?? this.#rules.pauseLimit);
    return { pausedAt, endsAt, warnAt: Math.max(pausedAt, endsAt - CONFIG.notifications.pauseLimitWarning) };
  }

  #announcePauseEnding(now: number): void {
    const ending = this.#pauseEnding();
    const state = this.#state;
    if (ending === null || state === null || now < ending.warnAt || now >= ending.endsAt) return;
    if (this.#announcedPauseEnd === ending.pausedAt) return;
    this.#announcedPauseEnd = ending.pausedAt;
    this.#events.emit('pause.ending', { at: ending.warnAt, endsAt: ending.endsAt, session: state.session });
  }

  /** Saves state if it changed, recomputes the view, emits it if it looks different, and schedules wakes. */
  #afterChange(now: number): void {
    if (this.#dirty) {
      this.#dirty = false;
      this.#events.emit('state.changed', { state: this.#state });
    }
    const state = this.#state;
    const rules = this.#rules;
    const view = computeView(this.session, now, this.#seconds, {
      checkInDueAt: state === null || rules === null ? null : pendingCheckIn(state, rules, now),
      missedCheckInAt: state?.missedCheckInAt ?? null,
    });
    const key = viewKey(view);
    this.#view = view;
    if (key !== this.#viewKey) {
      this.#viewKey = key;
      this.#events.emit('view.changed', { view });
    }
    this.#schedule(view, now);
  }

  #schedule(view: TimerView, now: number): void {
    const delay = this.#background ? null : msUntilNextChange(view);
    if (delay === null) this.#scheduler.clear(VIEW_TASK);
    else
      this.#scheduler.set(VIEW_TASK, delay, () => {
        this.#wake();
      });

    const state = this.#state;
    const rules = this.#rules;
    const due = state === null || rules === null ? null : checkInDueAt(state, rules);
    const trigger = state === null || rules === null ? null : nextTrigger(state, rules);
    const ending = this.#pauseEnding();
    const warnAt = ending !== null && ending.warnAt > now && this.#announcedPauseEnd !== ending.pausedAt ? ending.warnAt : undefined;
    const times = this.#background ? [] : [trigger?.decidedAt, due !== null && due > now ? due : undefined, warnAt].filter((time): time is number => time !== undefined);
    if (times.length === 0) this.#scheduler.clear(RULES_TASK);
    else
      this.#scheduler.set(RULES_TASK, Math.max(0, Math.min(...times) - now), () => {
        this.#wake();
      });

    if (state === null || !this.#heartbeatOn) {
      this.#scheduler.clear(HEARTBEAT_TASK);
      this.#heartbeatScheduled = false;
    } else if (!this.#heartbeatScheduled) {
      this.#heartbeatScheduled = true;
      this.#scheduler.set(
        HEARTBEAT_TASK,
        CONFIG.session.heartbeatInterval,
        () => {
          this.#heartbeatScheduled = false;
          this.#wake();
        },
        CONFIG.session.heartbeatSlack,
      );
    }
  }
}
