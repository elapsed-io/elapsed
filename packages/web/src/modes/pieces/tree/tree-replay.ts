/**
 * The tree's results replay (plan, Display modes > Results replays; the "results: tree" frame): the side-view
 * tree grows from 45 % to full size at 60 focused minutes and goes through the session's seasons (a season every
 * 15 focused minutes, standing still while paused), resting where the session ended.
 *
 * Like every replay it is driven by the results' one progress value: the session's focused minutes so far are a
 * CSS expression of --replay-progress (--tree-focus), and each cluster's presence, its five colours' shares, the
 * snow, the falling and fallen leaves and the tree's size are all derived from it in tree.css, by the same
 * formulas as core's tree.ts. At rest the expression is the session's own focused minutes.
 */

import { BRAND, bindingAt, measureAt, seasonPhase, summarise, yearPhase } from '@stopwatch/core';
import type { TreeLayer } from '@stopwatch/core';
import { html } from '../../../dom.ts';
import { bindingCss } from '../../recipe/binding-css.ts';
import type { ResultsView } from '../../recipe/piece.ts';
import { focusStretches } from '../../shared/replay-timing.ts';
import { treeColours } from './colours.ts';
import { buildTree } from './tree.ts';

const MINUTE_MS = 60_000;

/** Whether the browser can derive the seasons in CSS (mod(), as the headline's count needs). */
function canDerive(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('width', 'calc(mod(7px, 3px))');
}

/**
 * The `scene` results view for the tree: the scene's tree layer (side on, as the "results: tree" frame draws it)
 * growing through the session's seasons, its size the layer's growth binding of the measure.
 */
export const sceneView: ResultsView = async (surface, session, recipe) => {
  const doc = surface.graphic.ownerDocument;
  const view = recipe.results.view;
  const named = new Set(view.type === 'scene' ? view.layers : []);
  const layer = recipe.layers.find((candidate): candidate is TreeLayer => candidate.type === 'tree' && named.has(candidate.id));
  if (layer === undefined) return;
  const summary = summarise(session);
  const minutes = Math.max(summary.elapsedMs / MINUTE_MS, 1 / 60);
  const stretches = focusStretches(session.segments, summary.startedAt);
  const focused = stretches.reduce((sum, { from, to }) => sum + (to - from), 0);
  const drawing = await buildTree(doc, layer.view, BRAND.copy.tree.replay);
  // Each cluster's own centre and season offset, for its formulas.
  for (const cluster of drawing.clusters) {
    const style = (cluster.element as SVGElement).style;
    style.setProperty('--tree-x', `${String(cluster.x)}px`);
    style.setProperty('--tree-y', `${String(cluster.y)}px`);
    style.setProperty('--tree-o', String(cluster.offset));
  }
  const replay = html(doc, 'div', { class: canDerive() ? 'tree-replay' : 'tree-replay tree-replay--still' }, [drawing.element]);
  for (const [name, value] of Object.entries(treeColours(layer))) replay.style.setProperty(name, value);
  // Focused minutes so far: each stretch of focus counted as the replay's time sweeps the session.
  const terms = stretches.map(({ from, to }) => `clamp(0, var(--replay-progress) * ${String(minutes)} - ${String(from)}, ${String(to - from)})`);
  replay.style.setProperty('--tree-focus-replay', terms.length === 0 ? '0' : `calc(${terms.join(' + ')})`);
  // Its size as the replay runs: the growth binding of the measure, the measure being the focused minutes so far.
  const growth = layer.growth ?? 1;
  replay.style.setProperty('--tree-grow-replay', bindingCss(growth, `var(--tree-focus) * ${String(recipe.measure.perMinute)}`));
  // At rest: the season and the size the session ended in, computed here (and by the same formulas in CSS while
  // the replay runs).
  replay.style.setProperty('--tree-g-final', String(yearPhase(seasonPhase(focused * MINUTE_MS))));
  replay.style.setProperty('--tree-grow-final', String(bindingAt(growth, { measure: measureAt(recipe.measure, focused * MINUTE_MS) })));
  surface.graphic.replaceChildren(replay);
};
