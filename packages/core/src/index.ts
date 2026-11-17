export { CONFIG } from './config.ts';
export type { Adjustable, Config } from './config.ts';
export { ANALOG_CONFIG } from './modes/analog-config.ts';
export { HEIGHT_CONFIG } from './modes/height-config.ts';
export { OCEAN_CONFIG } from './modes/ocean-config.ts';
export { RING_CONFIG } from './modes/ring-config.ts';
export { SPACE_CONFIG } from './modes/space-config.ts';
export { TIMELINE_CONFIG } from './modes/timeline-config.ts';
export { TREE_CONFIG } from './modes/tree-config.ts';
export { HEIGHT_METEORS_CONFIG } from './modes/height-meteors-config.ts';
export { OCEAN_LIFE_CONFIG } from './modes/ocean-life-config.ts';
export { SPACE_COMETS_CONFIG } from './modes/space-comets-config.ts';
export { BRAND } from './brand.ts';
export type { Brand } from './brand.ts';
export { HEIGHT_COPY } from './copy/height.ts';
export { OCEAN_COPY } from './copy/ocean.ts';
export { SETTINGS_COPY } from './copy/settings.ts';
export { SPACE_COPY } from './copy/space.ts';
export { TREE_COPY } from './copy/tree.ts';
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
  ANIMATION_SPEEDS,
  CLOCK_FORMATS,
  FONT_CHOICES,
  MODE_CHOICES,
  FOCUS_HIDES,
  LEAVE_FULLSCREEN,
  TEST_MODES,
  TREE_VIEWS,
  shownMode,
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
  AnimationSpeed,
  BuiltInFont,
  ClockFormat,
  FontChoice,
  HexColor,
  ModeChoice,
  TreeView,
  FocusHide,
  LeaveFullscreen,
  SettingDeclaration,
  SettingKey,
  SettingTarget,
  Settings,
  SettingsCategory,
  ThemeColors,
  ThemeId,
} from './settings/schema.ts';

export { BROWSER_FAMILIES, CRASH_PATH, browserOf, crashBody, crashBodyBytes, crashReport, parseCrashBody, scrubCrashText } from './crash.ts';
export type { BrowserFamily, CrashReport } from './crash.ts';

// The custom CSS checker and the settings file are imported by their own paths
// (`@stopwatch/core/custom-css`, `@stopwatch/core/settings-file`), never through
// this index, so the first visit never loads them: the checker loads only with
// the editor (plan, Loading and performance > Custom CSS).
export { utf8Bytes } from './utf8.ts';
export { longSessionReplayExtraMs, replayLengthMs } from './replay.ts';
export type { ReplayTiming } from './replay.ts';

export { attenuated, contrast, hex, luminance, parseHexColour, srgbChannel } from './modes/light.ts';
export type { LinearRgb } from './modes/light.ts';
export { OCEAN_LANDMARKS, oceanColour, oceanDepth, oceanLitColour, oceanZone, pickLandmarks, spreadLandmarks } from './modes/ocean.ts';
export type { Landmark, LandmarkId, OceanZone } from './modes/ocean.ts';
export { HEIGHT_LANDMARKS, atmosphereLayer, heightReached, pickHeightLandmarks, skyColour, skyLitColour, spreadHeightLandmarks, starsOpacity } from './modes/height.ts';
export type { AtmosphereLayer, HeightLandmark, HeightLandmarkId } from './modes/height.ts';
export { pickByBand, spreadBy } from './modes/landmarks.ts';
export { grassColour, grassWeights, leafColour, leafScale, leafState, mixColour, seasonPhase, shares, stackedColour, weather, yearPhase } from './modes/tree.ts';
export type { LeafState, Weather } from './modes/tree.ts';
export { SPACE_LANDMARKS, bodyOpacity, headingDirection, keptLabels, mapPoint, mapState, ringOpacity, spaceScale, startOpacity, usablePath } from './modes/space.ts';
export type { MapState, SpaceBody, SpaceBodyId } from './modes/space.ts';
export { checkRecipe, parseRecipe, recipeOrDigits } from './recipes/load.ts';
export { DIGITS_RECIPE, builtInRecipe } from './recipes/built-in.ts';
export type { LoadOptions, RecipeResult } from './recipes/load.ts';
export { RECIPE_LIMITS } from './recipes/limits.ts';
export {
  RECIPE_MINUTE_MS,
  TEXT_CONTRAST,
  bindingAt,
  contrastText,
  cycleShare,
  environmentColour,
  focusFor,
  lightColour,
  measureAt,
  measureText,
  phaseAt,
  replayTimingFor,
  smoothstep,
  sourceValue,
  stopsAt,
  zoneAt,
} from './recipes/measure.ts';
export type { BindingInputs } from './recipes/measure.ts';
export type * from './recipes/types.ts';
