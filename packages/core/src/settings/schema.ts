/**
 * The settings schema (plan, Architecture invariant 9): every customizable
 * value is declared once here, with its default, its range or options, its
 * category, and what it controls. The settings panel is built from it, the
 * site applies it, and Release 3's server validates synced settings with it.
 *
 * Only choices live in settings, and only choices will sync (owner changes,
 * item 10). What the user creates (a font file now; custom CSS and background
 * images later) stays on the device in its own store; settings record only
 * that one is in use (`font: 'own'`).
 *
 * Release 1 categories (owner changes, item 5): timer, display, appearance,
 * notifications, privacy and data. Advanced arrives in round 7.
 *
 * Schema 2 (Release 2, round 2.1) adds animation speed and low power, and the
 * mode options (round 2.3 on: results landmarks for ocean depth and height; 2.4: ocean life). Older
 * settings migrate field by field: what they lack takes its default.
 *
 * Schema 3 (round 2.11): "leave fullscreen" defaults to never, so leaving fullscreen never delays the results.
 * Stored settings hold every field, so the only sign a person never changed it is that it still holds the old
 * default (end): an older record with end reads as never; any other choice is kept (owner, round 2.11).
 *
 * Schema 4 (round 2.14): seconds default to "always show" (plan version 13, Settings catalog), the options in the
 * order always, blur away, never. By the same rule, stored settings never changed move to the new default: a
 * record older than schema 4 still at the old default (blur away) reads as always; any other choice is kept, and
 * from schema 4 on, blur away is kept like any choice (plan version 13, answer 36).
 *
 * Schema 5 (plan version 14): the seconds become "hide seconds after starting", in display's focus mode group
 * (never, blur away, right away; never by default). A record older than schema 5 maps its seconds across, the same
 * screen for the same choice: always → never, blur away → blur away (but the never-changed blur away of a record
 * older than schema 4 → never, the new default), never → right away. The clock format's "follow region" becomes
 * "system settings" (shown in timer); the oxblood and lilac themes are gone, so a record holding either reads as
 * graphite; low power is gone (to the backlog), so a stored value is dropped.
 */

import { CONFIG } from '../config.ts';
import type { SecondsDisplay } from '../engine/view.ts';
import type { RuleSettings } from '../session/rules.ts';

export const SETTINGS_SCHEMA = 5;

/** The default "leave fullscreen" had before schema 3, which an older record holding it never chose. */
const LEAVE_FULLSCREEN_BEFORE_3 = 'end';
/** The default seconds had before schema 4, which an older record holding it never chose. */
const SECONDS_BEFORE_4 = 'blur-away';
/** Schema 4's seconds, as each reads in schema 5's "hide seconds after starting" (the same screen for the same choice). */
const HIDE_SECONDS_FROM_4: Readonly<Record<string, HideSeconds>> = { always: 'never', 'blur-away': 'blur-away', never: 'right-away' };
/** Themes removed in schema 5 (plan version 14): a record holding one reads as the default. */
const THEMES_REMOVED_5: readonly string[] = ['oxblood', 'lilac'];
/** The clock format's id before schema 5 for what is now "system settings". */
const CLOCK_FORMAT_BEFORE_5: Readonly<Record<string, string>> = { region: 'system' };

/** In the panel's order: display first (round 2.14, the Release 2 frames), then timer, appearance, notifications, privacy. */
export const SETTINGS_CATEGORIES = ['display', 'timer', 'appearance', 'notifications', 'privacy'] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

/** The display modes, in the tiles' order (Release 2 adds each in its round: analog in 2.2). */
export const MODE_CHOICES = ['digits', 'ring', 'timeline', 'analog', 'ocean', 'height', 'tree', 'interstellar'] as const;
/** The standard modes: what ships (plan, Display modes; owner, 2026-11-24). */
export const STANDARD_MODES = ['digits', 'ring', 'timeline', 'analog'] as const;
/**
 * Test modes: proofs of concept for the recipe system, not part of any release until promoted (plan, Display modes >
 * Interstellar). They are offered only on a visit opened with the test flag (`?test=modes`, or the older
 * `?test=interstellar`), for that visit; the settings keep them as choices so a choice made on a flagged visit is
 * kept for the next.
 */
export const TEST_MODES: readonly (typeof MODE_CHOICES)[number][] = ['ocean', 'height', 'tree', 'interstellar'];

/**
 * The mode shown for a chosen one: a test mode chosen shows digits on a visit without the test flag, the choice
 * itself kept for the next flagged visit (owner, 2026-11-24).
 */
export function shownMode(chosen: (typeof MODE_CHOICES)[number], flagged: boolean): (typeof MODE_CHOICES)[number] {
  return TEST_MODES.includes(chosen) && !flagged ? 'digits' : chosen;
}
export type ModeChoice = (typeof MODE_CHOICES)[number];

/** Focus view (plan, Interface): how long a running session waits untouched before the controls step aside. */
export const FOCUS_HIDES = ['3s', '10s', 'never'] as const;
export type FocusHide = (typeof FOCUS_HIDES)[number];
/** Focus mode (plan version 14): hide seconds after starting (never, blur away, right away; never by default). */
export const HIDE_SECONDS = ['never', 'blur-away', 'right-away'] as const;
export type HideSeconds = (typeof HIDE_SECONDS)[number];

/** How the engine shows seconds for each "hide seconds after starting" choice. */
export function secondsDisplayFor(hide: HideSeconds): SecondsDisplay {
  return hide === 'never' ? 'always' : hide === 'right-away' ? 'never' : 'blur-away';
}

/** When a session started in fullscreen leaves it (plan, Interface: "leave fullscreen", on end by default). */
export const LEAVE_FULLSCREEN = ['never', 'pause-or-end', 'end'] as const;
export type LeaveFullscreen = (typeof LEAVE_FULLSCREEN)[number];

/** The tree's views (a mode option; plan, Settings catalog: "tree view (side or isometric)", side by default). */
export const TREE_VIEWS = ['side', 'isometric'] as const;
export type TreeView = (typeof TREE_VIEWS)[number];

/** The preset themes, lightest to darkest background, as the appearance frame orders them (plan version 14). */
export const THEME_IDS = ['paper', 'mint', 'sand', 'sky', 'forest', 'deep-sea', 'plum', 'graphite'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** The built-in fonts in the grid's order, then the user's own file (Lexend is dropped: decision 160). */
export const FONT_CHOICES = [
  'archivo',
  'barlow-semi-condensed',
  'saira',
  'inter',
  'space-grotesk',
  'sora',
  'manrope',
  'outfit',
  'ibm-plex-sans',
  'jetbrains-mono',
  'ibm-plex-mono',
  'roboto-mono',
  'dm-mono',
  'own',
] as const;
export type FontChoice = (typeof FONT_CHOICES)[number];
export type BuiltInFont = Exclude<FontChoice, 'own'>;

/** Clock times (plan version 14): system settings (the default and leftmost), 12-hour, 24-hour. */
export const CLOCK_FORMATS = ['system', '12h', '24h'] as const;
export type ClockFormat = (typeof CLOCK_FORMATS)[number];

/** Animation speed (Release 2): multiplies every interface animation's duration (CONFIG.motion.speeds). */
export const ANIMATION_SPEEDS = ['slower', 'normal', 'faster'] as const;
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];

/** A colour as #rrggbb in lowercase. */
export type HexColor = `#${string}`;

export interface ThemeColors {
  readonly background: HexColor;
  readonly foreground: HexColor;
  readonly accent: HexColor;
}

export interface Settings {
  readonly schema: typeof SETTINGS_SCHEMA;
  // Timer
  /** Whether check-ins fall due (Release 2; on by default). */
  readonly checkIns: boolean;
  readonly checkInInterval: number;
  readonly pauseLimit: number;
  /** A screen wake lock while a session is open in the visible tab (Release 2; on by default). */
  readonly keepAwake: boolean;
  /** Clock times such as "started 2:02 pm" (shown in timer since plan version 14). */
  readonly clockFormat: ClockFormat;
  // Display
  readonly mode: ModeChoice;
  /** Mode option (ocean depth): sea life drifts in while a session is paused. */
  readonly oceanLife: boolean;
  /** Mode option (ocean depth): random landmarks on the results' dive profile. */
  readonly resultsLandmarks: boolean;
  /** Mode option (height, its own options box; owner, changes 3): random landmarks on the results' climb profile. */
  readonly heightLandmarks: boolean;
  /** Focus mode: hide the buttons after this long untouched while a session runs. */
  readonly focusHide: FocusHide;
  /** Focus mode: hide seconds after starting (plan version 14; never by default). */
  readonly hideSeconds: HideSeconds;
  /** Focus view: go fullscreen when a session starts. */
  readonly fullscreenOnStart: boolean;
  /** Focus view: when to leave fullscreen. */
  readonly leaveFullscreen: LeaveFullscreen;
  /** Mode option (tree): the side view or the isometric one. */
  readonly treeView: TreeView;
  /**
   * Picture-in-picture: a corner button that opens a floating timer. Moved to a later release (owner, answer 38):
   * declared so a choice made on a visit with the test flag is kept, offered only there.
   */
  readonly pictureInPicture: boolean;
  // Appearance
  readonly theme: ThemeId;
  /** The theme's colours when the user has changed them; null means the preset's own. */
  readonly colors: ThemeColors | null;
  readonly font: FontChoice;
  readonly timeSize: number;
  readonly animationSpeed: AnimationSpeed;
  // Notifications
  readonly notifyCheckIns: boolean;
  readonly notifyPauseLimit: boolean;
  // Privacy and data
  readonly usageCounts: boolean;
  readonly crashReports: boolean;
}

export type SettingKey = Exclude<keyof Settings, 'schema'>;

/**
 * What a setting controls (invariant 9): a CSS custom property, the theme's
 * three tokens (from which every colour property is derived), an engine
 * option, or the site itself.
 */
export type SettingTarget =
  | { readonly css: `--${string}` }
  | { readonly theme: 'preset' | 'colors' }
  | { readonly engine: 'secondsDisplay' | 'checkIns' | 'checkInInterval' | 'pauseLimit' }
  | { readonly site: 'mode' | 'modeOptions' | 'focusView' | 'keepAwake' | 'pictureInPicture' | 'clockFormat' | 'notifications' | 'usageCounts' | 'crashReports' };

interface Declared<K extends SettingKey> {
  readonly key: K;
  readonly category: SettingsCategory;
  readonly default: Settings[K];
  readonly target: SettingTarget;
}

export interface ChoiceSetting<K extends SettingKey> extends Declared<K> {
  readonly kind: 'choice';
  readonly options: readonly Settings[K][];
}

export interface RangeSetting<K extends SettingKey> extends Declared<K> {
  readonly kind: 'range';
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export interface SwitchSetting<K extends SettingKey> extends Declared<K> {
  readonly kind: 'switch';
}

export interface ColorsSetting<K extends SettingKey> extends Declared<K> {
  readonly kind: 'colors';
}

export type SettingDeclaration =
  | SwitchSetting<'checkIns'>
  | RangeSetting<'checkInInterval'>
  | RangeSetting<'pauseLimit'>
  | SwitchSetting<'keepAwake'>
  | ChoiceSetting<'clockFormat'>
  | ChoiceSetting<'mode'>
  | SwitchSetting<'oceanLife'>
  | SwitchSetting<'resultsLandmarks'>
  | SwitchSetting<'heightLandmarks'>
  | ChoiceSetting<'focusHide'>
  | ChoiceSetting<'hideSeconds'>
  | SwitchSetting<'fullscreenOnStart'>
  | ChoiceSetting<'leaveFullscreen'>
  | ChoiceSetting<'treeView'>
  | SwitchSetting<'pictureInPicture'>
  | ChoiceSetting<'theme'>
  | ColorsSetting<'colors'>
  | ChoiceSetting<'font'>
  | RangeSetting<'timeSize'>
  | ChoiceSetting<'animationSpeed'>
  | SwitchSetting<'notifyCheckIns'>
  | SwitchSetting<'notifyPauseLimit'>
  | SwitchSetting<'usageCounts'>
  | SwitchSetting<'crashReports'>;

const { checkInInterval, pauseLimit } = CONFIG.session;
const { timeSizePercent } = CONFIG.settings;

/** Every setting, in the order the panel shows them. */
export const SETTINGS: readonly SettingDeclaration[] = [
  { key: 'checkIns', kind: 'switch', category: 'timer', default: true, target: { engine: 'checkIns' } },
  {
    key: 'checkInInterval',
    kind: 'range',
    category: 'timer',
    min: checkInInterval.min,
    max: checkInInterval.max,
    step: CONFIG.settings.checkInStep,
    default: checkInInterval.default,
    target: { engine: 'checkInInterval' },
  },
  {
    key: 'pauseLimit',
    kind: 'range',
    category: 'timer',
    min: pauseLimit.min,
    max: pauseLimit.max,
    step: CONFIG.settings.pauseLimitStep,
    default: pauseLimit.default,
    target: { engine: 'pauseLimit' },
  },
  { key: 'keepAwake', kind: 'switch', category: 'timer', default: true, target: { site: 'keepAwake' } },
  { key: 'clockFormat', kind: 'choice', category: 'timer', options: CLOCK_FORMATS, default: 'system', target: { site: 'clockFormat' } },
  { key: 'mode', kind: 'choice', category: 'display', options: MODE_CHOICES, default: 'digits', target: { site: 'mode' } },
  { key: 'oceanLife', kind: 'switch', category: 'display', default: true, target: { site: 'modeOptions' } },
  { key: 'resultsLandmarks', kind: 'switch', category: 'display', default: true, target: { site: 'modeOptions' } },
  { key: 'heightLandmarks', kind: 'switch', category: 'display', default: true, target: { site: 'modeOptions' } },
  { key: 'focusHide', kind: 'choice', category: 'display', options: FOCUS_HIDES, default: '3s', target: { site: 'focusView' } },
  { key: 'hideSeconds', kind: 'choice', category: 'display', options: HIDE_SECONDS, default: 'never', target: { engine: 'secondsDisplay' } },
  { key: 'fullscreenOnStart', kind: 'switch', category: 'display', default: false, target: { site: 'focusView' } },
  { key: 'leaveFullscreen', kind: 'choice', category: 'display', options: LEAVE_FULLSCREEN, default: 'never', target: { site: 'focusView' } },
  { key: 'treeView', kind: 'choice', category: 'display', options: TREE_VIEWS, default: 'side', target: { site: 'modeOptions' } },
  { key: 'pictureInPicture', kind: 'switch', category: 'display', default: false, target: { site: 'pictureInPicture' } },
  { key: 'theme', kind: 'choice', category: 'appearance', options: THEME_IDS, default: 'graphite', target: { theme: 'preset' } },
  { key: 'colors', kind: 'colors', category: 'appearance', default: null, target: { theme: 'colors' } },
  { key: 'font', kind: 'choice', category: 'appearance', options: FONT_CHOICES, default: 'archivo', target: { css: '--font-family' } },
  {
    key: 'timeSize',
    kind: 'range',
    category: 'appearance',
    min: timeSizePercent.min,
    max: timeSizePercent.max,
    step: timeSizePercent.step,
    default: timeSizePercent.default,
    target: { css: '--time-size-setting' },
  },
  { key: 'animationSpeed', kind: 'choice', category: 'appearance', options: ANIMATION_SPEEDS, default: 'normal', target: { css: '--motion-scale' } },
  { key: 'notifyCheckIns', kind: 'switch', category: 'notifications', default: false, target: { site: 'notifications' } },
  { key: 'notifyPauseLimit', kind: 'switch', category: 'notifications', default: false, target: { site: 'notifications' } },
  { key: 'usageCounts', kind: 'switch', category: 'privacy', default: true, target: { site: 'usageCounts' } },
  { key: 'crashReports', kind: 'switch', category: 'privacy', default: false, target: { site: 'crashReports' } },
];

export function declarationOf<K extends SettingKey>(key: K): Extract<SettingDeclaration, { key: K }> {
  const found = SETTINGS.find((setting) => setting.key === key);
  if (found === undefined) throw new RangeError(`unknown setting: ${key}`);
  return found as Extract<SettingDeclaration, { key: K }>;
}

export function defaultSettings(): Settings {
  const entries = SETTINGS.map((setting) => [setting.key, setting.default] as const);
  return Object.freeze({ schema: SETTINGS_SCHEMA, ...Object.fromEntries(entries) } as Settings);
}

/** The defaults for one category, for its reset button. */
export function resetCategory(settings: Settings, category: SettingsCategory): Settings {
  const defaults = defaultSettings();
  const changes = Object.fromEntries(SETTINGS.filter((setting) => setting.category === category).map((setting) => [setting.key, defaults[setting.key]]));
  return Object.freeze({ ...settings, ...changes });
}

/** The engine's rules from the settings. */
export function rulesFrom(settings: Settings): RuleSettings {
  return { checkIns: settings.checkIns, checkInInterval: settings.checkInInterval, pauseLimit: settings.pauseLimit };
}

const HEX = /^#[0-9a-f]{6}$/;

/** "#ABC", "abc", "#AABBCC" or "aabbcc" as "#aabbcc"; anything else null. */
export function normaliseHex(text: string): HexColor | null {
  const trimmed = text.trim().toLowerCase().replace(/^#/, '');
  const full = /^[0-9a-f]{3}$/.test(trimmed) ? trimmed.replace(/[0-9a-f]/g, '$&$&') : trimmed;
  const value = `#${full}`;
  return HEX.test(value) ? (value as HexColor) : null;
}

function isColors(value: unknown): value is ThemeColors {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'accent,background,foreground') return false;
  const record = value as Record<string, unknown>;
  return ['background', 'foreground', 'accent'].every((key) => typeof record[key] === 'string' && HEX.test(record[key]));
}

function onStep(value: number, min: number, step: number): boolean {
  return Number.isInteger((value - min) / step);
}

/** Whether `value` is allowed for the setting. */
export function isValidValue(setting: SettingDeclaration, value: unknown): boolean {
  switch (setting.kind) {
    case 'choice':
      return typeof value === 'string' && (setting.options as readonly string[]).includes(value);
    case 'range':
      return typeof value === 'number' && Number.isFinite(value) && value >= setting.min && value <= setting.max && onStep(value, setting.min, setting.step);
    case 'switch':
      return typeof value === 'boolean';
    case 'colors':
      return value === null || isColors(value);
  }
}

/**
 * Reads stored or synced settings. Settings are choices with safe defaults, so
 * a missing or invalid field falls back to its default rather than discarding
 * the rest; unknown fields are dropped. A newer schema than this code knows is
 * read as far as it matches.
 */
export function migrateSettings(raw: unknown): Settings {
  const defaults = defaultSettings();
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const record = raw as Record<string, unknown>;
  const result: Record<string, unknown> = { schema: SETTINGS_SCHEMA };
  const before3 = typeof record['schema'] !== 'number' || record['schema'] < 3;
  const before4 = typeof record['schema'] !== 'number' || record['schema'] < 4;
  const before5 = typeof record['schema'] !== 'number' || record['schema'] < 5;
  for (const setting of SETTINGS) {
    // Height's landmarks had ocean depth's switch until each mode had its own options box: kept as it was.
    const value = setting.key === 'heightLandmarks' && !(setting.key in record) ? record['resultsLandmarks'] : record[setting.key];
    // Leave fullscreen left at its old default reads as the new one (schema 3).
    if (setting.key === 'leaveFullscreen' && before3 && value === LEAVE_FULLSCREEN_BEFORE_3) {
      result[setting.key] = defaults[setting.key];
      continue;
    }
    // Hide seconds after starting (schema 5), from an older record's seconds: the same screen for the same choice,
    // and a never-changed blur away from before schema 4 reads as the new default.
    if (setting.key === 'hideSeconds' && before5) {
      const seconds = record['seconds'];
      result[setting.key] = before4 && seconds === SECONDS_BEFORE_4 ? defaults[setting.key] : typeof seconds === 'string' && Object.hasOwn(HIDE_SECONDS_FROM_4, seconds) ? HIDE_SECONDS_FROM_4[seconds] : defaults[setting.key];
      continue;
    }
    // A removed theme reads as the default; "follow region" is "system settings" (schema 5).
    if (setting.key === 'theme' && before5 && typeof value === 'string' && THEMES_REMOVED_5.includes(value)) {
      result[setting.key] = defaults[setting.key];
      continue;
    }
    if (setting.key === 'clockFormat' && before5 && typeof value === 'string' && Object.hasOwn(CLOCK_FORMAT_BEFORE_5, value)) {
      result[setting.key] = CLOCK_FORMAT_BEFORE_5[value];
      continue;
    }
    if (!isValidValue(setting, value)) {
      result[setting.key] = defaults[setting.key];
    } else if (setting.kind === 'colors' && value !== null) {
      const colors = value as ThemeColors;
      result[setting.key] = Object.freeze({ background: colors.background, foreground: colors.foreground, accent: colors.accent });
    } else {
      result[setting.key] = value;
    }
  }
  return Object.freeze(result as unknown as Settings);
}

/** Parses stored text; anything unreadable gives the defaults. */
export function parseSettings(text: string | null): Settings {
  if (text === null || text.length > CONFIG.settings.maxStoredChars) return defaultSettings();
  try {
    return migrateSettings(JSON.parse(text));
  } catch {
    return defaultSettings();
  }
}

/** Settings as JSON with their fields in one fixed order, so equal settings give equal text. */
export function serializeSettings(settings: Settings): string {
  const fields: Record<string, unknown> = { schema: settings.schema };
  for (const setting of SETTINGS) {
    const value = settings[setting.key];
    fields[setting.key] =
      setting.kind === 'colors' && value !== null && typeof value === 'object'
        ? { background: value.background, foreground: value.foreground, accent: value.accent }
        : value;
  }
  return JSON.stringify(fields);
}

/** Changes one setting, refusing a value the schema does not allow. */
export function withSetting<K extends SettingKey>(settings: Settings, key: K, value: Settings[K]): Settings {
  if (!isValidValue(declarationOf(key), value)) throw new RangeError(`not a valid ${key}: ${typeof value}`);
  return Object.freeze({ ...settings, [key]: value });
}
