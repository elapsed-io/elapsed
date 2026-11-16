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
 * Loaded on first use (plan, Loading and performance > On first use). The
 * custom CSS editor and its checker load later still, when the advanced
 * category first opens (On choice).
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
import { parseSettingsFile, settingsFile, settingsFileName } from '@stopwatch/core/settings-file';
import 'virtual:tokens/settings.css';
import { html, svg } from '../dom.ts';
import { formatBytes } from '../fonts/font-file.ts';
import { BUILT_IN_FONTS, OWN_FONT_FAMILY, familyStack, previewFamily } from '../fonts/registry.ts';
import { iconElement } from '../icons/icon-element.ts';
import { restartInSafeMode } from '../shell/safe-mode.ts';
import { getPreset } from '../theme/presets.ts';
import { presetColors } from './appearance.ts';
import {
  actionButton,
  confirmItem,
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
import type * as CssEditorModule from './css-editor.ts';
import type { CssEditor } from './css-editor.ts';
import './panel.css';

const copy = BRAND.copy.settings;

/** The schema's categories, then advanced, whose custom CSS lives apart from the choices (owner changes, items 5 and 10). */
type CategoryId = SettingsCategory | 'advanced';
const CATEGORIES: readonly CategoryId[] = [...SETTINGS_CATEGORIES, 'advanced'];

function isSettingsCategory(id: CategoryId): id is SettingsCategory {
  return id !== 'advanced';
}

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
  readonly id: CategoryId;
  readonly row: HTMLButtonElement;
  readonly chevron: HTMLSpanElement;
  readonly body: HTMLDivElement;
  readonly items: readonly Item[];
  /** Advanced has none: "reset all settings" covers it (owner changes, item 13). */
  readonly reset: HTMLButtonElement | null;
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
  /** Custom CSS: the editor's place, its note, and the editor once its code has loaded. */
  #cssSlot: HTMLDivElement | null = null;
  #cssNote: HTMLDivElement | null = null;
  #cssId = '';
  #editorModule: Promise<typeof CssEditorModule> | null = null;
  #editor: CssEditor | null = null;
  /** The stored custom CSS the editor last showed: an editor still holding it has no unsaved changes. */
  #shownCss = '';
  #fileNote: HTMLDivElement | null = null;
  /** The last exported file's address, released at the next export. */
  #exportUrl: string | null = null;
  #open: CategoryId | null = 'timer';
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
    for (const id of CATEGORIES) {
      const category = this.#category(id);
      this.#categories.push(category);
      list.append(category.row, category.body);
    }
    // Shown only while a search finds nothing; hidden, it takes no gap in the panel's column.
    this.#empty = html(doc, 'div', { class: 'settings__empty', attrs: { role: 'status' } });
    this.#empty.hidden = true;

    const footer = html(doc, 'footer', { class: 'settings__footer' }, [html(doc, 'div', { class: 'settings__note' }, [copy.autosaved])]);
    const all: readonly { readonly label: string; readonly href: string | null; readonly shown: boolean }[] = copy.links;
    const links = all.filter((link): link is { readonly label: string; readonly href: string; readonly shown: true } => link.shown && link.href !== null);
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
    host.controller.subscribeCustomCss((css) => {
      // Another tab saved: shown here too, unless this editor holds unsaved changes.
      if (this.#editor !== null && this.#editor.value === this.#shownCss) this.#editor.value = css;
      this.#shownCss = css;
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

  #toggle(id: CategoryId | null): void {
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
        if (category.reset !== null) category.reset.hidden = false;
        continue;
      }
      const whole = BRAND.copy.settings.categories[category.id].name.includes(query);
      let matches = false;
      for (const item of category.items) {
        const hit = whole || item.search.includes(query);
        item.element.hidden = !hit;
        matches ||= hit;
      }
      if (category.reset !== null) category.reset.hidden = !matches;
      category.body.dataset['matches'] = String(matches);
      any ||= matches;
    }
    this.#empty.textContent = query !== '' && !any ? copy.noMatches : '';
    this.#empty.hidden = query === '' || any;
    this.#toggle(this.#open);
  }

  /** What a category shows only once it is open: font previews, the storage list, the font tile, the CSS editor. */
  #refreshOpenCategory(): void {
    if (this.element.hidden) return;
    const visible = (id: CategoryId): boolean => this.#categories.some((category) => category.id === id && !category.body.hidden);
    if (visible('appearance')) {
      this.#requestPreviews();
      void this.#refreshOwnTile();
    }
    if (visible('privacy')) void this.#refreshStorage();
    if (visible('advanced')) void this.#loadEditor().catch(() => undefined);
  }

  // ---- Categories --------------------------------------------------------

  #category(id: CategoryId): Category {
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
    let reset: HTMLButtonElement | null = null;
    if (isSettingsCategory(id) && names.reset !== null) {
      reset = html(doc, 'button', { class: 'settings__reset', attrs: { type: 'button' } }, [names.reset]);
      reset.addEventListener('click', () => {
        this.#change(resetCategory(this.#host.controller.current, id));
      });
    }
    const body = html(doc, 'div', { class: 'settings__body', attrs: { id: bodyId, role: 'region', 'aria-label': names.name } }, [
      ...items.map((item) => item.element),
      ...(reset === null ? [] : [reset]),
    ]);
    body.hidden = true;
    return { id, row, chevron, body, items, reset };
  }

  #items(id: CategoryId): Item[] {
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
      case 'advanced':
        return this.#advanced();
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
    // Asks first, and says plainly that custom CSS, fonts and images go too (owner changes, item 14).
    const clearRow = confirmItem(doc, { ...copy.clear, cancel: copy.cancel }, () => {
      void this.#host.controller.clearDeviceData().then(() => {
        this.#cssShows('');
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

  // ---- Advanced ----------------------------------------------------------

  #advanced(): Item[] {
    const doc = this.#doc;
    const view = doc.defaultView;

    // Custom CSS: the editor and its checker arrive when this category first opens.
    this.#cssId = uniqueId('settings-css');
    this.#cssSlot = html(doc, 'div', { class: 'css-editor-slot' });
    this.#cssNote = html(doc, 'div', { class: 'setting__help', attrs: { 'aria-live': 'polite' } }, [copy.customCss.help]);
    const save = html(doc, 'button', { class: 'settings__save', attrs: { type: 'button' } }, [copy.customCss.save]);
    save.addEventListener('click', () => {
      void this.#saveCss();
    });
    const css = settingGroup(doc, label(doc, copy.customCss.label, this.#cssId), [this.#cssSlot, html(doc, 'div', { class: 'setting__row' }, [this.#cssNote, save])]);

    const safe = actionButton(doc, copy.safeMode.action, 'gray', () => {
      if (view !== null) restartInSafeMode(view);
    });
    const safeItem = settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [copy.safeMode.label]), safe, copy.safeMode.help);

    const file = html(doc, 'input', { class: 'settings__file', attrs: { type: 'file', accept: '.json,application/json', tabindex: '-1', 'aria-hidden': 'true' } });
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      file.value = '';
      if (chosen !== undefined) void this.#import(chosen);
    });
    const buttons = html(doc, 'div', { class: 'setting__actions' }, [
      actionButton(doc, copy.settingsFile.export, 'gray', () => {
        this.#export();
      }),
      actionButton(doc, copy.settingsFile.import, 'gray', () => {
        file.click();
      }),
    ]);
    const fileItem = settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [copy.settingsFile.label]), buttons, copy.settingsFile.help);
    this.#fileNote = fileItem.querySelector<HTMLDivElement>('.setting__help');
    this.#fileNote?.setAttribute('aria-live', 'polite');
    fileItem.append(file);

    const resetAll = confirmItem(doc, { ...copy.resetAll, cancel: copy.cancel, help: null }, () => {
      this.#host.controller.resetAll();
      this.#flashSaved();
    });

    return [
      { element: css, search: searchText(copy.customCss.label, copy.customCss.help) },
      { element: safeItem, search: searchText(copy.safeMode.label, copy.safeMode.action, copy.safeMode.help) },
      { element: fileItem, search: searchText(copy.settingsFile.label, copy.settingsFile.export, copy.settingsFile.import, copy.settingsFile.help) },
      { element: resetAll, search: searchText(copy.resetAll.label) },
    ];
  }

  /** Loads the editor and its checker once, and puts the editor in its place. */
  #loadEditor(): Promise<typeof CssEditorModule> {
    this.#editorModule ??= import('./css-editor.ts').then(
      (module) => {
        const slot = this.#cssSlot;
        if (this.#editor === null && slot !== null) {
          const css = this.#host.controller.customCss;
          this.#editor = new module.CssEditor(this.#doc, { id: this.#cssId, text: css, fonts: this.#host.controller.fonts });
          this.#shownCss = css;
          slot.replaceChildren(this.#editor.element);
        }
        return module;
      },
      (error: unknown) => {
        // Offline before the editor was ever fetched: try again next time the category opens.
        this.#editorModule = null;
        throw error;
      },
    );
    return this.#editorModule;
  }

  /** Puts stored CSS in the editor, replacing what it shows (a change made on this page). */
  #cssShows(css: string): void {
    this.#shownCss = css;
    if (this.#editor !== null) this.#editor.value = css;
  }

  #cssMessage(text: string): void {
    if (this.#cssNote !== null) this.#cssNote.textContent = text;
  }

  /** Cleans the CSS as typed, keeps it, applies it and shows what was kept. */
  async #saveCss(): Promise<void> {
    const module = await this.#loadEditor();
    const editor = this.#editor;
    if (editor === null) return;
    const result = module.cleanCss(editor.value);
    if (!result.ok) {
      this.#cssMessage(copy.customCss.tooLarge.replace('{size}', formatBytes(CONFIG.device.customCssMaxBytes)));
      return;
    }
    this.#host.controller.saveCustomCss(result.css);
    this.#cssShows(result.css);
    this.#cssMessage(result.changed ? copy.customCss.removed : copy.customCss.help);
    this.#flashSaved();
  }

  /** Downloads a settings file: every choice and the custom CSS. Fonts and images are not in it. */
  #export(): void {
    const view = this.#doc.defaultView;
    if (view === null) return;
    const controller = this.#host.controller;
    if (this.#exportUrl !== null) view.URL.revokeObjectURL(this.#exportUrl);
    this.#exportUrl = view.URL.createObjectURL(new view.Blob([settingsFile(controller.current, controller.customCss)], { type: 'application/json' }));
    const link = html(this.#doc, 'a', { class: 'settings__file', attrs: { href: this.#exportUrl, download: settingsFileName() } });
    this.element.append(link);
    link.click();
    link.remove();
  }

  #fileMessage(text: string): void {
    if (this.#fileNote !== null) this.#fileNote.textContent = text;
  }

  /** Reads a settings file. Its choices are validated, its CSS cleaned as if typed and saved; nothing changes on a refusal. */
  async #import(file: File): Promise<void> {
    const limit = CONFIG.device.settingsFileMaxBytes;
    const tooLarge = copy.settingsFile.tooLarge.replace('{size}', formatBytes(limit));
    if (file.size > limit) {
      this.#fileMessage(tooLarge);
      return;
    }
    const parsed = parseSettingsFile(await file.text());
    if (parsed === 'too-large' || parsed === 'not-a-settings-file') {
      this.#fileMessage(parsed === 'too-large' ? tooLarge : copy.settingsFile.notSettings.replace('{name}', BRAND.name));
      return;
    }
    const module = await this.#loadEditor();
    const cleaned = module.cleanCss(parsed.customCss);
    if (!cleaned.ok) {
      this.#fileMessage(tooLarge);
      return;
    }
    const controller = this.#host.controller;
    // Fonts stay on the device they were loaded on: without one here, the font in use is kept.
    const settings = parsed.settings.font === 'own' && !(await controller.hasOwnFont()) ? { ...parsed.settings, font: controller.current.font } : parsed.settings;
    controller.importSettings(settings, cleaned.css);
    this.#cssShows(cleaned.css);
    this.#cssMessage(copy.customCss.help);
    this.#fileMessage(copy.settingsFile.help);
    this.#flashSaved();
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
