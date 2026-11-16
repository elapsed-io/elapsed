/**
 * Tree (plan, Design system > Display modes; the "tree, side view" and "tree, isometric" frames): a year every
 * focused hour, 15 minutes a season, the tree drawn as the canvas draws it through the asset registry, side on
 * or isometric (a mode option), the time 30 px below it.
 *
 * Everything in the drawing that changes with the year is set once, when the mode is shown, as an animation a
 * year long: each leaf cluster's presence and size, each of its five colours' share (the colours are stacked
 * copies added together, so the year only ever changes opacity and transform; core, tree.ts), the snow, the
 * falling and the fallen leaves, and the isometric field's grass. Each is keyframed a minute apart and moves
 * in a second's steps, so the tree changes all the time while the page redraws it at most once a second. The
 * animations run with the session's focused time (set again only if they drift), hold while it is paused, and
 * with low power or reduced motion stand at each minute's start, stepping once a minute.
 *
 * Its replay is the tree growing to full size through the session's seasons (tree-replay.ts), loaded with the
 * results.
 */

import 'virtual:tokens/tree.css';
import './tree.css';
import { BRAND, CONFIG, grassWeights, leafScale, leafState, shares, weather } from '@stopwatch/core';
import type { Session, TimerView, TreeView } from '@stopwatch/core';
import { ART } from '../../art/registry.ts';
import type { ArtCatalog } from '../../art/registry.ts';
import { html, svg } from '../../dom.ts';
import type { DisplayContext, DisplayMode, ReplaySurface } from '../contract.ts';
import { TimeDisplay } from '../shared/time-display.ts';

const TREE = CONFIG.modes.tree;
const MINUTE_MS = 60_000;
const SEASON_MINUTES = TREE.season / MINUTE_MS;
const YEAR_MINUTES = 4 * SEASON_MINUTES;
const YEAR_MS = YEAR_MINUTES * MINUTE_MS;
const DRIFT_MS = 250;

export type Values = Readonly<Record<string, number | string>>;

/**
 * A year of `sample` (a function of the season phase, 0 to 4) as keyframes a minute apart, each minute's change
 * taken in a second's steps. Where a season's edge changes a value at once (the grass), the edge has two
 * keyframes at the same moment; the year's last keyframe is winter's end, so the year starts again at once.
 */
export function yearKeyframes(sample: (phase: number) => Values): Keyframe[] {
  const easing = `steps(${String(TREE.stepsPerMinute)}, end)`;
  const frames: Keyframe[] = [];
  const edge = 1e-9;
  for (let minute = 0; minute <= YEAR_MINUTES; minute += TREE.keyframeMinutes) {
    const offset = minute / YEAR_MINUTES;
    const phase = minute / SEASON_MINUTES;
    const before = minute > 0 ? sample(phase - edge) : null;
    const at = minute < YEAR_MINUTES ? sample(phase) : null;
    if (before !== null && (at === null || Object.keys(before).some((key) => differs(before[key], at[key])))) frames.push({ offset, easing, ...before });
    if (at !== null) frames.push({ offset, easing, ...at });
  }
  return frames;
}

function differs(a: number | string | undefined, b: number | string | undefined): boolean {
  return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 1e-6 : a !== b;
}

/** A cluster's growth about its own centre, as the frames transform it. */
function growth(x: number, y: number, scale: number): string {
  return `translate(${String(x)}px, ${String(y)}px) scale(${String(scale)}) translate(${String(-x)}px, ${String(-y)}px)`;
}

const round = (value: number): number => Math.round(value * 1e5) / 1e5;

/** The drawing, and the parts of it that change with the seasons. */
export interface TreeDrawing {
  readonly element: SVGSVGElement;
  /** Everything but the time's layout: grown as a whole on the results. */
  readonly grow: SVGGElement;
  readonly clusters: readonly { readonly element: Element; readonly stages: readonly Element[]; readonly x: number; readonly y: number; readonly offset: number }[];
  readonly weather: readonly { readonly element: Element; readonly kind: 'snow' | 'fall' | 'ground' }[];
  /** The isometric field's five grass colours. */
  readonly field: readonly Element[];
  readonly view: TreeView;
}

/** The views' catalogs, each loaded only when shown (art/tree). */
const CATALOGS: Readonly<Record<TreeView, () => Promise<{ readonly catalog: ArtCatalog; readonly clusters: readonly (readonly [number, number, number])[]; readonly layers: readonly string[] }>>> = {
  side: async () => {
    const art = await import('../../art/tree/side.ts');
    return { catalog: art.TREE_SIDE, clusters: art.TREE_SIDE_CLUSTERS, layers: art.TREE_SIDE_LAYERS };
  },
  isometric: async () => {
    const art = await import('../../art/tree/iso.ts');
    return { catalog: art.TREE_ISO, clusters: art.TREE_ISO_CLUSTERS, layers: art.TREE_ISO_LAYERS };
  },
};

/** A layer of the drawing: one registry entry drawn in the drawing's own coordinates. */
function layer(doc: Document, key: string, className: string): SVGSVGElement {
  const art = ART.draw(doc, key, `art ${className}`);
  const [x, y, width, height] = ART.resolve(key).viewBox;
  for (const [name, value] of Object.entries({ x, y, width, height })) art.setAttribute(name, String(value));
  return art;
}

/** Each cluster drawn in the five leaf colours, stacked and added together; it grows and fades as a whole. */
function stackClusters(doc: Document, leaves: SVGSVGElement, centres: readonly (readonly [number, number, number])[]): TreeDrawing['clusters'] {
  return [...leaves.children].map((cluster, index) => {
    const [x = 0, y = 0, offset = 0] = centres[index] ?? [];
    const shapes = [...cluster.children];
    const stages = TREE.leaves.map((_, stage) => {
      const group = svg(doc, 'g', { class: `tree__stage tree__stage--${String(stage)}` });
      group.append(...shapes.map((shape) => shape.cloneNode(true)));
      return group;
    });
    cluster.replaceChildren(...stages);
    cluster.classList.add('tree__cluster');
    return { element: cluster, stages, x, y, offset };
  });
}

/** The tree as its frame draws it, in `view`, with the parts the seasons change. */
export async function buildTree(doc: Document, view: TreeView, label: string): Promise<TreeDrawing> {
  const { catalog, clusters: centres, layers } = await CATALOGS[view]();
  if (!catalog.entries.every((entry) => ART.has(entry.key))) ART.register(catalog);
  const prefix = view === 'side' ? 'tree/side-' : 'tree/iso-';
  const box = ART.resolve(`${prefix}leaves`).viewBox;
  const grow = svg(doc, 'g', { class: 'tree__grow' });
  const element = svg(doc, 'svg', { class: 'tree__svg tree-art', viewBox: box.join(' '), role: 'img', 'aria-label': label }, [grow]);
  const weatherLayers: { element: Element; kind: 'snow' | 'fall' | 'ground' }[] = [];
  let clusters: TreeDrawing['clusters'] = [];
  const field: Element[] = [];
  for (const key of layers) {
    const name = key.slice(prefix.length);
    if (name === 'field') {
      // The grass in its five colours, added together like the leaves.
      const group = svg(doc, 'g', { class: 'tree__field' });
      TREE.grass.forEach((_, stage) => {
        const copy = layer(doc, key, `tree__stage tree__stage--${String(stage)}`);
        group.append(copy);
        field.push(copy);
      });
      grow.append(group);
      continue;
    }
    const drawn = layer(doc, key, `tree__layer tree__layer--${name}`);
    grow.append(drawn);
    if (name.startsWith('snow')) weatherLayers.push({ element: drawn, kind: 'snow' });
    if (name === 'fall') weatherLayers.push({ element: drawn, kind: 'fall' });
    if (name === 'ground-leaves') weatherLayers.push({ element: drawn, kind: 'ground' });
    // The leaves go between the snow on the branches and the falling leaves, as the frames draw them.
    if (name === 'snow-branches') {
      const leaves = layer(doc, `${prefix}leaves`, 'tree__layer tree__layer--leaves');
      clusters = stackClusters(doc, leaves, centres);
      grow.append(leaves);
    }
  }
  return { element, grow, clusters, weather: weatherLayers, field, view };
}

/** Each changing part's look at season `phase` (a function the timer samples over a year, the replay over its progress). */
export function seasonParts(drawing: TreeDrawing): { readonly element: Element; readonly at: (phase: number) => Values }[] {
  const parts: { element: Element; at: (phase: number) => Values }[] = [];
  for (const cluster of drawing.clusters) {
    parts.push({
      element: cluster.element,
      at: (phase) => {
        const { presence } = leafState(phase, cluster.offset);
        return { opacity: round(presence), transform: growth(cluster.x, cluster.y, round(leafScale(presence, drawing.view))) };
      },
    });
    cluster.stages.forEach((stage, k) => {
      parts.push({ element: stage, at: (phase) => ({ opacity: round(shares(leafState(phase, cluster.offset).weights)[k] ?? 0) }) });
    });
  }
  for (const { element, kind } of drawing.weather) parts.push({ element, at: (phase) => ({ opacity: round(weather(phase)[kind]) }) });
  drawing.field.forEach((element, k) => {
    parts.push({ element, at: (phase) => ({ opacity: round(shares(grassWeights(phase))[k] ?? 0) }) });
  });
  return parts;
}

type State = 'idle' | 'running' | 'held';

export function createTreeMode(): DisplayMode {
  let root: HTMLElement | null = null;
  let display: TimeDisplay | null = null;
  let context: DisplayContext | null = null;
  let holder: HTMLDivElement | null = null;
  let view: TreeView | null = null;
  let year: Animation[] = [];
  let last: { focusedMs: number; state: State } = { focusedMs: 0, state: 'idle' };

  /** The year's animations at `focusedMs`: running with the session, or standing still. */
  const place = (focusedMs: number, state: State): void => {
    last = { focusedMs, state };
    const stepped = context?.lowPower === true;
    const into = Math.max(0, focusedMs) % YEAR_MS;
    const at = state === 'idle' ? 0 : stepped ? Math.floor(into / MINUTE_MS) * MINUTE_MS : into;
    for (const animation of year) {
      if (state === 'running' && !stepped) {
        if (animation.playState !== 'running' || Math.abs(Number(animation.currentTime) - at) >= DRIFT_MS) animation.currentTime = at;
        if (animation.playState !== 'running') animation.play();
      } else {
        if (animation.playState !== 'paused') animation.pause();
        if (Number(animation.currentTime) !== at) animation.currentTime = at;
      }
    }
  };

  /** Draws the chosen view (again, when the option changes) and sets its year going. */
  const show = (wanted: TreeView): void => {
    if (holder === null || wanted === view) return;
    view = wanted;
    const target = holder;
    for (const animation of year) animation.cancel();
    year = [];
    target.classList.toggle('tree--isometric', wanted === 'isometric');
    void buildTree(target.ownerDocument, wanted, wanted === 'side' ? BRAND.copy.tree.side : BRAND.copy.tree.isometric).then((drawing) => {
      if (holder !== target || view !== wanted) return;
      target.replaceChildren(drawing.element);
      year = seasonParts(drawing).map(({ element, at }) => element.animate(yearKeyframes(at), { duration: YEAR_MS, iterations: Infinity, easing: 'linear' }));
      for (const animation of year) animation.pause();
      place(last.focusedMs, last.state);
    });
  };

  return {
    id: 'tree',
    replayTiming: TREE.replay,
    replayLayout: 'figure',
    mount(element: HTMLElement, displayContext: DisplayContext) {
      root = element;
      context = displayContext;
      view = null;
      year = [];
      const doc = element.ownerDocument;
      const drawing = html(doc, 'div', { class: 'tree__drawing' });
      holder = drawing;
      display = new TimeDisplay(doc, displayContext, (time) => [html(doc, 'div', { class: 'tree' }, [drawing, time])]);
      element.replaceChildren(display.element);
      show(displayContext.options.treeView);
      void doc.fonts.ready.then(() => display?.measure());
    },
    render(view: TimerView) {
      display?.render(view);
      if (context !== null) show(context.options.treeView);
      const state: State = view.status === 'idle' || view.status === 'ended' ? 'idle' : view.status === 'running' && view.checkInDueAt === null ? 'running' : 'held';
      place(view.focusedMs, state);
    },
    async replay(surface: ReplaySurface, session: Session) {
      // The growing tree loads with the results, not with the timer.
      const { drawTreeReplay } = await import('./tree-replay.ts');
      await drawTreeReplay(surface, session);
    },
    relayout() {
      display?.measure();
    },
    unmount() {
      for (const animation of year) animation.cancel();
      year = [];
      root?.replaceChildren();
      root = null;
      display = null;
      context = null;
      holder = null;
      view = null;
    },
  };
}

