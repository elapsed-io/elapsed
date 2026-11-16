export { CONFIG } from './config.ts';
export type { Adjustable, Config } from './config.ts';
export { BRAND } from './brand.ts';
export type { Brand } from './brand.ts';
export { COUNT_EVENTS, COUNT_PATH, countBody, isCountEvent, parseCountBody } from './counts.ts';
export type { CountEvent } from './counts.ts';

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
export type { NewSession, TimeOptions } from './session/commands.ts';
export { summarise } from './session/summary.ts';
export type { SessionSummary } from './session/summary.ts';
export { SessionValidationError, migrateActiveState, migrateSession, parseActiveState, parseSession } from './session/validate.ts';
export { ACTIVE_STATE_SCHEMA, recordGap, serializeActiveState, serializeSession, shiftState, startState } from './session/state.ts';
export type { ActiveState } from './session/state.ts';
export { advance, applyTrigger, checkInDueAt, checkInIntervalFor, defaultRules, nextTrigger, normaliseRules, pendingCheckIn } from './session/rules.ts';
export type { RuleKind, RuleOutcome, RuleSettings, RuleTrigger } from './session/rules.ts';

export { EventBus } from './events/bus.ts';
export type { Emitter, EventBusOptions, Handler } from './events/bus.ts';

export { TimerEngine } from './engine/engine.ts';
export type { TimerEngineOptions } from './engine/engine.ts';
export type { TimerEvents } from './engine/events.ts';
export { Scheduler } from './engine/scheduler.ts';
export type { SchedulerOptions } from './engine/scheduler.ts';
export { SECONDS_DISPLAYS, computeView, focusPrecision, isSecondsDisplay, msUntilNextChange, viewKey } from './engine/view.ts';
export type { SecondsDisplay, TimerStatus, TimerView } from './engine/view.ts';

export {
  CLOCK_FORMATS,
  FONT_CHOICES,
  MODE_CHOICES,
  SETTINGS,
  SETTINGS_CATEGORIES,
  SETTINGS_SCHEMA,
  THEME_IDS,
  declarationOf,
  defaultSettings,
  isValidValue,
  migrateSettings,
  normaliseHex,
  parseSettings,
  resetCategory,
  rulesFrom,
  serializeSettings,
  withSetting,
} from './settings/schema.ts';
export type {
  BuiltInFont,
  ClockFormat,
  FontChoice,
  HexColor,
  ModeChoice,
  SettingDeclaration,
  SettingKey,
  SettingTarget,
  Settings,
  SettingsCategory,
  ThemeColors,
  ThemeId,
} from './settings/schema.ts';
