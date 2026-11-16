/**
 * The settings file (plan, Settings catalog > Advanced: "a file with your
 * choices and custom CSS; fonts and images stay on the device").
 *
 * Exported as readable JSON with every choice, so a file made today still
 * reads after the schema grows. Reading one trusts nothing: the choices go
 * through the same field-by-field validation as stored settings, and the
 * custom CSS is only size-checked here. The site cleans it with the browser's
 * parser before keeping it, exactly as if it had been typed and saved.
 */

import { BRAND } from '../brand.ts';
import { CONFIG } from '../config.ts';
import { utf8Bytes } from '../utf8.ts';
import { migrateSettings, serializeSettings } from './schema.ts';
import type { Settings } from './schema.ts';

export const SETTINGS_FILE_KIND = 'settings';
export const SETTINGS_FILE_VERSION = 1;

export interface SettingsFileContents {
  readonly settings: Settings;
  /** As written in the file: not yet cleaned. */
  readonly customCss: string;
}

export type SettingsFileProblem = 'too-large' | 'not-a-settings-file';

/** The file's text: every choice and the custom CSS. */
export function settingsFile(settings: Settings, customCss: string): string {
  const contents = {
    app: BRAND.name,
    kind: SETTINGS_FILE_KIND,
    version: SETTINGS_FILE_VERSION,
    settings: JSON.parse(serializeSettings(settings)) as unknown,
    customCss,
  };
  return `${JSON.stringify(contents, null, 2)}\n`;
}

/** A name for the downloaded file. */
export function settingsFileName(): string {
  return `${BRAND.name}-settings.json`;
}

/** Reads a settings file. Missing or invalid choices take their defaults; a file of another kind or version is refused. */
export function parseSettingsFile(text: string): SettingsFileContents | SettingsFileProblem {
  if (utf8Bytes(text) > CONFIG.device.settingsFileMaxBytes) return 'too-large';
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return 'not-a-settings-file';
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return 'not-a-settings-file';
  const record = data as Record<string, unknown>;
  if (record['app'] !== BRAND.name || record['kind'] !== SETTINGS_FILE_KIND || record['version'] !== SETTINGS_FILE_VERSION) return 'not-a-settings-file';
  const customCss = record['customCss'] ?? '';
  if (typeof customCss !== 'string') return 'not-a-settings-file';
  if (utf8Bytes(customCss) > CONFIG.device.customCssMaxBytes) return 'too-large';
  return { settings: migrateSettings(record['settings']), customCss };
}
