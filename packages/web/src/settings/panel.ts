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

import { ANIMATION_SPEEDS, BRAND, CLOCK_FORMATS, CONFIG, declarationOf, FOCUS_HIDES, LEAVE_FULLSCREEN, normaliseHex, resetCategory, SECONDS_DISPLAYS, SETTINGS_CATEGORIES, SETTINGS_COPY, shownMode, STANDARD_MODES, THEME_IDS, withSetting } from '@stopwatch/core';
import type { AnimationSpeed, ClockFormat, FontChoice, ModeChoice, SecondsDisplay, SettingKey, Settings, SettingsCategory, ThemeColors, ThemeId, FocusHide, LeaveFullscreen } from '@stopwatch/core';
import { parseSettingsFile, settingsFile, settingsFileName } from '@stopwatch/core/settings-file';
import 'virtual:tokens/settings.css';
import { html, svg } from '../dom.ts';
import { formatBytes } from '../fonts/font-file.ts';
import { listDownloadedModes, removeDownloadedMode } from '../storage/mode-cache.ts';
import { BUILT_IN_FONTS, OWN_FONT_FAMILY, familyStack, previewFamily } from '../fonts/registry.ts';
import { iconElement } from '../icons/icon-element.ts';
import { motionScale, readMotion } from '../shell/motion.ts';
import { restartInSafeMode } from '../shell/safe-mode.ts';
import { getPreset } from '../theme/presets.ts';
import { presetColors } from './appearance.ts';
import {
  actionButton,
  confirmItem,
  confirmStep,
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
import type * as TestModesModule from './test-modes.ts';
import type { CssEditor } from './css-editor.ts';
import './panel.css';

const copy = SETTINGS_COPY;

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
  /**
   * A flagged visit's test-mode tiles and options (test-modes.ts, test-flag.ts); null on a visit without the flag,
   * which shows only the standard modes and never fetches that module.
   */
  readonly testModes: typeof TestModesModule | null;
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
  /** The system's reduced-motion preference, which also turns low power on. */
  readonly #reducedMotion: MediaQueryList | null;
  readonly #fontTiles = new Map<FontChoice, HTMLButtonElement>();
  #ownTile: HTMLButtonElement | null = null;
  #fontNote: HTMLDivElement | null = null;
  #storageValue: HTMLDivElement | null = null;
  #downloadsGroup: HTMLDivElement | null = null;
  #downloadsList: HTMLDivElement | null = null;
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
  #importConfirm: ReturnType<typeof confirmStep> | null = null;
  /** The last exported file's address, released at the next export. */
  #exportUrl: string | null = null;
  /** Settings open on display, the first category, with display mode at the top (round 2.14). */
  #open: CategoryId | null = 'display';
  /** The panel's own motion while it closes; the panel is gone once it ends. */
  #closing: Animation | null = null;
  #previewsRequested = false;
  #savedAnimation: Animation | null = null;

  constructor(doc: Document, host: PanelHost) {
    this.#doc = doc;
    this.#host = host;
    this.#reducedMotion = doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)') ?? null;

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
      // Pages open in a new tab, so the timer keeps running in view; mail opens the mail app.
      const attrs = (href: string): Record<string, string> => (href.startsWith('mailto:') ? { href } : { href, target: '_blank', rel: 'noopener noreferrer' });
      footer.append(html(doc, 'nav', { class: 'settings__links', attrs: { 'aria-label': copy.linksLabel.replace('{name}', BRAND.name) } }, links.map((link) => html(doc, 'a', { class: 'settings__link', attrs: attrs(link.href) }, [link.label]))));
    }

    // A modal dialog: focus stays inside while it is open (WCAG 2.2: keyboard focus never wanders behind it).
    this.element = html(doc, 'aside', { class: 'settings', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': copy.title, tabindex: '-1' } }, [
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
      } else if (event.key === 'Tab') {
        this.#trapFocus(event);
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

  /** Open, or opening; a panel that is closing no longer counts as shown. */
  get shown(): boolean {
    return !this.element.hidden && this.#closing === null;
  }

  /**
   * The panel's motion (CONFIG.motion.panel; the "settings panel: slides in and out" frame): 24 px in from the
   * right while fading in over 200 ms, easing out; out the same way over 160 ms, easing in. Only the panel moves:
   * the timer beside it is laid out for the open panel before it comes in, and back after it has gone. Durations
   * follow the animation speed; with reduced motion the panel only fades.
   */
  #motion(): { readonly slide: number; readonly inMs: number; readonly outMs: number; readonly easeIn: string; readonly easeOut: string } {
    const { slidePx, inMs, outMs } = CONFIG.motion.panel;
    const scale = motionScale(this.#doc);
    const { easeIn, easeOut } = CONFIG.motion.focus;
    return {
      slide: readMotion(this.#doc).reduced ? 0 : slidePx,
      inMs: inMs * scale,
      outMs: outMs * scale,
      easeIn: `cubic-bezier(${easeIn.join(', ')})`,
      easeOut: `cubic-bezier(${easeOut.join(', ')})`,
    };
  }

  open(): void {
    const closing = this.#closing;
    this.#closing = null;
    closing?.cancel();
    const coming = this.element.hidden || closing !== null;
    this.element.hidden = false;
    // Phones open on the list of categories, each its own page; wide windows keep the last open category.
    if (this.#phone.matches) this.#open = null;
    this.#layout();
    this.#doc.documentElement.dataset['settings'] = 'open';
    this.#refreshOpenCategory();
    this.#fit();
    this.element.focus({ preventScroll: true });
    const motion = this.#motion();
    if (coming && motion.inMs > 0) {
      this.element.animate([{ transform: `translateX(${String(motion.slide)}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: motion.inMs, easing: motion.easeOut });
    }
  }

  /**
   * Opens the panel on one setting (a notice's "change"): its category open, the setting scrolled into view and
   * briefly outlined in the accent colour (the "change opens settings on it" frame).
   */
  openOn(key: SettingKey, changed = false): void {
    this.open();
    // The site has just changed it (a notice's "change"): the panel says so, as after any change.
    if (changed) this.#flashSaved();
    const category = declarationOf(key).category;
    if (this.#open !== category) this.#toggle(category);
    const setting = this.element.querySelector<HTMLElement>(`[data-setting="${key}"]`);
    if (setting === null) return;
    setting.scrollIntoView({ block: 'nearest' });
    // The outline is a CSS animation that fades itself out (panel.css); taken off and put back, it starts again.
    for (const outlined of this.element.querySelectorAll('.setting--highlight')) outlined.classList.remove('setting--highlight');
    setting.getBoundingClientRect();
    setting.classList.add('setting--highlight');
  }

  /** Tab from the last control goes to the first, and Shift+Tab from the first (or the panel itself) to the last. */
  #trapFocus(event: KeyboardEvent): void {
    const focusable = [...this.element.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], [tabindex]')].filter(
      (element) => element.tabIndex >= 0 && !element.hasAttribute('disabled') && element.getClientRects().length > 0,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    const active = this.#doc.activeElement;
    if (event.shiftKey && (active === first || active === this.element)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  hide(): void {
    if (this.element.hidden || this.#closing !== null) return;
    const root = this.#doc.documentElement;
    const gone = (): void => {
      this.#closing = null;
      this.element.hidden = true;
      delete root.dataset['settings'];
    };
    const motion = this.#motion();
    if (motion.outMs <= 0) {
      gone();
      return;
    }
    // Closing: the corner icons are back at once (focus returns to the settings button), while the timer keeps its
    // place beside the panel until the panel has gone.
    root.dataset['settings'] = 'closing';
    for (const animation of this.element.getAnimations()) animation.cancel();
    const closing = this.element.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${String(motion.slide)}px)`, opacity: 0 }], {
      duration: motion.outMs,
      easing: motion.easeIn,
      fill: 'forwards',
    });
    this.#closing = closing;
    void closing.finished.then(
      () => {
        if (this.#closing !== closing) return;
        gone();
        closing.cancel();
      },
      () => undefined,
    );
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
      const whole = SETTINGS_COPY.categories[category.id].name.includes(query);
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
    if (visible('display')) void this.refreshDownloads();
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
        return [this.#modes(), ...this.#modeOptions(), this.#focusView(), this.#downloads()];
      case 'appearance':
        return [this.#themes(), this.#colors(), this.#fonts(), this.#timeSize(), this.#clockFormat(), this.#animationSpeed(), this.#lowPower()];
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
    const row = settingRow(this.#doc, label(this.#doc, copy.seconds.label), control.element, null);
    // A notice's "change" can open settings on it (the seconds tip), outlined as the fullscreen switch is.
    row.dataset['setting'] = 'seconds';
    return {
      element: row,
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
    // The standard modes' tiles; on a flagged visit the test modes' follow, with the line under the tiles that the
    // Release 2 display frame draws.
    const test = this.#host.testModes;
    const shown = (chosen: ModeChoice): ModeChoice => shownMode(chosen, test !== null);
    const grid = html(doc, 'div', { class: 'mode-tiles', attrs: { 'aria-label': copy.mode.label } });
    const standard = STANDARD_MODES.map((value) => ({ value, name: BRAND.copy.modes[value] }));
    const offered = [...standard, ...(test?.MODES ?? []).map((value) => ({ value, name: test?.modeName(value) ?? value }))];
    const tiles = offered.map(({ value, name }) => ({ value, element: html(doc, 'button', { class: 'mode-tile' }, [modePreview(doc, value, test), name]) }));
    grid.append(...tiles.map((tile) => tile.element));
    const update = radioGroup<ModeChoice>(tiles, grid, (value) => {
      this.#set('mode', value);
    });
    update(shown(this.#host.controller.current.mode));
    this.#updates.push((settings) => {
      update(shown(settings.mode));
    });
    const box = html(doc, 'div', { class: 'mode-tiles-box' }, [grid, ...(test === null ? [] : [html(doc, 'div', { class: 'setting__help' }, [test.LINE])])]);
    return { element: settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [copy.mode.label]), [box]), search: searchText(copy.mode.label, ...offered.map((tile) => tile.name)) };
  }

  /**
   * Each test mode's own options box under the tiles, on a flagged visit only (test-modes.ts); none otherwise, as no
   * standard mode has options.
   */
  #modeOptions(): Item[] {
    const test = this.#host.testModes;
    if (test === null) return [];
    const boxes = test.optionsBoxes(this.#doc, {
      set: (key, value) => {
        this.#set(key, value);
      },
      onUpdate: (update) => {
        this.#updates.push(update);
      },
    });
    return [{ element: boxes.element, search: searchText(...boxes.search) }];
  }

  /**
   * The focus view group (the Release 2 display frame): hide controls while focusing, fullscreen when a session
   * starts, and when to leave fullscreen, in a box like the modes' options. Where the page has no fullscreen
   * (iPhones), both fullscreen choices are hidden.
   */
  #focusView(): Item {
    const doc = this.#doc;
    const text = copy.focusView;
    const row = (label: string, control: HTMLElement, help: string | null, key: SettingKey): HTMLDivElement =>
      html(doc, 'div', { class: 'setting', attrs: { 'data-setting': key } }, [
        html(doc, 'div', { class: 'setting__row' }, [html(doc, 'div', { class: 'setting__label', attrs: { 'aria-hidden': 'true' } }, [label]), control]),
        ...(help === null ? [] : [html(doc, 'div', { class: 'setting__help' }, [help])]),
      ]);
    const hides = FOCUS_HIDES.map((value) => ({ value, label: text.hide.options[value] }));
    const hide = segmented<FocusHide>(doc, text.hide.label, hides, (value) => {
      this.#set('focusHide', value);
    });
    const fullscreen = toggle(doc, text.fullscreen.label, (on) => {
      this.#set('fullscreenOnStart', on);
    });
    const leaves = LEAVE_FULLSCREEN.map((value) => ({ value, label: text.leave.options[value] }));
    const leave = segmented<LeaveFullscreen>(doc, text.leave.label, leaves, (value) => {
      this.#set('leaveFullscreen', value);
    });
    this.#updates.push((settings) => {
      hide.update(settings.focusHide);
      fullscreen.update(settings.fullscreenOnStart);
      leave.update(settings.leaveFullscreen);
    });
    const fullscreenRows = [row(text.fullscreen.label, fullscreen.element, text.fullscreen.help, 'fullscreenOnStart'), row(text.leave.label, leave.element, null, 'leaveFullscreen')];
    // iPhones have no page fullscreen.
    const available = doc.fullscreenEnabled && typeof doc.documentElement.requestFullscreen === 'function';
    for (const element of fullscreenRows) element.hidden = !available;
    const group = html(doc, 'div', { class: 'mode-options', attrs: { role: 'group', 'aria-label': text.title } }, [
      html(doc, 'div', { class: 'mode-options__title' }, [text.title]),
      row(text.hide.label, hide.element, text.hide.help, 'focusHide'),
      ...fullscreenRows,
    ]);
    return {
      element: html(doc, 'div', { class: 'settings__item-contents' }, [group]),
      search: searchText(text.title, text.hide.label, text.hide.help, ...hides.map((option) => option.label), ...(available ? [text.fullscreen.label, text.fullscreen.help, text.leave.label, ...leaves.map((option) => option.label)] : [])),
    };
  }

  /**
   * Downloaded modes, as the Release 2 display frame draws them: each with its size and a remove button.
   * The item is a wrapper laid out as its contents, so the list takes no room while nothing is downloaded.
   */
  #downloads(): Item {
    const doc = this.#doc;
    const text = copy.downloadedModes;
    this.#downloadsList = html(doc, 'div', { class: 'downloads' });
    this.#downloadsGroup = settingGroup(doc, html(doc, 'div', { class: 'setting__label' }, [text.label]), [this.#downloadsList, html(doc, 'div', { class: 'setting__help' }, [text.help])]);
    this.#downloadsGroup.hidden = true;
    return { element: html(doc, 'div', { class: 'settings__item-contents' }, [this.#downloadsGroup]), search: searchText(text.label, text.help) };
  }

  /** Lists the modes on this device again (a mode was just cached, or removed). */
  async refreshDownloads(): Promise<void> {
    const view = this.#doc.defaultView;
    const list = this.#downloadsList;
    const group = this.#downloadsGroup;
    if (view === null || list === null || group === null) return;
    // A visit without the flag lists only the standard modes: a test mode downloaded on a flagged visit stays on the
    // device (until it goes unused for 30 days) but appears nowhere.
    const test = this.#host.testModes;
    const order: readonly string[] = [...STANDARD_MODES, ...(test?.MODES ?? [])];
    const modes = (await listDownloadedModes(view, order)).filter((mode) => order.includes(mode.id));
    const doc = this.#doc;
    list.replaceChildren(
      ...modes.map((mode) => {
        const name = (BRAND.copy.modes as Readonly<Record<string, string>>)[mode.id] ?? test?.modeName(mode.id) ?? mode.id;
        const remove = html(doc, 'button', { class: 'downloads__remove', attrs: { type: 'button', 'aria-label': copy.downloadedModes.removeName.replace('{mode}', name) } }, [copy.downloadedModes.remove]);
        remove.addEventListener('click', () => {
          void removeDownloadedMode(view, mode.id).then(() => this.refreshDownloads());
        });
        return html(doc, 'div', { class: 'downloads__row' }, [html(doc, 'div', {}, [name]), html(doc, 'div', { class: 'downloads__end' }, [html(doc, 'div', { class: 'setting__value' }, [formatBytes(mode.bytes)]), remove])]);
      }),
    );
    group.hidden = modes.length === 0;
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
  #animationSpeed(): Item {
    const text = copy.animationSpeed;
    const options = ANIMATION_SPEEDS.map((value) => ({ value, label: text.options[value] }));
    const control = segmented<AnimationSpeed>(this.#doc, text.label, options, (value) => {
      this.#set('animationSpeed', value);
    });
    this.#updates.push((settings) => {
      control.update(settings.animationSpeed);
    });
    return { element: settingRow(this.#doc, label(this.#doc, text.label), control.element, text.help), search: searchText(text.label, text.help, ...options.map((option) => option.label)) };
  }

  /**
   * Low power: on by hand, and also whenever the system asks for reduced motion (plan, Loading and
   * performance). While the system asks, the switch shows on and cannot be turned off here.
   */
  #lowPower(): Item {
    const doc = this.#doc;
    const text = copy.lowPower;
    const control = toggle(doc, text.label, (on) => {
      if (this.#reducedMotion?.matches === true) return;
      this.#set('lowPower', on);
    });
    const show = (settings: Settings): void => {
      const system = this.#reducedMotion?.matches === true;
      control.update(settings.lowPower || system);
      control.element.toggleAttribute('aria-disabled', system);
    };
    this.#updates.push(show);
    this.#reducedMotion?.addEventListener('change', () => {
      show(this.#host.controller.current);
    });
    return { element: settingRow(doc, html(doc, 'div', { class: 'setting__label', attrs: { 'aria-hidden': 'true' } }, [text.label]), control.element, text.help), search: searchText(text.label, text.help) };
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
    const importButton = actionButton(doc, copy.settingsFile.import, 'gray', () => {
      file.click();
    });
    const buttons = html(doc, 'div', { class: 'setting__actions' }, [
      actionButton(doc, copy.settingsFile.export, 'gray', () => {
        this.#export();
      }),
      importButton,
    ]);
    const fileRow = settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [copy.settingsFile.label]), buttons, copy.settingsFile.help);
    this.#fileNote = fileRow.querySelector<HTMLDivElement>('.setting__help');
    this.#fileNote?.setAttribute('aria-live', 'polite');
    fileRow.append(file);
    // A file whose custom CSS would replace this device's asks first, with the same confirm step.
    this.#importConfirm = confirmStep(
      doc,
      { label: copy.settingsFile.label, action: copy.settingsFile.replace, question: copy.settingsFile.replaceQuestion, cancel: copy.cancel },
      fileRow,
      importButton,
    );
    const fileItem = html(doc, 'div', { class: 'setting-confirm' }, [fileRow, this.#importConfirm.element]);

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
    const apply = (): void => {
      controller.importSettings(settings, cleaned.css);
      this.#cssShows(cleaned.css);
      this.#cssMessage(copy.customCss.help);
      this.#fileMessage(copy.settingsFile.help);
      this.#flashSaved();
    };
    // Choosing the file was the asking, unless it would replace custom CSS this device already has.
    if (controller.customCss !== '' && controller.customCss !== cleaned.css && this.#importConfirm !== null) this.#importConfirm.ask(apply);
    else apply();
  }
}

function searchText(...parts: readonly string[]): string {
  return parts.join(' ').toLowerCase();
}

/** The display-mode tiles' small previews, as drawn in the display frame (56 × 32). */
/** The ring tile's tail, from its far end to the head: each arc and its strength (the display frames' own numbers). */
const RING_TILE_TAIL: readonly (readonly [string, string])[] = [
  ['M37.19 8.29 A12 12 0 0 1 38.18 9.64', '0.03'],
  ['M38.06 9.46 A12 12 0 0 1 38.88 10.93', '0.08'],
  ['M38.79 10.74 A12 12 0 0 1 39.41 12.29', '0.15'],
  ['M39.35 12.09 A12 12 0 0 1 39.78 13.71', '0.23'],
  ['M39.74 13.51 A12 12 0 0 1 39.97 15.16', '0.33'],
  ['M39.95 14.95 A12 12 0 0 1 39.98 16.63', '0.44'],
  ['M39.99 16.42 A12 12 0 0 1 39.82 18.08', '0.57'],
  ['M39.85 17.88 A12 12 0 0 1 39.48 19.51', '0.70'],
  ['M39.54 19.31 A12 12 0 0 1 38.96 20.88', '0.84'],
  ['M39.05 20.69 A12 12 0 0 1 38.29 22.18', '1.00'],
];

function modePreview(doc: Document, mode: ModeChoice, test: typeof TestModesModule | null): SVGSVGElement {
  const { previewWidthPx: width, previewHeightPx: height } = CONFIG.design.settings.tiles;
  const root = svg(doc, 'svg', { class: 'mode-tile__preview', width, height, viewBox: `0 0 ${String(width)} ${String(height)}`, fill: 'none', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
  if (mode === 'digits') {
    root.append(svg(doc, 'text', { class: 'mode-tile__digits', x: 28, y: 21, 'text-anchor': 'middle' }, ['00:00']));
  } else if (mode === 'ring') {
    // The ring itself, as both display frames draw its tile: the faint track, a short accent tail fading out
    // toward its far end in ten arcs, and the round head.
    root.append(
      svg(doc, 'circle', { class: 'mode-tile__faint', cx: 28, cy: 16, r: 12, 'stroke-width': 3 }),
      ...RING_TILE_TAIL.map(([d, opacity]) => svg(doc, 'path', { class: 'mode-tile__accent', d, 'stroke-width': 3, 'stroke-opacity': opacity, 'stroke-linecap': 'butt' })),
      svg(doc, 'circle', { class: 'mode-tile__head', cx: 38.39, cy: 22, r: 2.2 }),
    );
  } else if (mode === 'analog') {
    // The Release 2 display frame's analog tile, redrawn as the stopwatch: its crown, the muted dial and its seconds
    // dial, the two accent hands (minutes long and slim, hours short and broad) and the pin.
    root.append(
      svg(doc, 'rect', { class: 'mode-tile__fill', x: 25, y: 0.5, width: 6, height: 3, rx: 1 }),
      svg(doc, 'circle', { class: 'mode-tile__muted', cx: 28, cy: 16, r: 12, 'stroke-width': 1.5 }),
      svg(doc, 'circle', { class: 'mode-tile__muted', cx: 28, cy: 22, r: 3.4, 'stroke-width': 0.8 }),
      svg(doc, 'line', { class: 'mode-tile__accent', x1: 28, y1: 16, x2: 35, y2: 10, 'stroke-width': 1.6 }),
      svg(doc, 'line', { class: 'mode-tile__accent', x1: 28, y1: 16, x2: 24, y2: 12, 'stroke-width': 2.4 }),
      svg(doc, 'circle', { class: 'mode-tile__head', cx: 28, cy: 16, r: 1.6 }),
    );
  } else if (mode !== 'timeline') {
    // A test mode's, from the flagged visit's module.
    test?.drawPreview(root, mode);
  } else {
    root.append(
      svg(doc, 'line', { class: 'mode-tile__muted', x1: 4, y1: 20, x2: 28, y2: 20, 'stroke-width': 2 }),
      svg(doc, 'line', { class: 'mode-tile__faint', x1: 28, y1: 20, x2: 52, y2: 20, 'stroke-width': 2 }),
      ...[8, 16, 24, 32, 40, 48].map((x, index) => svg(doc, 'line', { class: 'mode-tile__muted', x1: x, y1: 20, x2: x, y2: index % 2 === 0 ? 23 : 25, 'stroke-width': 1.5 })),
    );
  }
  return root;
}
