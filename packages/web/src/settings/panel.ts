/**
 * The settings panel (plan, Decisions > Interface; Design system > Screens;
 * the five Release 1 settings frames). It opens over the running timer and
 * previews every change live; changes are saved as they are made.
 *
 * - A 440 px panel on the right, with search, collapsible categories (one
 *   open at a time) and the footer. Nothing in it shrinks; the panel scrolls.
 * - Only categories that hold a setting are shown (owner changes, item 5).
 * - Each open category ends with its "reset … settings" button.
 * - A "saved" check appears beside the close button after each change.
 * - On phones the panel fills the screen and each category is its own page,
 *   with a back button.
 *
 * Loaded on first use (plan, Loading and performance > On first use).
 */

import {
  BRAND,
  CLOCK_FORMATS,
  CONFIG,
  MODE_CHOICES,
  SECONDS_DISPLAYS,
  SETTINGS_CATEGORIES,
  THEME_IDS,
  declarationOf,
  normaliseHex,
  resetCategory,
  withSetting,
} from '@stopwatch/core';
import type { ClockFormat, FontChoice, ModeChoice, SecondsDisplay, SettingKey, Settings, SettingsCategory, ThemeColors, ThemeId } from '@stopwatch/core';
import 'virtual:tokens/settings.css';
import { html, svg } from '../dom.ts';
import { formatBytes } from '../fonts/font-file.ts';
import { BUILT_IN_FONTS, OWN_FONT_FAMILY, familyStack, previewFamily } from '../fonts/registry.ts';
import { iconElement } from '../icons/icon-element.ts';
import { getPreset } from '../theme/presets.ts';
import { presetColors } from './appearance.ts';
import {
  formatHoursMinutes,
  formatMinutes,
  formatPercent,
  label,
  radioGroup,
  segmented,
  settingGroup,
  settingRow,
  slider,
  toggle,
  uniqueId,
} from './controls.ts';
import type { SettingsController } from './controller.ts';
import './panel.css';

const copy = BRAND.copy.settings;

export type NotificationAccess = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PanelHost {
  readonly controller: SettingsController;
  /** Closes the panel (the close button, Escape). */
  close(): void;
  /** Asks to show system notifications, only when a notification setting is switched on. */
  requestNotifications(): Promise<NotificationAccess>;
}

interface Item {
  readonly element: HTMLElement;
  /** Lowercase text the search box matches against. */
  readonly search: string;
}

interface Category {
  readonly id: SettingsCategory;
  readonly row: HTMLButtonElement;
  readonly chevron: HTMLSpanElement;
  readonly body: HTMLDivElement;
  readonly items: readonly Item[];
  readonly reset: HTMLButtonElement;
}

export class SettingsPanel {
  readonly element: HTMLElement;
  readonly #doc: Document;
  readonly #host: PanelHost;
  readonly #updates: ((settings: Settings) => void)[] = [];
  readonly #categories: Category[] = [];
  readonly #saved: HTMLDivElement;
  readonly #savedText: Text;
  readonly #search: HTMLInputElement;
  readonly #searchHint: HTMLSpanElement;
  readonly #back: HTMLButtonElement;
  readonly #empty: HTMLDivElement;
  readonly #phone: MediaQueryList;
  readonly #fontTiles = new Map<FontChoice, HTMLButtonElement>();
  #ownTile: HTMLButtonElement | null = null;
  #fontNote: HTMLDivElement | null = null;
  #storageValue: HTMLDivElement | null = null;
  #blocked: HTMLDivElement | null = null;
  #open: SettingsCategory | null = 'timer';
  #previewsRequested = false;
  #savedAnimation: Animation | null = null;

  constructor(doc: Document, host: PanelHost) {
    this.#doc = doc;
    this.#host = host;

    this.#savedText = doc.createTextNode('');
    this.#saved = html(doc, 'div', { class: 'settings__saved', attrs: { role: 'status' } }, [iconElement(doc, 'check', 'settings__saved-icon'), this.#savedText]);
    const close = html(doc, 'button', { class: 'settings__close', attrs: { type: 'button', 'aria-label': copy.close } }, [iconElement(doc, 'close', 'settings__close-icon')]);
    close.addEventListener('click', () => {
      host.close();
    });
    this.#back = html(doc, 'button', { class: 'settings__back', attrs: { type: 'button', 'aria-label': copy.back } }, [iconElement(doc, 'chevronLeft', 'settings__close-icon')]);
    this.#back.addEventListener('click', () => {
      this.#toggle(null);
      this.#categories[0]?.row.focus();
    });
    const header = html(doc, 'div', { class: 'settings__header' }, [
      html(doc, 'div', { class: 'settings__heading' }, [this.#back, html(doc, 'h2', { class: 'settings__title' }, [copy.title])]),
      html(doc, 'div', { class: 'settings__actions' }, [this.#saved, close]),
    ]);

    // The hint is plain text, as the frames draw it, with the field laid over it; it hides while the field holds text.
    this.#search = html(doc, 'input', { class: 'settings__search-input', attrs: { type: 'search', 'aria-label': copy.search, autocomplete: 'off', spellcheck: 'false' } });
    this.#searchHint = html(doc, 'span', { class: 'settings__search-hint', attrs: { 'aria-hidden': 'true' } }, [copy.search]);
    this.#search.addEventListener('input', () => {
      this.#searchHint.hidden = this.#search.value !== '';
      this.#filter();
    });
    const search = html(doc, 'label', { class: 'settings__search' }, [
      iconElement(doc, 'search', 'settings__search-icon'),
      html(doc, 'span', { class: 'settings__search-field' }, [this.#searchHint, this.#search]),
    ]);

    const list = html(doc, 'div', { class: 'settings__categories' });
    for (const id of SETTINGS_CATEGORIES) {
      const category = this.#category(id);
      this.#categories.push(category);
      list.append(category.row, category.body);
    }
    this.#empty = html(doc, 'div', { class: 'settings__empty', attrs: { role: 'status' } });

    const footer = html(doc, 'footer', { class: 'settings__footer' }, [html(doc, 'div', { class: 'settings__note' }, [copy.autosaved])]);
    const all: readonly { readonly label: string; readonly href: string | null }[] = copy.links;
    const links = all.filter((link): link is { readonly label: string; readonly href: string } => link.href !== null);
    if (links.length > 0) {
      footer.append(html(doc, 'nav', { class: 'settings__links' }, links.map((link) => html(doc, 'a', { class: 'settings__link', attrs: { href: link.href } }, [link.label]))));
    }

    this.element = html(doc, 'aside', { class: 'settings', attrs: { role: 'dialog', 'aria-modal': 'false', 'aria-label': copy.title, tabindex: '-1' } }, [
      header,
      search,
      list,
      this.#empty,
      footer,
    ]);
    this.element.hidden = true;
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        host.close();
      }
    });

    const view = doc.defaultView;
    if (view === null) throw new Error('the document has no window');
    this.#phone = view.matchMedia(`(max-width: ${String(CONFIG.design.settings.phoneBelowPx - 0.02)}px)`);
    this.#phone.addEventListener('change', () => {
      this.#layout();
    });

    // Scrolls only when its content is taller than the window (panel.css).
    const overflow = new view.ResizeObserver(() => {
      this.#fit();
    });
    overflow.observe(this.element);
    overflow.observe(list);

    host.controller.subscribe((settings) => {
      this.#show(settings);
    });
    this.#show(host.controller.current);
    this.#layout();
    this.#toggle(this.#open);
  }

  get shown(): boolean {
    return !this.element.hidden;
  }

  open(): void {
    this.element.hidden = false;
    // Phones open on the list of categories, each its own page; wide windows keep the last open category.
    if (this.#phone.matches) this.#open = null;
    this.#layout();
    this.#doc.documentElement.dataset['settings'] = 'open';
    this.#refreshOpenCategory();
    this.#fit();
    this.element.focus({ preventScroll: true });
  }

  hide(): void {
    this.element.hidden = true;
    delete this.#doc.documentElement.dataset['settings'];
  }

  // ---- Changes -----------------------------------------------------------

  #change(next: Settings): void {
    this.#host.controller.change(next);
    this.#flashSaved();
  }

  #set<K extends SettingKey>(key: K, value: Settings[K]): void {
    const current = this.#host.controller.current;
    if (current[key] === value) return;
    this.#change(withSetting(current, key, value));
  }

  #flashSaved(): void {
    if (this.#savedText.data === '') this.#savedText.data = copy.saved;
    this.#savedAnimation?.cancel();
    const animation = this.#saved.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], {
      duration: CONFIG.settings.savedShown,
      fill: 'forwards',
    });
    this.#savedAnimation = animation;
    void animation.finished.then(
      () => {
        if (this.#savedAnimation === animation) this.#savedText.data = '';
      },
      () => undefined,
    );
  }

  #show(settings: Settings): void {
    for (const update of this.#updates) update(settings);
  }

  // ---- Layout ------------------------------------------------------------

  #layout(): void {
    const phone = this.#phone.matches;
    this.element.dataset['layout'] = phone ? 'phone' : 'wide';
    const root = this.#doc.documentElement;
    if (phone) root.dataset['settingsLayout'] = 'phone';
    else delete root.dataset['settingsLayout'];
    this.#toggle(this.#open);
  }

  #fit(): void {
    const panel = this.element;
    if (panel.hidden) return;
    // scrollHeight includes content that overflows whether or not the panel scrolls.
    panel.toggleAttribute('data-overflow', panel.scrollHeight > panel.clientHeight);
  }

  #toggle(id: SettingsCategory | null): void {
    this.#open = id;
    const searching = this.#search.value.trim() !== '';
    const phone = this.#phone.matches;
    for (const category of this.#categories) {
      const matches = category.body.dataset['matches'] === 'true';
      // Searching opens every category with a match; otherwise one category is open at a time.
      const expanded = searching ? matches : category.id === id;
      category.row.setAttribute('aria-expanded', String(expanded));
      category.body.hidden = !expanded;
      category.chevron.replaceChildren(iconElement(this.#doc, expanded ? 'chevronDown' : 'chevronRight', 'settings__chevron'));
      // Phones: an open category is its own page.
      category.row.hidden = searching ? !matches : phone && id !== null && category.id !== id;
    }
    this.#back.hidden = !phone || id === null || searching;
    this.#refreshOpenCategory();
    this.#fit();
  }

  #filter(): void {
    const query = this.#search.value.trim().toLowerCase();
    let any = false;
    for (const category of this.#categories) {
      if (query === '') {
        delete category.body.dataset['matches'];
        for (const item of category.items) item.element.hidden = false;
        category.reset.hidden = false;
        continue;
      }
      const whole = BRAND.copy.settings.categories[category.id].name.includes(query);
      let matches = false;
      for (const item of category.items) {
        const hit = whole || item.search.includes(query);
        item.element.hidden = !hit;
        matches ||= hit;
      }
      category.reset.hidden = !matches;
      category.body.dataset['matches'] = String(matches);
      any ||= matches;
    }
    this.#empty.textContent = query !== '' && !any ? copy.noMatches : '';
    this.#empty.hidden = query === '' || any;
    this.#toggle(this.#open);
  }

  /** What a category shows only once it is open: font previews, the storage list, the font tile. */
  #refreshOpenCategory(): void {
    if (this.element.hidden) return;
    const visible = (id: SettingsCategory): boolean => this.#categories.some((category) => category.id === id && !category.body.hidden);
    if (visible('appearance')) {
      this.#requestPreviews();
      void this.#refreshOwnTile();
    }
    if (visible('privacy')) void this.#refreshStorage();
  }

  // ---- Categories --------------------------------------------------------

  #category(id: SettingsCategory): Category {
    const doc = this.#doc;
    const names = copy.categories[id];
    const bodyId = uniqueId('settings-category');
    const chevron = html(doc, 'span', { class: 'settings__chevron-box', attrs: { 'aria-hidden': 'true' } });
    const row = html(doc, 'button', { class: 'settings__row', attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': bodyId } }, [
      html(doc, 'span', {}, [names.name]),
      chevron,
    ]);
    row.addEventListener('click', () => {
      const open = row.getAttribute('aria-expanded') === 'true';
      if (this.#search.value.trim() !== '') {
        // While searching, a row only folds its matches away.
        const body = this.#categories.find((category) => category.id === id)?.body;
        if (body !== undefined) body.hidden = open;
        row.setAttribute('aria-expanded', String(!open));
        return;
      }
      this.#toggle(open ? null : id);
    });
    const items = this.#items(id);
    const reset = html(doc, 'button', { class: 'settings__reset', attrs: { type: 'button' } }, [names.reset]);
    reset.addEventListener('click', () => {
      this.#change(resetCategory(this.#host.controller.current, id));
    });
    const body = html(doc, 'div', { class: 'settings__body', attrs: { id: bodyId, role: 'region', 'aria-label': names.name } }, [
      ...items.map((item) => item.element),
      reset,
    ]);
    body.hidden = true;
    return { id, row, chevron, body, items, reset };
  }

  #items(id: SettingsCategory): Item[] {
    switch (id) {
      case 'timer':
        return [this.#seconds(), this.#rangeItem('checkInInterval', copy.checkIn, formatHoursMinutes), this.#rangeItem('pauseLimit', copy.pauseLimit, formatMinutes), this.#shortcuts()];
      case 'display':
        return [this.#modes()];
      case 'appearance':
        return [this.#themes(), this.#colors(), this.#fonts(), this.#timeSize(), this.#clockFormat()];
      case 'notifications':
        return this.#notifications();
      case 'privacy':
        return this.#privacy();
    }
  }

  // ---- Timer -------------------------------------------------------------

  #seconds(): Item {
    const options = SECONDS_DISPLAYS.map((value) => ({ value, label: copy.seconds.options[value] }));
    const control = segmented<SecondsDisplay>(this.#doc, copy.seconds.label, options, (value) => {
      this.#set('seconds', value);
    });
    this.#updates.push((settings) => {
      control.update(settings.seconds);
    });
    return {
      element: settingRow(this.#doc, label(this.#doc, copy.seconds.label), control.element, null),
      search: searchText(copy.seconds.label, ...options.map((option) => option.label)),
    };
  }

  #rangeItem(key: 'checkInInterval' | 'pauseLimit', text: { readonly label: string; readonly help: string }, format: (value: number) => string): Item {
    const declaration = declarationOf(key);
    const id = uniqueId(`settings-${key}`);
    const helpId = uniqueId('settings-help');
    const control = slider(this.#doc, { id, min: declaration.min, max: declaration.max, step: declaration.step, format, describedBy: helpId }, (value) => {
      this.#set(key, value);
    });
    this.#updates.push((settings) => {
      control.update(settings[key]);
    });
    const element = settingRow(this.#doc, label(this.#doc, text.label, id), control.element, text.help);
    element.querySelector('.setting__help')?.setAttribute('id', helpId);
    return { element, search: searchText(text.label, text.help) };
  }

  #shortcuts(): Item {
    const list = html(this.#doc, 'div', { class: 'shortcuts' }, copy.shortcuts.items.map((item) => html(this.#doc, 'div', {}, [item])));
    return { element: settingRow(this.#doc, html(this.#doc, 'div', { class: 'setting__label' }, [copy.shortcuts.label]), list, null), search: searchText(copy.shortcuts.label, ...copy.shortcuts.items) };
  }

  // ---- Display -----------------------------------------------------------

  #modes(): Item {
    const doc = this.#doc;
    const grid = html(doc, 'div', { class: 'mode-tiles', attrs: { 'aria-label': copy.mode.label } });
    const tiles = MODE_CHOICES.map((value) => ({
      value,
      element: html(doc, 'button', { class: 'mode-tile' }, [modePreview(doc, value), BRAND.copy.modes[value]]),
    }));
    grid.append(...tiles.map((tile) => tile.element));
    const update = radioGroup<ModeChoice>(tiles, grid, (value) => {
      this.#set('mode', value);
    });
    this.#updates.push((settings) => {
      update(settings.mode);
    });
    return { element: settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [copy.mode.label]), [grid]), search: searchText(copy.mode.label, ...MODE_CHOICES.map((value) => BRAND.copy.modes[value])) };
  }

  // ---- Appearance --------------------------------------------------------

  #themes(): Item {
    const doc = this.#doc;
    const grid = html(doc, 'div', { class: 'theme-cards', attrs: { 'aria-label': copy.theme.label } });
    const cards = THEME_IDS.map((value) => {
      const preset = getPreset(value);
      const box = html(doc, 'span', { class: 'theme-card__box' }, [html(doc, 'span', { class: 'theme-card__sample' }, ['01:24']), html(doc, 'span', { class: 'theme-card__bar' })]);
      box.style.setProperty('--card-background', preset.background);
      box.style.setProperty('--card-foreground', preset.foreground);
      box.style.setProperty('--card-accent', preset.accent);
      return { value, element: html(doc, 'button', { class: 'theme-card' }, [box, html(doc, 'span', { class: 'theme-card__name' }, [preset.label])]) };
    });
    grid.append(...cards.map((card) => card.element));
    const update = radioGroup<ThemeId | 'custom'>(cards, grid, (value) => {
      if (value === 'custom') return;
      const current = this.#host.controller.current;
      if (current.theme === value && current.colors === null) return;
      this.#change({ ...current, theme: value, colors: null });
    });
    this.#updates.push((settings) => {
      // A theme whose colours the user changed matches no preset card.
      update(settings.colors === null ? settings.theme : 'custom');
    });
    return { element: settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [copy.theme.label]), [grid]), search: searchText(copy.theme.label, ...THEME_IDS.map((value) => BRAND.copy.themes[value])) };
  }

  #colors(): Item {
    const doc = this.#doc;
    const rows = (['background', 'foreground', 'accent'] as const).map((part) => {
      const name = copy.colors[part];
      const swatch = html(doc, 'span', { class: 'color-row__swatch', attrs: { 'aria-hidden': 'true' } });
      const picker = html(doc, 'input', { class: 'color-row__picker', attrs: { type: 'color', 'aria-label': name } });
      const hex = html(doc, 'input', { class: 'color-row__hex', attrs: { type: 'text', 'aria-label': copy.colors.hex.replace('{name}', name), maxlength: '7', spellcheck: 'false', autocomplete: 'off' } });
      // The value is drawn as plain text, as in the frame; the field over it shows its own text only while editing.
      const hexText = html(doc, 'span', { class: 'color-row__hex-text', attrs: { 'aria-hidden': 'true' } });
      const choose = (value: string): void => {
        const colour = normaliseHex(value);
        if (colour === null) return;
        const current = this.#host.controller.current;
        const base: ThemeColors = current.colors ?? presetColors(current);
        if (base[part] === colour && current.colors !== null) return;
        this.#change({ ...current, colors: { ...base, [part]: colour } });
      };
      picker.addEventListener('input', () => {
        choose(picker.value);
      });
      hex.addEventListener('change', () => {
        choose(hex.value);
        // An unreadable entry returns to the colour in use.
        this.#show(this.#host.controller.current);
      });
      hex.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') hex.blur();
      });
      this.#updates.push((settings) => {
        const colour = (settings.colors ?? presetColors(settings))[part];
        swatch.style.setProperty('--swatch', colour);
        if (picker.value !== colour) picker.value = colour;
        hexText.textContent = colour;
        if (doc.activeElement !== hex) hex.value = colour;
      });
      return html(doc, 'div', { class: 'color-row' }, [
        html(doc, 'div', { class: 'color-row__label', attrs: { 'aria-hidden': 'true' } }, [name]),
        html(doc, 'span', { class: 'color-row__well' }, [swatch, picker]),
        html(doc, 'span', { class: 'color-row__value' }, [hexText, hex]),
      ]);
    });
    return { element: settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [copy.colors.label]), rows), search: searchText(copy.colors.label, copy.colors.background, copy.colors.foreground, copy.colors.accent) };
  }

  #fonts(): Item {
    const doc = this.#doc;
    const grid = html(doc, 'div', { class: 'font-tiles', attrs: { 'aria-label': copy.font.label } });
    const tiles: { value: FontChoice; element: HTMLButtonElement }[] = BUILT_IN_FONTS.map((entry) => {
      const tile = html(doc, 'button', { class: entry.id === 'archivo' ? 'font-tile font-tile--default' : 'font-tile font-tile--loading' }, [entry.label]);
      tile.style.fontFamily = familyStack(previewFamily(entry));
      this.#fontTiles.set(entry.id, tile);
      return { value: entry.id, element: tile };
    });
    const own = html(doc, 'button', { class: 'font-tile font-tile--load' }, [copy.font.loadOwn]);
    this.#ownTile = own;
    tiles.push({ value: 'own', element: own });
    grid.append(...tiles.map((tile) => tile.element));

    const file = html(doc, 'input', { class: 'font-tiles__file', attrs: { type: 'file', accept: '.woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf', tabindex: '-1', 'aria-hidden': 'true' } });
    const update = radioGroup<FontChoice>(tiles, grid, (value, via) => {
      const current = this.#host.controller.current;
      if (value !== 'own') {
        this.#set('font', value);
        return;
      }
      const stored = !own.classList.contains('font-tile--load');
      // Clicked with no file yet, or clicked again once chosen, the tile opens the file picker (to load or replace
      // a file). Arrow keys only move to it, choosing it if a file is there.
      if (via === 'click' && (!stored || current.font === 'own')) file.click();
      else if (stored) this.#set('font', 'own');
    });
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      file.value = '';
      if (chosen === undefined) return;
      void this.#host.controller.loadOwnFont(chosen).then((result) => {
        this.#fontMessage(result === 'loaded' ? null : result);
        if (result === 'loaded') {
          this.#flashSaved();
          void this.#refreshOwnTile();
          void this.#refreshStorage();
        }
      });
    });
    this.#updates.push((settings) => {
      update(settings.font);
    });

    const size = formatBytes(CONFIG.device.ownFontMaxBytes);
    this.#fontNote = html(doc, 'div', { class: 'setting__help', attrs: { 'aria-live': 'polite' } }, [copy.font.note.replace('{size}', size)]);
    return {
      element: settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [copy.font.label]), [grid, this.#fontNote, file]),
      search: searchText(copy.font.label, copy.font.loadOwn, ...BUILT_IN_FONTS.map((entry) => entry.label)),
    };
  }

  #fontMessage(problem: 'too-large' | 'not-a-font' | 'unusable' | null): void {
    if (this.#fontNote === null) return;
    const size = formatBytes(CONFIG.device.ownFontMaxBytes);
    const text = { 'too-large': copy.font.tooLarge, 'not-a-font': copy.font.notFont, unusable: copy.font.unusable }[problem ?? 'too-large'];
    this.#fontNote.textContent = (problem === null ? copy.font.note : text).replace('{size}', size);
  }

  #requestPreviews(): void {
    if (this.#previewsRequested) return;
    this.#previewsRequested = true;
    for (const entry of BUILT_IN_FONTS) {
      const tile = this.#fontTiles.get(entry.id);
      void this.#host.controller.fonts.preview(entry).then(
        () => tile?.classList.remove('font-tile--loading'),
        // Offline before the preview was ever fetched: the name shows in the default font.
        () => tile?.classList.remove('font-tile--loading'),
      );
    }
  }

  async #refreshOwnTile(): Promise<void> {
    const tile = this.#ownTile;
    if (tile === null) return;
    const stored = await this.#host.controller.hasOwnFont();
    tile.classList.toggle('font-tile--load', !stored);
    tile.textContent = stored ? copy.font.own : copy.font.loadOwn;
    if (stored) tile.style.fontFamily = familyStack(OWN_FONT_FAMILY);
    else tile.style.removeProperty('font-family');
  }

  #timeSize(): Item {
    const declaration = declarationOf('timeSize');
    const id = uniqueId('settings-time-size');
    const control = slider(this.#doc, { id, min: declaration.min, max: declaration.max, step: declaration.step, format: formatPercent }, (value) => {
      this.#set('timeSize', value);
    });
    this.#updates.push((settings) => {
      control.update(settings.timeSize);
    });
    return { element: settingRow(this.#doc, label(this.#doc, copy.timeSize.label, id), control.element, null), search: searchText(copy.timeSize.label) };
  }

  #clockFormat(): Item {
    const options = CLOCK_FORMATS.map((value) => ({ value, label: copy.clockFormat.options[value] }));
    const control = segmented<ClockFormat>(this.#doc, copy.clockFormat.label, options, (value) => {
      this.#set('clockFormat', value);
    });
    this.#updates.push((settings) => {
      control.update(settings.clockFormat);
    });
    return { element: settingRow(this.#doc, label(this.#doc, copy.clockFormat.label), control.element, null), search: searchText(copy.clockFormat.label, ...options.map((option) => option.label)) };
  }

  // ---- Notifications -----------------------------------------------------

  #notifications(): Item[] {
    const doc = this.#doc;
    const minutes = String(Math.round(CONFIG.notifications.pauseLimitWarning / 60_000));
    const make = (key: 'notifyCheckIns' | 'notifyPauseLimit', text: { readonly label: string; readonly name: string; readonly help: string }): Item => {
      const help = text.help.replace('{minutes}', minutes);
      const control = toggle(doc, text.name, (on) => {
        if (!on) {
          this.#set(key, false);
          return;
        }
        // Permission is asked for only when a notification is switched on (plan, Survival).
        void this.#host.requestNotifications().then((access) => {
          if (this.#blocked !== null) this.#blocked.hidden = access !== 'denied';
          if (access === 'granted') this.#set(key, true);
        });
      });
      this.#updates.push((settings) => {
        control.update(settings[key]);
      });
      return { element: settingRow(doc, html(doc, 'div', { class: 'setting__label', attrs: { 'aria-hidden': 'true' } }, [text.label]), control.element, help), search: searchText(text.label, text.name, help) };
    };
    this.#blocked = html(doc, 'div', { class: 'setting__help', attrs: { role: 'status' } }, [copy.notificationsBlocked]);
    this.#blocked.hidden = true;
    const note = copy.notificationsNote.replace('{name}', BRAND.name);
    return [
      make('notifyCheckIns', copy.notifyCheckIns),
      make('notifyPauseLimit', copy.notifyPauseLimit),
      { element: html(doc, 'div', { class: 'setting__help' }, [note]), search: searchText(note) },
      { element: this.#blocked, search: '' },
    ];
  }

  // ---- Privacy and data --------------------------------------------------

  #privacy(): Item[] {
    const doc = this.#doc;
    const make = (key: 'usageCounts' | 'crashReports', text: { readonly label: string; readonly help: string }): Item => {
      const control = toggle(doc, text.label, (on) => {
        this.#set(key, on);
      });
      this.#updates.push((settings) => {
        control.update(settings[key]);
      });
      return { element: settingRow(doc, html(doc, 'div', { class: 'setting__label', attrs: { 'aria-hidden': 'true' } }, [text.label]), control.element, text.help), search: searchText(text.label, text.help) };
    };
    this.#storageValue = html(doc, 'div', { class: 'setting__value' }, [copy.storage.none]);
    const clear = html(doc, 'button', { class: 'settings__clear', attrs: { type: 'button' } }, [copy.clear.action]);
    const clearRow = settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [copy.clear.label]), clear, copy.clear.help);
    clear.setAttribute('aria-label', copy.clear.label);
    clear.addEventListener('click', () => {
      void this.#host.controller.clearDeviceData().then(() => {
        this.#flashSaved();
        void this.#refreshOwnTile();
        void this.#refreshStorage();
      });
    });
    return [
      make('usageCounts', copy.usageCounts),
      make('crashReports', copy.crashReports),
      { element: settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [copy.storage.label]), this.#storageValue, null), search: searchText(copy.storage.label) },
      { element: clearRow, search: searchText(copy.clear.label, copy.clear.help) },
    ];
  }

  async #refreshStorage(): Promise<void> {
    const usage = await this.#host.controller.usage();
    if (this.#storageValue === null) return;
    this.#storageValue.textContent = usage.font === null ? copy.storage.none : copy.storage.font.replace('{size}', formatBytes(usage.font));
  }
}

function searchText(...parts: readonly string[]): string {
  return parts.join(' ').toLowerCase();
}

/** The display-mode tiles' small previews, as drawn in the display frame (56 × 32). */
function modePreview(doc: Document, mode: ModeChoice): SVGSVGElement {
  const { previewWidthPx: width, previewHeightPx: height } = CONFIG.design.settings.tiles;
  const root = svg(doc, 'svg', { class: 'mode-tile__preview', width, height, viewBox: `0 0 ${String(width)} ${String(height)}`, fill: 'none', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
  if (mode === 'digits') {
    root.append(svg(doc, 'text', { class: 'mode-tile__digits', x: 28, y: 21, 'text-anchor': 'middle' }, ['00:00']));
  } else if (mode === 'ring') {
    root.append(svg(doc, 'circle', { class: 'mode-tile__faint', cx: 28, cy: 16, r: 12, 'stroke-width': 3 }), svg(doc, 'path', { class: 'mode-tile__accent', d: 'M28 4 A12 12 0 0 1 39.4 19.7', 'stroke-width': 3 }));
  } else {
    root.append(
      svg(doc, 'line', { class: 'mode-tile__muted', x1: 4, y1: 20, x2: 28, y2: 20, 'stroke-width': 2 }),
      svg(doc, 'line', { class: 'mode-tile__faint', x1: 28, y1: 20, x2: 52, y2: 20, 'stroke-width': 2 }),
      ...[8, 16, 24, 32, 40, 48].map((x, index) => svg(doc, 'line', { class: 'mode-tile__muted', x1: x, y1: 20, x2: x, y2: index % 2 === 0 ? 23 : 25, 'stroke-width': 1.5 })),
    );
  }
  return root;
}
