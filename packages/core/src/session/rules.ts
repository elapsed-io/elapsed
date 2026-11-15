/**
 * The abandonment rules (plan, Session lifecycle and abandonment), as pure
 * functions of the active state and the current time. A sleeping device runs
 * no code, so after sleep or a reopened tab the engine applies them in order
 * as if it had been running (replay on wake).
 *
 * - Check-in: due after a full interval of running time since the last sign
 *   of presence. It can be answered until an hour after it fell due.
 * - Missed check-in: unanswered for an hour, the session pauses, backdated to
 *   when the check-in appeared. That pause ignores the pause limit and waits
 *   up to 12 hours (from the check-in), then the session ends dated to the
 *   check-in, reason checkin_missed.
 * - Pause limit: a pause longer than the limit in force when it began ends the
 *   session, dated to when the pause began, reason pause_timeout.
 * - Session maximum: when focused time reaches 16 hours, the session ends
 *   there, reason max_duration.
 *
 * Rules fire in the order they are decided. A missed check-in is decided an
 * hour after the check-in, so a session maximum reached within that hour
 * still ends the session at the maximum.
 */

import { CONFIG } from '../config.ts';
import { endSession, pauseSession } from './commands.ts';
import { focusedMs, lastSegment, sessionStatus } from './derive.ts';
import type { EndReason, Session } from './session.ts';
import { freezeState } from './state.ts';
import type { ActiveState } from './state.ts';

export interface RuleSettings {
  /** Running time since the last sign of presence before a check-in falls due. */
  readonly checkInInterval: number;
  /** Longest pause before the session ends. Fixed for each pause when it begins. */
  readonly pauseLimit: number;
}

export function defaultRules(): RuleSettings {
  return {
    checkInInterval: CONFIG.session.checkInInterval.default,
    pauseLimit: CONFIG.session.pauseLimit.default,
  };
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Keeps user-chosen thresholds inside the plan's ranges. */
export function normaliseRules(rules: RuleSettings): RuleSettings {
  const { checkInInterval, pauseLimit } = CONFIG.session;
  const pick = (value: number, range: { min: number; max: number; default: number }): number =>
    Number.isFinite(value) ? clamp(Math.round(value), range.min, range.max) : range.default;
  return { checkInInterval: pick(rules.checkInInterval, checkInInterval), pauseLimit: pick(rules.pauseLimit, pauseLimit) };
}

/** When the check-in falls due, for a running session; otherwise null. */
export function checkInDueAt(state: ActiveState, rules: RuleSettings): number | null {
  return sessionStatus(state.session) === 'running' ? state.presenceAt + rules.checkInInterval : null;
}

/** The check-in waiting for an answer at `now`, or null. */
export function pendingCheckIn(state: ActiveState, rules: RuleSettings, now: number): number | null {
  const due = checkInDueAt(state, rules);
  return due !== null && now >= due ? due : null;
}

export type RuleKind = 'checkin-missed' | 'max-duration' | 'pause-timeout' | 'missed-expired';

export interface RuleTrigger {
  readonly kind: RuleKind;
  /** When the rule is decided: the earliest moment it can apply. */
  readonly decidedAt: number;
  /** The time the outcome is dated to. */
  readonly effectiveAt: number;
}

/** The next rule to fire for this state, whenever that is. */
export function nextTrigger(state: ActiveState, rules: RuleSettings): RuleTrigger | null {
  const { session } = state;
  const status = sessionStatus(session);
  if (status === 'running') {
    const segment = lastSegment(session);
    const closed = focusedMs(session, segment.start);
    const maxAt = segment.start + Math.max(0, CONFIG.session.maxFocus - closed);
    const due = state.presenceAt + rules.checkInInterval;
    const missedAt = due + CONFIG.session.checkInResponseWindow;
    return missedAt < maxAt
      ? { kind: 'checkin-missed', decidedAt: missedAt, effectiveAt: due }
      : { kind: 'max-duration', decidedAt: maxAt, effectiveAt: maxAt };
  }
  if (status === 'paused') {
    const pausedAt = lastSegment(session).end ?? lastSegment(session).start;
    if (state.missedCheckInAt !== null) {
      const at = state.missedCheckInAt + CONFIG.session.missedCheckInHold;
      return { kind: 'missed-expired', decidedAt: at, effectiveAt: state.missedCheckInAt };
    }
    const limit = state.pauseLimitMs ?? rules.pauseLimit;
    return { kind: 'pause-timeout', decidedAt: pausedAt + limit, effectiveAt: pausedAt };
  }
  return null;
}

export type RuleOutcome =
  | { readonly kind: 'paused'; readonly state: ActiveState; readonly at: number }
  | { readonly kind: 'ended'; readonly session: Session; readonly reason: EndReason; readonly at: number };

export function applyTrigger(state: ActiveState, trigger: RuleTrigger): RuleOutcome {
  const { session } = state;
  switch (trigger.kind) {
    case 'checkin-missed':
      return {
        kind: 'paused',
        at: trigger.effectiveAt,
        state: freezeState({
          ...state,
          session: pauseSession(session, trigger.effectiveAt, { backdate: true }),
          missedCheckInAt: trigger.effectiveAt,
          pauseLimitMs: null,
        }),
      };
    case 'max-duration':
      return { kind: 'ended', reason: 'max_duration', at: trigger.effectiveAt, session: endSession(session, 'max_duration', trigger.effectiveAt, { backdate: true }) };
    case 'pause-timeout':
      return { kind: 'ended', reason: 'pause_timeout', at: trigger.effectiveAt, session: endSession(session, 'pause_timeout', trigger.effectiveAt, { backdate: true }) };
    case 'missed-expired':
      return { kind: 'ended', reason: 'checkin_missed', at: trigger.effectiveAt, session: endSession(session, 'checkin_missed', trigger.effectiveAt, { backdate: true }) };
  }
}

/** Every rule outcome due by `now`, in order, starting from `state`. */
export function advance(state: ActiveState, rules: RuleSettings, now: number): readonly RuleOutcome[] {
  const outcomes: RuleOutcome[] = [];
  let current: ActiveState | null = state;
  while (current !== null) {
    const trigger = nextTrigger(current, rules);
    if (trigger === null || trigger.decidedAt > now) break;
    const outcome = applyTrigger(current, trigger);
    outcomes.push(outcome);
    current = outcome.kind === 'paused' ? outcome.state : null;
  }
  return outcomes;
}
