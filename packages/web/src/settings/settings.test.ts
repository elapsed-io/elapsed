import { describe, expect, it } from 'vitest';
import { CONFIG, defaultSettings, withSetting } from '@stopwatch/core';
import { buildVersion } from '../crash/reporter.ts';
import { checkFontBytes, checkFontSize, fontFormatOf, formatBytes } from '../fonts/font-file.ts';
import { BUILT_IN_FONTS, familyStack, fontEntry, previewFamily } from '../fonts/registry.ts';
import { formatClockTime, formatterFor } from '../shell/clock-time.ts';
import { readFontRecord } from '../storage/media-store.ts';
import { LocalSettingsStore, SETTINGS_KEY } from '../storage/settings-store.ts';
import { appearanceCss, presetColors, themeTokens } from './appearance.ts';
import { formatHoursMinutes, formatMinutes, formatPercent } from './controls.ts';

const MINUTE = 60_000;

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, value),
  };
}

const bytes = (...values: number[]): ArrayBuffer => new Uint8Array([...values, ...new Array<number>(16).fill(0)]).buffer;
const WOFF2 = bytes(0x77, 0x4f, 0x46, 0x32);

describe('the settings store', () => {
  it('stores nothing while every setting is at its default', () => {
    const storage = memoryStorage();
    const store = new LocalSettingsStore(storage, () => undefined);
    expect(store.load()).toEqual(defaultSettings());
    store.save(defaultSettings());
    expect(storage.getItem(SETTINGS_KEY)).toBeNull();
    const changed = withSetting(defaultSettings(), 'theme', 'mint');
    store.save(changed);
    expect(store.load()).toEqual(changed);
    store.save(defaultSettings());
    expect(storage.getItem(SETTINGS_KEY)).toBeNull();
  });

  it('reads damaged settings as far as they are valid', () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_KEY, '{"schema":1,"theme":"plum","timeSize":"huge"}');
    const settings = new LocalSettingsStore(storage, () => undefined).load();
    expect(settings.theme).toBe('plum');
    expect(settings.timeSize).toBe(100);
  });

  it('keeps working in memory where storage is blocked or full', () => {
    const errors: unknown[] = [];
    const full = memoryStorage();
    full.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = new LocalSettingsStore(full, (error) => errors.push(error));
    expect(store.save(withSetting(defaultSettings(), 'theme', 'sky'))).toBe(false);
    expect(errors).toHaveLength(1);
    expect(new LocalSettingsStore(null, () => undefined).load()).toEqual(defaultSettings());
  });
});

describe('your own font file', () => {
  it.each([
    [[0x77, 0x4f, 0x46, 0x32], 'woff2'],
    [[0x77, 0x4f, 0x46, 0x46], 'woff'],
    [[0x00, 0x01, 0x00, 0x00], 'ttf'],
    [[0x74, 0x72, 0x75, 0x65], 'ttf'],
    [[0x4f, 0x54, 0x54, 0x4f], 'otf'],
    [[0x74, 0x74, 0x63, 0x66], null],
    [[0x3c, 0x73, 0x76, 0x67], null],
  ])('is recognised by its first bytes %j as %s', (signature, format) => {
    expect(fontFormatOf(new Uint8Array(bytes(...signature)))).toBe(format);
  });

  it('must be at most 2 MB and not empty', () => {
    expect(checkFontSize(CONFIG.device.ownFontMaxBytes)).toBe(true);
    expect(checkFontSize(CONFIG.device.ownFontMaxBytes + 1)).toBe(false);
    expect(checkFontSize(0)).toBe(false);
    expect(checkFontBytes(new ArrayBuffer(0))).toEqual({ ok: false, problem: 'not-a-font' });
    expect(checkFontBytes(WOFF2)).toEqual({ ok: true, format: 'woff2' });
    expect(checkFontBytes(bytes(0x47, 0x49, 0x46, 0x38))).toEqual({ ok: false, problem: 'not-a-font' });
  });

  it('is checked again when read back from the device', () => {
    expect(readFontRecord({ schema: 1, kind: 'font', format: 'woff2', bytes: WOFF2 })).toEqual({ format: 'woff2', bytes: WOFF2 });
    expect(readFontRecord({ schema: 1, kind: 'font', format: 'ttf', bytes: WOFF2 })).toBeNull();
    expect(readFontRecord({ schema: 1, kind: 'font', format: 'woff2', bytes: WOFF2, name: 'mine.woff2' })).toBeNull();
    expect(readFontRecord({ schema: 2, kind: 'font', format: 'woff2', bytes: WOFF2 })).toBeNull();
    expect(readFontRecord({ schema: 1, kind: 'font', format: 'woff2', bytes: 'd09GMg==' })).toBeNull();
    expect(readFontRecord({ schema: 1, kind: 'font', format: 'woff2', bytes: new ArrayBuffer(CONFIG.device.ownFontMaxBytes + 1) })).toBeNull();
    expect(readFontRecord(null)).toBeNull();
  });

  it('is listed in kilobytes or megabytes', () => {
    expect(formatBytes(188_416)).toBe('184 KB');
    expect(formatBytes(200)).toBe('1 KB');
    expect(formatBytes(CONFIG.device.ownFontMaxBytes)).toBe('2 MB');
    expect(formatBytes(1_700_000)).toBe('1.6 MB');
  });
});

describe('built-in fonts', () => {
  it('are the 13 choices, each with its files and a name preview', () => {
    expect(BUILT_IN_FONTS.map((entry) => entry.id)).toEqual([
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
    ]);
    for (const entry of BUILT_IN_FONTS.slice(1)) {
      expect(entry.faces.length === 1 || entry.faces.length === 3, entry.id).toBe(true);
      expect(entry.preview).not.toBeNull();
      expect(entry.stretch).toBe('100%');
    }
    expect(fontEntry('archivo')).toMatchObject({ family: 'Timer Sans', faces: [], preview: null, stretch: '92%' });
    expect(fontEntry('dm-mono').faces.map((face) => face.weight)).toEqual(['300', '400', '500']);
    expect(fontEntry('inter').faces.map((face) => face.weight)).toEqual(['300 500']);
  });

  it('fall back to the default font for characters they lack', () => {
    expect(familyStack('elapsed-inter')).toBe('"elapsed-inter", "Timer Sans", system-ui, sans-serif');
    expect(familyStack('Timer Sans')).toBe('"Timer Sans", system-ui, sans-serif');
    expect(previewFamily(fontEntry('sora'))).toBe('elapsed-sora-preview');
  });
});

describe('appearance', () => {
  it('puts the theme, font and time size in the theme layer', () => {
    const css = appearanceCss({ settings: withSetting(defaultSettings(), 'timeSize', 150), fontFamily: '"Timer Sans"', fontStretch: '92%' });
    expect(css.startsWith('@layer theme {')).toBe(true);
    expect(css).toContain('--color-background: #0e0f11;');
    expect(css).toContain('--time-scale: 1.5;');
    expect(css).toContain('--font-family: "Timer Sans";');
  });

  it('derives every colour from the user’s three when they changed them', () => {
    const settings = withSetting(defaultSettings(), 'colors', { background: '#ffffff', foreground: '#000000', accent: '#ff0000' });
    expect(themeTokens(settings)).toEqual({ background: '#ffffff', foreground: '#000000', accent: '#ff0000' });
    const css = appearanceCss({ settings, fontFamily: 'x', fontStretch: '100%' });
    expect(css).toContain('--color-scheme: light;');
    expect(css).toContain('--color-end: #e28a86;');
    expect(presetColors(withSetting(defaultSettings(), 'theme', 'paper'))).toEqual({ background: '#f6f5f2', foreground: '#1a1b1e', accent: '#4a9e6c' });
  });
});

describe('control values', () => {
  it('read as the frames write them', () => {
    expect(formatHoursMinutes(120 * MINUTE)).toBe('2h');
    expect(formatHoursMinutes(30 * MINUTE)).toBe('30m');
    expect(formatHoursMinutes(75 * MINUTE)).toBe('1h 15m');
    expect(formatMinutes(60 * MINUTE)).toBe('60m');
    expect(formatPercent(100)).toBe('100%');
  });

  it('show clock times in 12-hour, 24-hour or the region’s format', () => {
    const at = Date.UTC(2026, 10, 16, 14, 2);
    const utc = (format: '12h' | '24h' | 'region', locale: string) => {
      const formatter = formatterFor(format, locale);
      return formatClockTime(at, new Intl.DateTimeFormat(locale, { ...formatter.resolvedOptions(), timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }));
    };
    expect(utc('12h', 'en-GB')).toBe('2:02 pm');
    expect(utc('24h', 'en-US')).toBe('14:02');
    expect(utc('region', 'en-US')).toBe('2:02 pm');
    expect(utc('region', 'en-GB')).toBe('14:02');
  });
});

describe('crash reports', () => {
  it('name the build by the script they are bundled into', () => {
    expect(buildVersion('https://elapsed.io/assets/index-Bu-rRp5K.js')).toBe('index-Bu-rRp5K');
    expect(buildVersion('http://localhost:5173/src/crash/reporter.ts')).toBe('reporter');
  });
});
