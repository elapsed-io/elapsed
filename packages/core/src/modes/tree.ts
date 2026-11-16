/**
 * Tree (plan, Design system > Display modes; the "tree, side view" and "tree, isometric" frames): one year per
 * focused hour, 15 minutes per season. Leaves grow in spring (#C2DE8E to #86C060), deepen in summer (#3E8B47),
 * turn in autumn (#D9822F to #A9502A) and are all gone by the end of autumn, each cluster offset by up to a
 * quarter season; winter shows snow on the branches and the ground.
 *
 * The frames compute each cluster's colour by mixing the five leaf colours. The site draws each cluster in all
 * five, stacked, and sets how opaque each one above the first is (its weight): the stack shows exactly the
 * frames' mix, and only opacity ever changes (plan, the motion audit). These are the frames' own formulas.
 */

import { CONFIG } from '../config.ts';
import { hex, parseHexColour } from './light.ts';

const TREE = CONFIG.modes.tree;

function smoothstep(x: number): number {
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}

/** The season phase after `focusedMs` of focus: 0 at the start of spring, one more each season, unbounded. */
export function seasonPhase(focusedMs: number): number {
  return Math.max(0, focusedMs) / TREE.season;
}

/** Where in the year `phase` is: 0 to 4, spring to winter. */
export function yearPhase(phase: number): number {
  return ((phase % 4) + 4) % 4;
}

export interface LeafState {
  /** How much of the cluster there is: 0 (bare) to 1, its opacity. */
  readonly presence: number;
  /** The weights of leaf colours 1 to 4 stacked over colour 0 (each an opacity from 0 to 1). */
  readonly weights: readonly [number, number, number, number];
}

/** A cluster's leaves at `phase`, `offset` being the cluster's own (0 to 0.5, from the frames). */
export function leafState(phase: number, offset: number): LeafState {
  const g = yearPhase(phase);
  if (g < 1) return { presence: smoothstep((g - offset * 0.8) / 0.35), weights: [smoothstep(g), 0, 0, 0] };
  if (g < 2) return { presence: 1, weights: [1, smoothstep((g - 1) / 0.4), 0, 0] };
  if (g < 3) {
    const turn = smoothstep((g - 2 - offset * 0.5) / 0.35);
    return { presence: 1 - smoothstep((g - 2.4 - offset * 0.5) / 0.35), weights: [1, 1, turn, smoothstep((g - 2.5) / 0.4)] };
  }
  return { presence: 0, weights: [1, 1, 1, 1] };
}

/** How large a cluster is drawn for its presence: in the side view from 35 %, in the isometric from 30 %. */
export function leafScale(presence: number, view: 'side' | 'isometric'): number {
  return view === 'side' ? 0.35 + 0.65 * presence : 0.3 + 0.7 * presence;
}

/** `a` mixed toward `b` by `t`, each channel rounded, as the frames mix. */
export function mixColour(a: string, b: string, t: number): `#${string}` {
  const [x, y] = [parseHexColour(a), parseHexColour(b)];
  return hex([0, 1, 2].map((i) => Math.round((x[i] ?? 0) + ((y[i] ?? 0) - (x[i] ?? 0)) * t)) as unknown as [number, number, number]);
}

/** A cluster's colour at `phase`, as the frames compute it (their season()). */
export function leafColour(phase: number, offset: number): `#${string}` {
  const [c0, c1, c2, c3, c4] = TREE.leaves;
  const g = yearPhase(phase);
  if (g < 1) return mixColour(c0, c1, smoothstep(g));
  if (g < 2) return mixColour(c1, c2, smoothstep((g - 1) / 0.4));
  if (g < 3) return mixColour(mixColour(c2, c3, smoothstep((g - 2 - offset * 0.5) / 0.35)), c4, smoothstep((g - 2.5) / 0.4));
  return c4;
}

/**
 * The share of each colour in a stack with these weights (colour 0 and then each layer's weight over what is
 * below): five numbers that add up to 1. Drawn as five copies whose opacities are these shares, added together
 * (CSS `mix-blend-mode: plus-lighter` inside an isolated group), they show the stack's colour, and their
 * anti-aliased edges add up to exactly one edge.
 */
export function shares(weights: readonly number[]): number[] {
  const out: number[] = [];
  let rest = 1;
  for (let i = weights.length - 1; i >= 0; i -= 1) {
    const weight = weights[i] ?? 0;
    out.unshift(rest * weight);
    rest *= 1 - weight;
  }
  return [rest, ...out];
}

/** What `weights` stacked over `colours` show, unrounded (the stack's exact colour). */
export function stackedColour(colours: readonly string[], weights: readonly number[]): readonly [number, number, number] {
  let colour = parseHexColour(colours[0] ?? '#000000').map(Number);
  weights.forEach((weight, index) => {
    const over = parseHexColour(colours[index + 1] ?? '#000000');
    colour = colour.map((channel, i) => channel + ((over[i] ?? 0) - channel) * weight);
  });
  return colour as unknown as [number, number, number];
}

export interface Weather {
  /** Snow on the branches and the ground. */
  readonly snow: number;
  /** Leaves falling in the air. */
  readonly fall: number;
  /** Leaves on the ground. */
  readonly ground: number;
}

/** The weather at `phase` (the frames' weather()). */
export function weather(phase: number): Weather {
  const g = yearPhase(phase);
  return {
    snow: smoothstep((g - 3.05) / 0.2) * (1 - smoothstep((g - 3.75) / 0.2)),
    fall: smoothstep((g - 2.4) / 0.15) * (1 - smoothstep((g - 2.95) / 0.08)),
    ground: smoothstep((g - 2.5) / 0.2) * (1 - smoothstep((g - 3.1) / 0.2)),
  };
}

/**
 * The isometric field's grass at `phase`, as weights of grass colours 1 to 4 over colour 0: in spring it mixes
 * from the first to the second; in summer it is the third; in autumn it mixes toward the fourth; in winter it is
 * the fifth. Like the frame, it changes at once where the seasons meet.
 */
export function grassWeights(phase: number): readonly [number, number, number, number] {
  const g = yearPhase(phase);
  if (g < 1) return [g, 0, 0, 0];
  if (g < 2) return [1, 1, 0, 0];
  if (g < 3) return [1, 1, smoothstep((g - 2) / 0.6), 0];
  return [1, 1, 1, 1];
}

/** The grass's colour at `phase`, as the frame computes it. */
export function grassColour(phase: number): `#${string}` {
  const [g0, g1, g2, g3, g4] = TREE.grass;
  const g = yearPhase(phase);
  if (g < 1) return mixColour(g0, g1, g);
  if (g < 2) return g2;
  if (g < 3) return mixColour(g2, g3, smoothstep((g - 2) / 0.6));
  return g4;
}
