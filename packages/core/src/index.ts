export { CONFIG } from './config.ts';
export type { Adjustable, Config } from './config.ts';
export { BRAND } from './brand.ts';
export type { Brand } from './brand.ts';

export type { Clock, TimerHandle } from './time/clock.ts';
export { durationParts } from './time/duration.ts';
export type { DurationParts } from './time/duration.ts';
export { isTimeZone, localDay, systemTimeZone } from './time/local-day.ts';

export {
  END_REASONS,
  SESSION_ID_PATTERN,
  SESSION_SCHEMA,
  SessionError,
  isEndReason,
  isModeId,
} from './session/session.ts';
export type { EndReason, Gap, ModeSpan, Segment, Session, SessionStatus } from './session/session.ts';
export {
  currentMode,
  focusedMs,
  lastSegment,
  latestStamp,
  longestStretchMs,
  pauseCount,
  pausedForMs,
  pausedSince,
  sessionStatus,
  timeWhenFocusReached,
} from './session/derive.ts';
export { createSession, endSession, pauseSession, resumeSession, shiftSession, switchMode } from './session/commands.ts';
export type { NewSession } from './session/commands.ts';
export { SessionValidationError, migrateSession, parseSession } from './session/validate.ts';

export { EventBus } from './events/bus.ts';
export type { Emitter, EventBusOptions, Handler } from './events/bus.ts';

export { TimerEngine } from './engine/engine.ts';
export type { TimerEngineOptions } from './engine/engine.ts';
export type { TimerEvents } from './engine/events.ts';
export { Scheduler } from './engine/scheduler.ts';
export type { SchedulerOptions } from './engine/scheduler.ts';
export { SECONDS_DISPLAYS, computeView, focusPrecision, isSecondsDisplay, msUntilNextChange, viewKey } from './engine/view.ts';
export type { SecondsDisplay, TimerStatus, TimerView } from './engine/view.ts';
