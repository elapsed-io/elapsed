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
 */

import { CONFIG } from '../config.ts';
import { SECONDS_DISPLAYS } from '../engine/view.ts';
import type { SecondsDisplay } from '../engine/view.ts';
import type { RuleSettings } from '../session/rules.ts';

export const SETTINGS_SCHEMA = 2;

export const SETTINGS_CATEGORIES = ['timer', 'display', 'appearance', 'notifications', 'privacy'] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

/** The display modes, in the tiles' order (Release 2 adds each in its round: analog in 2.2). */
export const MODE_CHOICES = ['digits', 'ring', 'timeline', 'analog', 'ocean', 'height'] as const;
export type ModeChoice = (typeof MODE_CHOICES)[number];

/** The preset themes, in the frames' order (Design system > Color). */
export const THEME_IDS = ['graphite', 'paper', 'deep-sea', 'forest', 'oxblood', 'plum', 'lilac', 'sky', 'sand', 'mint'] as const;
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

export const CLOCK_FORMATS = ['12h', '24h', 'region'] as const;
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
  readonly seconds: SecondsDisplay;
  readonly checkInInterval: number;
  readonly pauseLimit: number;
  // Display
  readonly mode: ModeChoice;
  /** Mode option (ocean depth): sea life drifts in while a session is paused. */
  readonly oceanLife: boolean;
  /** Mode option (ocean depth and height): random landmarks on the results' profile. */
  readonly resultsLandmarks: boolean;
  // Appearance
  readonly theme: ThemeId;
  /** The theme's colours when the user has changed them; null means the preset's own. */
  readonly colors: ThemeColors | null;
  readonly font: FontChoice;
  readonly timeSize: number;
  readonly clockFormat: ClockFormat;
  readonly animationSpeed: AnimationSpeed;
  /** Freezes ambient animation and shows only the time; the system's reduced-motion preference also turns it on. */
  readonly lowPower: boolean;
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
  | { readonly engine: 'secondsDisplay' | 'checkInInterval' | 'pauseLimit' }
  | { readonly site: 'mode' | 'modeOptions' | 'clockFormat' | 'lowPower' | 'notifications' | 'usageCounts' | 'crashReports' };

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
  | ChoiceSetting<'seconds'>
  | RangeSetting<'checkInInterval'>
  | RangeSetting<'pauseLimit'>
  | ChoiceSetting<'mode'>
  | SwitchSetting<'oceanLife'>
  | SwitchSetting<'resultsLandmarks'>
  | ChoiceSetting<'theme'>
  | ColorsSetting<'colors'>
  | ChoiceSetting<'font'>
  | RangeSetting<'timeSize'>
  | ChoiceSetting<'clockFormat'>
  | ChoiceSetting<'animationSpeed'>
  | SwitchSetting<'lowPower'>
  | SwitchSetting<'notifyCheckIns'>
  | SwitchSetting<'notifyPauseLimit'>
  | SwitchSetting<'usageCounts'>
  | SwitchSetting<'crashReports'>;

const { checkInInterval, pauseLimit } = CONFIG.session;
const { timeSizePercent } = CONFIG.settings;

/** Every setting, in the order the panel shows them. */
export const SETTINGS: readonly SettingDeclaration[] = [
  { key: 'seconds', kind: 'choice', category: 'timer', options: SECONDS_DISPLAYS, default: 'blur-away', target: { engine: 'secondsDisplay' } },
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
  { key: 'mode', kind: 'choice', category: 'display', options: MODE_CHOICES, default: 'digits', target: { site: 'mode' } },
  { key: 'oceanLife', kind: 'switch', category: 'display', default: true, target: { site: 'modeOptions' } },
  { key: 'resultsLandmarks', kind: 'switch', category: 'display', default: true, target: { site: 'modeOptions' } },
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
  { key: 'clockFormat', kind: 'choice', category: 'appearance', options: CLOCK_FORMATS, default: 'region', target: { site: 'clockFormat' } },
  { key: 'animationSpeed', kind: 'choice', category: 'appearance', options: ANIMATION_SPEEDS, default: 'normal', target: { css: '--motion-scale' } },
  { key: 'lowPower', kind: 'switch', category: 'appearance', default: false, target: { site: 'lowPower' } },
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
  return { checkInInterval: settings.checkInInterval, pauseLimit: settings.pauseLimit };
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
  for (const setting of SETTINGS) {
    const value = record[setting.key];
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
