import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config.ts';
import { parseSettingsFile, settingsFile, settingsFileName } from './file.ts';
import { defaultSettings, withSetting } from './schema.ts';

describe('the settings file', () => {
  it('holds every choice and the custom CSS, and reads back the same', () => {
    const settings = withSetting(withSetting(defaultSettings(), 'theme', 'sky'), 'timeSize', 120);
    const text = settingsFile(settings, '.time { color: red }');
    const parsed = parseSettingsFile(text);
    expect(parsed).toEqual({ settings, customCss: '.time { color: red }' });
    expect(JSON.parse(text)).toMatchObject({ app: 'elapsed', kind: 'settings', version: 1 });
    expect(settingsFileName()).toBe('elapsed-settings.json');
  });

  it('reads invalid or missing choices as their defaults, and drops unknown fields', () => {
    const text = JSON.stringify({ app: 'elapsed', kind: 'settings', version: 1, settings: { theme: 'nope', timeSize: 130, extra: '<script>' } });
    const parsed = parseSettingsFile(text);
    expect(parsed).toEqual({ settings: withSetting(defaultSettings(), 'timeSize', 130), customCss: '' });
  });

  it('refuses files of another kind, app or version, and unreadable text', () => {
    for (const text of ['', 'nope', '[]', 'null', '{"app":"other","kind":"settings","version":1}', '{"app":"elapsed","kind":"theme","version":1}', '{"app":"elapsed","kind":"settings","version":2}', '{"app":"elapsed","kind":"settings","version":1,"customCss":3}']) {
      expect(parseSettingsFile(text), text).toBe('not-a-settings-file');
    }
  });

  it('refuses a file or custom CSS over its size limit', () => {
    expect(parseSettingsFile(' '.repeat(CONFIG.device.settingsFileMaxBytes + 1))).toBe('too-large');
    const css = 'a'.repeat(CONFIG.device.customCssMaxBytes + 1);
    expect(parseSettingsFile(JSON.stringify({ app: 'elapsed', kind: 'settings', version: 1, customCss: css }))).toBe('too-large');
  });
});
