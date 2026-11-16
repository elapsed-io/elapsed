/**
 * The settings panel's controls, built as the Release 1 settings frames draw
 * them: segmented choices, sliders, switches. Each returns its element and an
 * update function that shows a value without announcing a change, so changes
 * from another tab or a reset show in the panel too.
 *
 * Sliders and switches keep a native control for keyboard and screen reader
 * use; the drawing on top of it is the frame's.
 */

import { html } from '../dom.ts';

export interface Control<T> {
  readonly element: HTMLElement;
  update(value: T): void;
}

let nextId = 0;
export function uniqueId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${String(nextId)}`;
}

/** A row: label on the left, control on the right, optional help below (the frames' setting rows). */
export function settingRow(doc: Document, label: HTMLElement, control: HTMLElement, help: string | null): HTMLDivElement {
  const children: HTMLElement[] = [html(doc, 'div', { class: 'setting__row' }, [label, control])];
  if (help !== null) children.push(html(doc, 'div', { class: 'setting__help' }, [help]));
  return html(doc, 'div', { class: 'setting' }, children);
}

/** A group: label above, content below (theme, theme colors, font, display mode). */
export function settingGroup(doc: Document, label: HTMLElement, content: readonly HTMLElement[]): HTMLDivElement {
  return html(doc, 'div', { class: 'setting setting--group' }, [label, ...content]);
}

export function label(doc: Document, text: string, forId?: string): HTMLLabelElement {
  return html(doc, 'label', { class: 'setting__label', attrs: forId === undefined ? {} : { for: forId } }, [text]);
}

/** A radio group whose options are buttons; arrow keys move between them and choose. */
export function radioGroup<T extends string>(
  options: readonly { readonly value: T; readonly element: HTMLButtonElement }[],
  group: HTMLElement,
  choose: (value: T, via: 'click' | 'key') => void,
): (value: T) => void {
  group.setAttribute('role', 'radiogroup');
  const buttons = options.map((option) => option.element);
  options.forEach(({ value, element }, index) => {
    element.type = 'button';
    element.setAttribute('role', 'radio');
    element.addEventListener('click', () => {
      choose(value, 'click');
    });
    element.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (step === undefined) return;
      event.preventDefault();
      const next = options[(index + step + options.length) % options.length];
      if (next === undefined) return;
      next.element.focus();
      choose(next.value, 'key');
    });
  });
  return (value: T) => {
    for (const { value: own, element } of options) {
      const selected = own === value;
      element.setAttribute('aria-checked', String(selected));
      element.tabIndex = selected ? 0 : -1;
      element.classList.toggle('is-selected', selected);
    }
    // A value outside the options leaves the first one reachable by keyboard.
    if (!options.some((option) => option.value === value) && buttons[0] !== undefined) buttons[0].tabIndex = 0;
  };
}

/** Segmented choice: "blur away / always / never", "12-hour / 24-hour / follow region". */
export function segmented<T extends string>(
  doc: Document,
  name: string,
  options: readonly { readonly value: T; readonly label: string }[],
  choose: (value: T) => void,
): Control<T> {
  const element = html(doc, 'div', { class: 'segmented', attrs: { 'aria-label': name } });
  const buttons = options.map(({ value, label: text }) => ({ value, element: html(doc, 'button', { class: 'segmented__option' }, [text]) }));
  element.append(...buttons.map((button) => button.element));
  const update = radioGroup(buttons, element, choose);
  return { element, update };
}

export interface SliderOptions {
  readonly id: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
  /** The help line, read with the slider. */
  readonly describedBy?: string;
}

/** Slider: min label, 150 px track with fill and thumb, max label, value (the frames' sliders). */
export function slider(doc: Document, options: SliderOptions, choose: (value: number) => void): Control<number> {
  const input = html(doc, 'input', {
    class: 'slider__input',
    attrs: {
      type: 'range',
      id: options.id,
      min: String(options.min),
      max: String(options.max),
      step: String(options.step),
      ...(options.describedBy === undefined ? {} : { 'aria-describedby': options.describedBy }),
    },
  });
  const fill = html(doc, 'div', { class: 'slider__fill' });
  const thumb = html(doc, 'div', { class: 'slider__thumb' });
  const track = html(doc, 'div', { class: 'slider__track' }, [fill, thumb, input]);
  const value = html(doc, 'output', { class: 'slider__value', attrs: { for: options.id } });
  const element = html(doc, 'div', { class: 'slider' }, [
    html(doc, 'div', { class: 'slider__end', attrs: { 'aria-hidden': 'true' } }, [options.format(options.min)]),
    track,
    html(doc, 'div', { class: 'slider__end', attrs: { 'aria-hidden': 'true' } }, [options.format(options.max)]),
    value,
  ]);
  const show = (current: number): void => {
    // Whole percent of the track, rounded up, as the frames draw it: 30 min of 5 to 60 min (45.45 %) is drawn at 46 %.
    const fraction = (current - options.min) / (options.max - options.min);
    track.style.setProperty('--fraction', String(Math.ceil(fraction * 100 - 1e-9) / 100));
    value.textContent = options.format(current);
    input.setAttribute('aria-valuetext', options.format(current));
  };
  input.addEventListener('input', () => {
    const current = Number(input.value);
    show(current);
    choose(current);
  });
  return {
    element,
    update(current) {
      if (Number(input.value) !== current) input.value = String(current);
      show(current);
    },
  };
}

/** Switch: the frames' 32 × 18 toggle. */
export function toggle(doc: Document, name: string, choose: (on: boolean) => void): Control<boolean> {
  const knob = html(doc, 'span', { class: 'toggle__knob' });
  const element = html(doc, 'button', { class: 'toggle', attrs: { type: 'button', role: 'switch', 'aria-label': name, 'aria-checked': 'false' } }, [knob]);
  element.addEventListener('click', () => {
    choose(element.getAttribute('aria-checked') !== 'true');
  });
  return {
    element,
    update(on) {
      element.setAttribute('aria-checked', String(on));
    },
  };
}

/** "2h", "1h 15m", "30m" for the check-in interval. */
export function formatHoursMinutes(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${String(rest)}m`;
  return rest === 0 ? `${String(hours)}h` : `${String(hours)}h ${String(rest)}m`;
}

/** "30m", "60m" for the pause limit, as the timer frame writes it. */
export function formatMinutes(ms: number): string {
  return `${String(Math.round(ms / 60_000))}m`;
}

export function formatPercent(value: number): string {
  return `${String(value)}%`;
}

/** One of the panel's small buttons: grey, or the end colour for a destructive action. */
export function actionButton(doc: Document, text: string, tone: 'gray' | 'end', onClick: () => void): HTMLButtonElement {
  const button = html(doc, 'button', { class: tone === 'end' ? 'settings__action settings__action--end' : 'settings__action', attrs: { type: 'button' } }, [text]);
  button.addEventListener('click', onClick);
  return button;
}

export interface ConfirmText {
  readonly label: string;
  /** The button that asks first, and the button that then confirms. */
  readonly action: string;
  readonly question: string;
  readonly cancel: string;
  readonly help: string | null;
}

/**
 * A destructive action with the inline confirm step drawn in the advanced
 * frame (owner changes, item 14): its button turns the row into a bordered
 * box that asks the question, with "cancel" and the action itself. Escape or
 * cancel returns to the row; focus moves into the step and back.
 */
export function confirmItem(doc: Document, text: ConfirmText, onConfirm: () => void): HTMLDivElement {
  const ask = html(doc, 'button', { class: 'settings__action settings__action--end', attrs: { type: 'button', 'aria-label': text.label } }, [text.action]);
  const row = settingRow(doc, html(doc, 'div', { class: 'setting__label' }, [text.label]), ask, text.help);
  const step = confirmStep(doc, text, row, ask);
  ask.addEventListener('click', () => {
    step.ask(onConfirm);
  });
  return html(doc, 'div', { class: 'setting-confirm' }, [row, step.element]);
}

/**
 * The inline confirm step drawn in the advanced frame, standing in for `row` while it asks: the label,
 * the question, cancel and the action. Focus moves to cancel; cancel and Escape step back to `back`
 * without doing anything. Used by every destructive action, and by an import that would replace custom CSS.
 */
export function confirmStep(
  doc: Document,
  text: Omit<ConfirmText, 'help'>,
  row: HTMLElement,
  back: HTMLElement,
): { readonly element: HTMLDivElement; ask(onConfirm: () => void): void } {
  const cancel = html(doc, 'button', { class: 'settings__action', attrs: { type: 'button' } }, [text.cancel]);
  const confirm = html(doc, 'button', { class: 'settings__action settings__action--end', attrs: { type: 'button' } }, [text.action]);
  const questionId = uniqueId('settings-confirm');
  const step = html(doc, 'div', { class: 'confirm', attrs: { role: 'group', 'aria-label': text.label, 'aria-describedby': questionId } }, [
    html(doc, 'div', { class: 'setting__row' }, [html(doc, 'div', { class: 'setting__label' }, [text.label])]),
    html(doc, 'div', { class: 'confirm__question', attrs: { id: questionId } }, [text.question]),
    html(doc, 'div', { class: 'confirm__buttons' }, [cancel, confirm]),
  ]);
  let pending: (() => void) | null = null;
  const show = (asking: boolean): void => {
    row.hidden = asking;
    step.hidden = !asking;
    (asking ? cancel : back).focus();
  };
  cancel.addEventListener('click', () => {
    pending = null;
    show(false);
  });
  confirm.addEventListener('click', () => {
    const act = pending;
    pending = null;
    show(false);
    act?.();
  });
  step.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    pending = null;
    show(false);
  });
  step.hidden = true;
  return {
    element: step,
    ask(onConfirm: () => void): void {
      pending = onConfirm;
      show(true);
    },
  };
}
