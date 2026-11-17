import { describe, expect, it } from 'vitest';
import { BRAND } from '../brand.ts';
import { CONFIG } from '../config.ts';
import {
  ANIMATION_SPEEDS,
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
} from './schema.ts';

const MINUTE = 60_000;

describe('settings schema', () => {
  it('declares every setting once, in a Release 1 category', () => {
    const keys = SETTINGS.map((setting) => setting.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const setting of SETTINGS) expect(SETTINGS_CATEGORIES).toContain(setting.category);
    expect(Object.keys(defaultSettings()).sort()).toEqual(['schema', ...keys].sort());
  });

  it('has the plan defaults and ranges', () => {
    const defaults = defaultSettings();
    expect(defaults).toMatchObject({
      seconds: 'blur-away',
      checkInInterval: 120 * MINUTE,
      pauseLimit: 30 * MINUTE,
      mode: 'digits',
      theme: 'graphite',
      colors: null,
      font: 'archivo',
      timeSize: 100,
      clockFormat: 'region',
      notifyCheckIns: false,
      notifyPauseLimit: false,
      usageCounts: true,
      crashReports: false,
    });
    for (const setting of SETTINGS) expect(isValidValue(setting, defaults[setting.key]), setting.key).toBe(true);
    const range = (key: string) => SETTINGS.find((setting) => setting.key === key);
    expect(range('checkInInterval')).toMatchObject({ min: 30 * MINUTE, max: 180 * MINUTE });
    expect(range('pauseLimit')).toMatchObject({ min: 5 * MINUTE, max: 60 * MINUTE });
    expect(range('timeSize')).toMatchObject({ min: 50, max: 150 });
  });

  it('offers the modes built so far, the ten presets, and 13 built-in fonts plus your own', () => {
    expect(MODE_CHOICES).toEqual(['digits', 'ring', 'timeline', 'analog', 'ocean', 'height', 'tree', 'interstellar']);
    expect(THEME_IDS).toEqual(Object.keys(BRAND.copy.themes));
    expect(FONT_CHOICES).toHaveLength(14);
    expect(FONT_CHOICES).not.toContain('lexend');
    expect(FONT_CHOICES.filter((font) => font !== 'own')).toEqual(Object.keys(BRAND.copy.fonts));
  });

  it('keeps valid fields and resets only the invalid ones', () => {
    const settings = migrateSettings({
      schema: 1,
      seconds: 'never',
      checkInInterval: 31 * MINUTE,
      pauseLimit: 10 * MINUTE,
      mode: 'sundial',
      theme: 'plum',
      colors: { background: '#000000', foreground: '#ffffff', accent: 'red' },
      font: 'inter',
      timeSize: 150,
      clockFormat: '24h',
      notifyCheckIns: 'yes',
      usageCounts: false,
      extra: '<script>',
    });
    expect(settings).toMatchObject({
      seconds: 'never',
      checkInInterval: 120 * MINUTE,
      pauseLimit: 10 * MINUTE,
      mode: 'digits',
      theme: 'plum',
      colors: null,
      font: 'inter',
      timeSize: 150,
      clockFormat: '24h',
      notifyCheckIns: false,
      usageCounts: false,
    });
    expect(settings).not.toHaveProperty('extra');
    expect(Object.isFrozen(settings)).toBe(true);
  });

  it('migrates schema 1 settings to schema 2: every choice kept, the new ones at their defaults', () => {
    const stored = { schema: 1, seconds: 'always', mode: 'ring', theme: 'sky', timeSize: 120, clockFormat: '12h', usageCounts: false };
    const settings = migrateSettings(stored);
    expect(settings).toMatchObject({ ...stored, schema: SETTINGS_SCHEMA, animationSpeed: 'normal', lowPower: false });
    expect(SETTINGS_SCHEMA).toBe(2);
    expect(JSON.parse(serializeSettings(settings))).toMatchObject({ schema: 2, animationSpeed: 'normal', lowPower: false });
  });

  it('adds animation speed (slower, normal, faster) and low power to appearance', () => {
    expect(declarationOf('animationSpeed')).toMatchObject({ category: 'appearance', options: ['slower', 'normal', 'faster'], default: 'normal', target: { css: '--motion-scale' } });
    expect(declarationOf('lowPower')).toMatchObject({ category: 'appearance', kind: 'switch', default: false });
    expect(Object.keys(CONFIG.motion.speeds)).toEqual([...ANIMATION_SPEEDS]);
    expect(CONFIG.motion.speeds.normal).toBe(CONFIG.motion.durationScale);
    expect(CONFIG.motion.speeds.slower * CONFIG.motion.speeds.faster).toBeCloseTo(1);
  });

  it.each([null, 'text', 42, [], { colors: { background: '#000', foreground: '#fff', accent: '#0f0', more: 1 } }])(
    'reads %j as the defaults where it says nothing valid',
    (raw) => {
      expect(migrateSettings(raw)).toEqual(defaultSettings());
    },
  );

  it('parses stored text, refusing anything unreadable or oversized', () => {
    const changed = withSetting(defaultSettings(), 'theme', 'sky');
    expect(parseSettings(serializeSettings(changed))).toEqual(changed);
    expect(parseSettings('{not json')).toEqual(defaultSettings());
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings(`{"theme":"sky","pad":"${'x'.repeat(CONFIG.settings.maxStoredChars)}"}`)).toEqual(defaultSettings());
  });

  it('serialises equal settings to the same text whatever their field order', () => {
    const settings = withSetting(defaultSettings(), 'colors', { accent: '#112233', background: '#000000', foreground: '#ffffff' });
    const reordered = migrateSettings(Object.fromEntries(Object.entries(settings).reverse()));
    expect(serializeSettings(reordered)).toBe(serializeSettings(settings));
    expect(serializeSettings(settings)).toContain('"colors":{"background":"#000000","foreground":"#ffffff","accent":"#112233"}');
  });

  it('refuses values the schema does not allow', () => {
    expect(() => withSetting(defaultSettings(), 'timeSize', 51)).toThrow(RangeError);
    expect(() => withSetting(defaultSettings(), 'pauseLimit', 4 * MINUTE)).toThrow(RangeError);
    expect(withSetting(defaultSettings(), 'pauseLimit', 45 * MINUTE).pauseLimit).toBe(45 * MINUTE);
  });

  it('resets one category to its defaults and leaves the others', () => {
    let settings = withSetting(defaultSettings(), 'theme', 'mint');
    settings = withSetting(settings, 'seconds', 'always');
    const reset = resetCategory(settings, 'appearance');
    expect(reset.theme).toBe('graphite');
    expect(reset.seconds).toBe('always');
  });

  it('gives the engine its rules', () => {
    const settings = withSetting(withSetting(defaultSettings(), 'checkInInterval', 45 * MINUTE), 'pauseLimit', 5 * MINUTE);
    expect(rulesFrom(settings)).toEqual({ checkInInterval: 45 * MINUTE, pauseLimit: 5 * MINUTE });
  });

  it.each([
    ['#ABC', '#aabbcc'],
    ['abc', '#aabbcc'],
    [' #0E0F11 ', '#0e0f11'],
    ['0e0f11', '#0e0f11'],
    ['#0e0f1', null],
    ['red', null],
    ['#ggg', null],
  ])('reads %j as the colour %j', (text, expected) => {
    expect(normaliseHex(text)).toBe(expected);
  });
});
