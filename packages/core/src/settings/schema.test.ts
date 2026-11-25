import { describe, expect, it } from 'vitest';
import { BRAND } from '../brand.ts';
import { CONFIG } from '../config.ts';
import {
  ANIMATION_SPEEDS,
  FONT_CHOICES,
  HIDE_SECONDS,
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
  secondsDisplayFor,
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
      hideSeconds: 'never',
      checkInInterval: 120 * MINUTE,
      pauseLimit: 30 * MINUTE,
      mode: 'digits',
      theme: 'graphite',
      colors: null,
      font: 'archivo',
      timeSize: 100,
      clockFormat: 'system',
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

  it('offers the modes built so far, the eight presets lightest to darkest, and 13 built-in fonts plus your own', () => {
    expect(MODE_CHOICES).toEqual(['digits', 'ring', 'timeline', 'analog', 'ocean', 'height', 'tree', 'interstellar']);
    expect(THEME_IDS).toEqual(['paper', 'mint', 'sand', 'sky', 'forest', 'deep-sea', 'plum', 'graphite']);
    expect(THEME_IDS).toEqual(Object.keys(BRAND.copy.themes));
    expect(FONT_CHOICES).toHaveLength(14);
    expect(FONT_CHOICES).not.toContain('lexend');
    expect(FONT_CHOICES.filter((font) => font !== 'own')).toEqual(Object.keys(BRAND.copy.fonts));
  });

  it('keeps valid fields and resets only the invalid ones', () => {
    const settings = migrateSettings({
      schema: 5,
      hideSeconds: 'right-away',
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
      hideSeconds: 'right-away',
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

  it('migrates leave fullscreen to never where it was never changed (round 2.11): an older record at the old default, end', () => {
    expect(defaultSettings().leaveFullscreen).toBe('never');
    expect(migrateSettings({ schema: 2, leaveFullscreen: 'end', theme: 'sky' })).toMatchObject({ schema: SETTINGS_SCHEMA, leaveFullscreen: 'never', theme: 'sky' });
    expect(migrateSettings({ schema: 1, leaveFullscreen: 'end' }).leaveFullscreen).toBe('never');
    // A choice the person made is kept.
    expect(migrateSettings({ schema: 2, leaveFullscreen: 'pause-or-end' }).leaveFullscreen).toBe('pause-or-end');
    expect(migrateSettings({ schema: 2, leaveFullscreen: 'never' }).leaveFullscreen).toBe('never');
    // From schema 3 on, end is a choice like any other, kept as stored.
    expect(migrateSettings({ schema: 3, leaveFullscreen: 'end' }).leaveFullscreen).toBe('end');
    expect(migrateSettings(JSON.parse(serializeSettings(migrateSettings({ schema: 3, leaveFullscreen: 'end' })))).leaveFullscreen).toBe('end');
  });

  it('migrates schema 1 settings: every choice kept, the new ones at their defaults', () => {
    const stored = { schema: 1, mode: 'ring', theme: 'sky', timeSize: 120, clockFormat: '12h', usageCounts: false };
    const settings = migrateSettings({ ...stored, seconds: 'always' });
    expect(settings).toMatchObject({ ...stored, schema: SETTINGS_SCHEMA, hideSeconds: 'never', animationSpeed: 'normal' });
    expect(SETTINGS_SCHEMA).toBe(5);
    expect(JSON.parse(serializeSettings(settings))).toMatchObject({ schema: 5, animationSpeed: 'normal' });
  });

  it('maps the seconds to "hide seconds after starting" (schema 5): the same screen for the same choice, never-changed ones to the default', () => {
    expect(defaultSettings().hideSeconds).toBe('never');
    expect(declarationOf('hideSeconds')).toMatchObject({ category: 'display', options: ['never', 'blur-away', 'right-away'], default: 'never', target: { engine: 'secondsDisplay' } });
    expect(SETTINGS.map((setting) => setting.key)).not.toContain('seconds');
    // Schema 4: always → never, blur away (then a choice) → blur away, never → right away.
    expect(migrateSettings({ schema: 4, seconds: 'always' }).hideSeconds).toBe('never');
    expect(migrateSettings({ schema: 4, seconds: 'blur-away' }).hideSeconds).toBe('blur-away');
    expect(migrateSettings({ schema: 4, seconds: 'never' }).hideSeconds).toBe('right-away');
    // Older records: blur away was the default there, never changed, so it reads as the new default.
    for (const schema of [1, 2, 3]) {
      expect(migrateSettings({ schema, seconds: 'blur-away', theme: 'sky' })).toMatchObject({ schema: 5, hideSeconds: 'never', theme: 'sky' });
      expect(migrateSettings({ schema, seconds: 'never' }).hideSeconds).toBe('right-away');
      expect(migrateSettings({ schema, seconds: 'always' }).hideSeconds).toBe('never');
    }
    expect(migrateSettings({ seconds: 'blur-away' }).hideSeconds).toBe('never');
    // Anything else reads as the default; from schema 5 on the field is read as itself, and an old one is ignored.
    expect(migrateSettings({ schema: 4, seconds: 'sometimes' }).hideSeconds).toBe('never');
    expect(migrateSettings({ schema: 5, hideSeconds: 'blur-away', seconds: 'never' }).hideSeconds).toBe('blur-away');
    expect(migrateSettings(JSON.parse(serializeSettings(migrateSettings({ schema: 5, hideSeconds: 'right-away' })))).hideSeconds).toBe('right-away');
    expect(serializeSettings(defaultSettings())).not.toContain('"seconds"');
    // The engine's display for each.
    expect(HIDE_SECONDS.map((hide) => secondsDisplayFor(hide))).toEqual(['always', 'blur-away', 'never']);
    // Leave fullscreen's own rule still holds alongside.
    expect(migrateSettings({ schema: 2, seconds: 'blur-away', leaveFullscreen: 'end' })).toMatchObject({ hideSeconds: 'never', leaveFullscreen: 'never' });
  });

  it('reads the removed themes as graphite, "follow region" as system settings, and drops low power (schema 5)', () => {
    expect(migrateSettings({ schema: 4, theme: 'oxblood' }).theme).toBe('graphite');
    expect(migrateSettings({ schema: 4, theme: 'lilac' }).theme).toBe('graphite');
    // Colours of the person's own are kept whatever the theme was.
    expect(migrateSettings({ schema: 4, theme: 'lilac', colors: { background: '#112233', foreground: '#ffffff', accent: '#00ff00' } }).colors).toEqual({ background: '#112233', foreground: '#ffffff', accent: '#00ff00' });
    expect(migrateSettings({ schema: 4, theme: 'mint' }).theme).toBe('mint');
    expect(migrateSettings({ schema: 4, clockFormat: 'region' }).clockFormat).toBe('system');
    expect(migrateSettings({ schema: 4, clockFormat: '12h' }).clockFormat).toBe('12h');
    expect(declarationOf('clockFormat')).toMatchObject({ category: 'timer', options: ['system', '12h', '24h'], default: 'system' });
    const migrated = migrateSettings({ schema: 4, lowPower: true });
    expect(migrated).not.toHaveProperty('lowPower');
    expect(SETTINGS.map((setting) => setting.key)).not.toContain('lowPower');
    // From schema 5 the old ids are simply invalid, so they read as the defaults too.
    expect(migrateSettings({ schema: 5, theme: 'oxblood', clockFormat: 'region' })).toMatchObject({ theme: 'graphite', clockFormat: 'system' });
  });

  it('has animation speed (slower, normal, faster) in appearance', () => {
    expect(declarationOf('animationSpeed')).toMatchObject({ category: 'appearance', options: ['slower', 'normal', 'faster'], default: 'normal', target: { css: '--motion-scale' } });
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
    settings = withSetting(settings, 'hideSeconds', 'right-away');
    const reset = resetCategory(settings, 'appearance');
    expect(reset.theme).toBe('graphite');
    expect(reset.hideSeconds).toBe('right-away');
  });

  it('gives the engine its rules', () => {
    const settings = withSetting(withSetting(defaultSettings(), 'checkInInterval', 45 * MINUTE), 'pauseLimit', 5 * MINUTE);
    expect(rulesFrom(settings)).toEqual({ checkIns: true, checkInInterval: 45 * MINUTE, pauseLimit: 5 * MINUTE });
    expect(rulesFrom(withSetting(settings, 'checkIns', false)).checkIns).toBe(false);
  });

  it('declares the Release 2 timer switches, on by default, in the frame\'s order, and picture-in-picture off', () => {
    expect(declarationOf('checkIns')).toMatchObject({ kind: 'switch', category: 'timer', default: true });
    expect(declarationOf('keepAwake')).toMatchObject({ kind: 'switch', category: 'timer', default: true });
    expect(declarationOf('pictureInPicture')).toMatchObject({ kind: 'switch', category: 'display', default: false });
    expect(SETTINGS.filter((setting) => setting.category === 'timer').map((setting) => setting.key)).toEqual(['checkIns', 'checkInInterval', 'pauseLimit', 'keepAwake', 'clockFormat']);
    // Display: the mode and its options, then the focus mode group in the launch frame's order.
    expect(SETTINGS.filter((setting) => setting.category === 'display').map((setting) => setting.key)).toEqual(['mode', 'oceanLife', 'resultsLandmarks', 'heightLandmarks', 'focusHide', 'hideSeconds', 'fullscreenOnStart', 'leaveFullscreen', 'treeView', 'pictureInPicture']);
    expect(SETTINGS.filter((setting) => setting.category === 'appearance').map((setting) => setting.key)).toEqual(['theme', 'colors', 'font', 'timeSize', 'animationSpeed']);
    // Older settings, without the switches, read them at their defaults; a stored choice is kept.
    expect(migrateSettings({ schema: 3, seconds: 'never' })).toMatchObject({ checkIns: true, keepAwake: true, pictureInPicture: false });
    expect(migrateSettings({ schema: 4, checkIns: false, keepAwake: false, pictureInPicture: true })).toMatchObject({ checkIns: false, keepAwake: false, pictureInPicture: true });
    expect(migrateSettings({ schema: 4, checkIns: 'off' }).checkIns).toBe(true);
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
