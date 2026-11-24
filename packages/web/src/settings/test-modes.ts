/**
 * A flagged visit's part of the settings panel (test-flag.ts): the test modes' tiles (their names and previews, as
 * the Release 2 display frame draws them), the line under the tiles, and each test mode's options box. The app
 * fetches this module with the panel only on a visit opened with the test flag; a visit without it never does, so
 * nothing of the test modes is downloaded or shown.
 */

import { OCEAN_CONFIG, TEST_MODES, TEST_MODES_COPY, TREE_CONFIG, TREE_VIEWS } from '@stopwatch/core';
import type { ModeChoice, Settings, TreeView } from '@stopwatch/core';
import { html, svg } from '../dom.ts';
import { segmented, toggle, uniqueId } from './controls.ts';

const copy = TEST_MODES_COPY;

/** The test modes' tiles follow the standard modes', in this order. */
export const MODES: readonly ModeChoice[] = TEST_MODES;

/** The line under the tiles on a flagged visit. */
export const LINE = copy.line;

/** A test mode's name, for its tile and the downloaded modes list. */
export function modeName(mode: string): string | undefined {
  return (copy.names as Readonly<Record<string, string>>)[mode];
}

/** A test mode's tile preview, as the Release 2 display frame draws it (56 × 32, inside the panel's preview box). */
export function drawPreview(root: SVGSVGElement, mode: ModeChoice): void {
  const doc = root.ownerDocument;
  if (mode === 'ocean') {
    // Water darkening downward, a wave and two bubbles, in the frame's own colours whatever the theme.
    const { top, bottom, wave } = OCEAN_CONFIG.tile;
    const id = uniqueId('ocean-tile');
    root.append(
      svg(doc, 'defs', {}, [
        svg(doc, 'linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, [svg(doc, 'stop', { offset: 0, 'stop-color': top }), svg(doc, 'stop', { offset: 1, 'stop-color': bottom })]),
      ]),
      svg(doc, 'rect', { x: 10, y: 6, width: 36, height: 22, rx: 4, fill: `url(#${id})` }),
      svg(doc, 'path', { d: 'M10 10 q4.5 -3 9 0 t9 0 t9 0 t9 0', stroke: wave, 'stroke-width': 1.5 }),
      svg(doc, 'circle', { cx: 24, cy: 20, r: 1.4, fill: wave }),
      svg(doc, 'circle', { cx: 30, cy: 23, r: 1, fill: wave }),
    );
  } else if (mode === 'height') {
    // A muted mountain, its summit in the text colour, an accent star.
    root.append(
      svg(doc, 'path', { class: 'mode-tile__muted', d: 'M8 27 L22 9 L29 18 L34 13 L48 27 Z', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
      svg(doc, 'path', { class: 'mode-tile__text', d: 'M19.5 12.2 L22 9 L24.6 12.3', 'stroke-width': 1.5 }),
      svg(doc, 'circle', { class: 'mode-tile__head', cx: 42, cy: 7, r: 1.3 }),
    );
  } else if (mode === 'tree') {
    // A trunk and a summer crown in the tree's own colours, on muted ground.
    const { trunk } = TREE_CONFIG.colours;
    const crown = TREE_CONFIG.leaves[2];
    root.append(
      svg(doc, 'line', { x1: 28, y1: 27, x2: 28, y2: 16, stroke: trunk, 'stroke-width': 2.5 }),
      svg(doc, 'circle', { cx: 28, cy: 12, r: 7, fill: crown }),
      svg(doc, 'circle', { cx: 22.5, cy: 15, r: 4.5, fill: crown }),
      svg(doc, 'circle', { cx: 33.5, cy: 15, r: 4.5, fill: crown }),
      svg(doc, 'line', { class: 'mode-tile__muted', x1: 16, y1: 27.5, x2: 40, y2: 27.5, 'stroke-width': 1.5 }),
    );
  } else if (mode === 'interstellar') {
    // An accent sun in a muted orbit, a planet and two stars.
    root.append(
      svg(doc, 'circle', { class: 'mode-tile__head', cx: 28, cy: 16, r: 3 }),
      svg(doc, 'ellipse', { class: 'mode-tile__muted', cx: 28, cy: 16, rx: 16, ry: 8, 'stroke-width': 1.2 }),
      svg(doc, 'circle', { class: 'mode-tile__dot', cx: 43, cy: 18.5, r: 1.6 }),
      svg(doc, 'circle', { class: 'mode-tile__dot', cx: 12, cy: 6, r: 0.9 }),
      svg(doc, 'circle', { class: 'mode-tile__dot', cx: 46, cy: 5, r: 0.7 }),
    );
  }
}

/** What the options boxes need from the panel: to change a setting, and to hear of every change. */
export interface OptionsHost {
  set<K extends 'oceanLife' | 'resultsLandmarks' | 'heightLandmarks' | 'treeView'>(key: K, value: Settings[K]): void;
  onUpdate(update: (settings: Settings) => void): void;
}

/**
 * Each test mode's own options, in its own box under the tiles, as the Release 2 display frame draws "ocean depth
 * options" (owner, changes 3): shown only while that mode is chosen. Ocean depth's ocean life and results landmarks,
 * height's own results landmarks, and the tree's view as a segmented control. Returns the boxes and the words the
 * settings search matches.
 */
export function optionsBoxes(doc: Document, host: OptionsHost): { readonly element: HTMLElement; readonly search: readonly string[] } {
  const text = copy.resultsLandmarks;
  const row = (label: string, control: HTMLElement, help: string | null): HTMLDivElement =>
    html(doc, 'div', { class: 'setting' }, [
      html(doc, 'div', { class: 'setting__row' }, [html(doc, 'div', { class: 'setting__label', attrs: { 'aria-hidden': 'true' } }, [label]), control]),
      ...(help === null ? [] : [html(doc, 'div', { class: 'setting__help' }, [help])]),
    ]);
  const box = (mode: ModeChoice, title: string, rows: readonly HTMLElement[]): HTMLDivElement => {
    const group = html(doc, 'div', { class: 'mode-options', attrs: { role: 'group', 'aria-label': title, 'data-options': mode } }, [html(doc, 'div', { class: 'mode-options__title' }, [title]), ...rows]);
    host.onUpdate((settings) => {
      group.hidden = settings.mode !== mode;
    });
    return group;
  };
  const switchRow = (key: 'oceanLife' | 'resultsLandmarks' | 'heightLandmarks', label: string, help: string): HTMLDivElement => {
    const control = toggle(doc, label, (on) => {
      host.set(key, on);
    });
    host.onUpdate((settings) => {
      control.update(settings[key]);
    });
    return row(label, control.element, help);
  };
  const views = TREE_VIEWS.map((value) => ({ value, label: copy.treeView.options[value] }));
  const view = segmented<TreeView>(doc, copy.treeView.label, views, (value) => {
    host.set('treeView', value);
  });
  host.onUpdate((settings) => {
    view.update(settings.treeView);
  });
  const boxes = [
    box('ocean', copy.modeOptions.ocean, [switchRow('oceanLife', copy.oceanLife.label, copy.oceanLife.help), switchRow('resultsLandmarks', text.label, text.help.ocean)]),
    box('height', copy.modeOptions.height, [switchRow('heightLandmarks', text.label, text.help.height)]),
    box('tree', copy.modeOptions.tree, [row(copy.treeView.label, view.element, null)]),
  ];
  return {
    element: html(doc, 'div', { class: 'settings__item-contents' }, boxes),
    search: [copy.modeOptions.ocean, copy.oceanLife.label, copy.oceanLife.help, text.label, text.help.ocean, copy.modeOptions.height, text.help.height, copy.modeOptions.tree, copy.treeView.label, ...views.map((option) => option.label)],
  };
}
