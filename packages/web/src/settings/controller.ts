/**
 * The settings in force on this page (core tier: the panel itself loads on
 * first use). It applies every setting the moment it changes, so the panel
 * previews changes live, saves the choices, and tells the site what changed.
 *
 * A change made in another tab arrives through storage and is applied the
 * same way, without saving it again. Effects run before the change is saved,
 * so another tab sees the session's own change (a new display mode) before
 * the setting that caused it, and has nothing left to do.
 */

import { CONFIG, defaultSettings, rulesFrom, serializeSettings } from '@stopwatch/core';
import type { ClockFormat, ModeChoice, RuleSettings, SecondsDisplay, Settings } from '@stopwatch/core';
import { checkFontBytes, checkFontSize } from '../fonts/font-file.ts';
import { FontLoader } from '../fonts/loader.ts';
import { OWN_FONT_FAMILY, familyStack, fontEntry } from '../fonts/registry.ts';
import type { MediaStore, MediaUsage } from '../storage/media-store.ts';
import type { SettingsStore } from '../storage/settings-store.ts';
import { AppearanceSheet } from './appearance.ts';

/** What the site does when a setting changes. */
export interface SettingsEffects {
  seconds(display: SecondsDisplay): void;
  rules(rules: RuleSettings): void;
  mode(id: ModeChoice): void;
  clockFormat(format: ClockFormat): void;
  /** The font in use changed (after it loaded). */
  font(): void;
}

export type OwnFontResult = 'loaded' | 'too-large' | 'not-a-font' | 'unusable';

export interface SettingsControllerOptions {
  readonly doc: Document;
  readonly store: SettingsStore;
  readonly media: MediaStore;
  readonly effects: SettingsEffects;
  readonly onError: (error: unknown) => void;
}

const DEFAULT_STRETCH = `${String(CONFIG.design.type.fontWidth)}%`;

export class SettingsController {
  readonly fonts: FontLoader;
  readonly #doc: Document;
  readonly #store: SettingsStore;
  readonly #media: MediaStore;
  readonly #effects: SettingsEffects;
  readonly #onError: (error: unknown) => void;
  readonly #sheet: AppearanceSheet;
  readonly #listeners = new Set<(settings: Settings) => void>();
  #settings: Settings;
  /** The font stack actually in use: the chosen font once loaded, the default until then. */
  #family = familyStack(fontEntry('archivo').family);
  #stretch = DEFAULT_STRETCH;
  /** Increments with every font change, so a slow load never overrides a later choice. */
  #fontRequest = 0;

  constructor(options: SettingsControllerOptions) {
    this.#doc = options.doc;
    this.#store = options.store;
    this.#media = options.media;
    this.#effects = options.effects;
    this.#onError = options.onError;
    this.fonts = new FontLoader(options.doc);
    this.#sheet = new AppearanceSheet(options.doc);
    this.#settings = this.#store.load();
    this.#applyAppearance();
  }

  get current(): Settings {
    return this.#settings;
  }

  /**
   * Loads the chosen font. At first run the screen stays transparent while it
   * loads, for at most a second (a CSS animation of that length, so no timer),
   * so the time does not appear in one font and jump to another.
   */
  async start(): Promise<void> {
    if (this.#settings.font === 'archivo') return;
    const root = this.#doc.documentElement;
    root.dataset['fontLoading'] = '';
    try {
      await this.#applyFont();
    } finally {
      delete root.dataset['fontLoading'];
    }
  }

  /** Listens for every change, from this page or another tab. */
  subscribe(listener: (settings: Settings) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** A change made on this page: applied, then saved. */
  change(next: Settings): void {
    this.#update(next);
    this.#store.save(next);
  }

  /** A change another tab saved: applied only. */
  external(next: Settings): void {
    this.#update(next);
  }

  /**
   * Checks, loads and keeps the user's own font file, then chooses it. The file
   * stays on this device; settings record only that it is in use.
   */
  async loadOwnFont(file: Blob): Promise<OwnFontResult> {
    if (!checkFontSize(file.size)) return file.size === 0 ? 'not-a-font' : 'too-large';
    const bytes = await file.arrayBuffer();
    const check = checkFontBytes(bytes);
    if (!check.ok) return check.problem;
    try {
      await this.fonts.own(bytes);
    } catch {
      return 'unusable';
    }
    try {
      await this.#media.putFont({ format: check.format, bytes });
    } catch (error) {
      // Still used on this page; it will not be there after a reload.
      this.#onError(error);
    }
    if (this.#settings.font === 'own') void this.#applyFont();
    else this.change({ ...this.#settings, font: 'own' });
    return 'loaded';
  }

  /** Whether the user's own font is stored and readable on this device. */
  async hasOwnFont(): Promise<boolean> {
    try {
      return (await this.#media.getFont()) !== null;
    } catch (error) {
      this.#onError(error);
      return false;
    }
  }

  async usage(): Promise<MediaUsage> {
    try {
      return await this.#media.usage();
    } catch (error) {
      this.#onError(error);
      return { font: null };
    }
  }

  /** Removes every setting, theme and file stored in this browser, and returns to the defaults. */
  async clearDeviceData(): Promise<void> {
    this.#store.clear();
    try {
      await this.#media.clear();
    } catch (error) {
      this.#onError(error);
    }
    this.fonts.dropOwn();
    this.#update(defaultSettings());
  }

  #update(next: Settings): void {
    const previous = this.#settings;
    if (serializeSettings(previous) === serializeSettings(next)) return;
    this.#settings = next;
    if (next.seconds !== previous.seconds) this.#effects.seconds(next.seconds);
    if (next.checkInInterval !== previous.checkInInterval || next.pauseLimit !== previous.pauseLimit) this.#effects.rules(rulesFrom(next));
    if (next.mode !== previous.mode) this.#effects.mode(next.mode);
    if (next.clockFormat !== previous.clockFormat) this.#effects.clockFormat(next.clockFormat);
    this.#applyAppearance();
    if (next.font !== previous.font) void this.#applyFont();
    for (const listener of this.#listeners) listener(next);
  }

  #applyAppearance(): void {
    this.#sheet.apply({ settings: this.#settings, fontFamily: this.#family, fontStretch: this.#stretch });
  }

  async #applyFont(): Promise<void> {
    const request = ++this.#fontRequest;
    const choice = this.#settings.font;
    let family = fontEntry('archivo').family;
    let stretch = DEFAULT_STRETCH;
    try {
      if (choice === 'own') {
        if (!this.fonts.hasOwn) {
          const stored = await this.#media.getFont();
          if (stored !== null) await this.fonts.own(stored.bytes);
        }
        // A missing file (cleared, or never imported on this device) shows the default font.
        if (this.fonts.hasOwn) {
          family = OWN_FONT_FAMILY;
          stretch = '100%';
        }
      } else if (choice !== 'archivo') {
        const entry = fontEntry(choice);
        await this.fonts.load(entry);
        family = entry.family;
        stretch = entry.stretch;
      }
    } catch (error) {
      // Offline before the font was ever downloaded, or a file the browser now refuses.
      this.#onError(error);
    }
    if (request !== this.#fontRequest) return;
    const stack = familyStack(family);
    if (stack === this.#family && stretch === this.#stretch) return;
    this.#family = stack;
    this.#stretch = stretch;
    this.#applyAppearance();
    this.#effects.font();
  }
}
