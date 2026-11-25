/**
 * The tree frames (canvas version 1794830661-c660): "tree, side view", "tree, isometric" and "results: tree",
 * their own markup (fixtures/tree/*.html, copied from the canvas) with its template values computed by their own
 * formulas (season(), weather(), leaves(), iso()), written out again here so the tests are independent of the
 * site's code. Graphite theme.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GRAPHITE, frameDocument } from './frames.ts';

const template = (name: string): string => readFileSync(fileURLToPath(new URL(`./tree/${name}.html`, import.meta.url)), 'utf8');

const sm = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hx = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number): string => {
  const A = hx(a);
  const B = hx(b);
  return `#${A.map((v, i) => Math.round(v + ((B[i] ?? 0) - v) * t)
    .toString(16)
    .padStart(2, '0')).join('')}`;
};

function season(g0: number, o: number): { col: string; p: number } {
  const g = ((g0 % 4) + 4) % 4;
  if (g < 1) return { p: sm((g - o * 0.8) / 0.35), col: mix('#C2DE8E', '#86C060', sm(g)) };
  if (g < 2) return { p: 1, col: mix('#86C060', '#3E8B47', sm((g - 1) / 0.4)) };
  if (g < 3) {
    const turn = sm((g - 2 - o * 0.5) / 0.35);
    return { col: mix(mix('#3E8B47', '#D9822F', turn), '#A9502A', sm((g - 2.5) / 0.4)), p: 1 - sm((g - 2.4 - o * 0.5) / 0.35) };
  }
  return { p: 0, col: '#A9502A' };
}

function weather(g0: number): Record<string, string> {
  const g = ((g0 % 4) + 4) % 4;
  return {
    snow: (sm((g - 3.05) / 0.2) * (1 - sm((g - 3.75) / 0.2))).toFixed(3),
    fall: (sm((g - 2.4) / 0.15) * (1 - sm((g - 2.95) / 0.08))).toFixed(3),
    ground: (sm((g - 2.5) / 0.2) * (1 - sm((g - 3.1) / 0.2))).toFixed(3),
    grass: g < 1 ? mix('#8DBF5E', '#5FA84A', g) : g < 2 ? '#4E9A45' : g < 3 ? mix('#4E9A45', '#A39A4E', sm((g - 2) / 0.6)) : '#8E9A78',
  };
}

function leaves(f: number, clusters: readonly number[][]): Record<string, string> {
  const out = weather(f);
  clusters.forEach(([x = 0, y = 0, o = 0], k) => {
    const s = season(f, o);
    out[`lb${String(k)}`] = s.col;
    out[`ld${String(k)}`] = mix(s.col, '#000000', 0.28);
    out[`ll${String(k)}`] = mix(s.col, '#FFFFFF', 0.2);
    out[`lo${String(k)}`] = s.p.toFixed(3);
    const sc = (0.35 + 0.65 * s.p).toFixed(3);
    out[`lt${String(k)}`] = `translate(${String(x)} ${String(y)}) scale(${sc}) translate(${String(-x)} ${String(-y)})`;
  });
  return out;
}

function iso(f: number, cubes: readonly number[][]): Record<string, string> {
  const out = weather(f);
  cubes.forEach(([x = 0, y = 0, o = 0], k) => {
    const s = season(f, o);
    out[`ct${String(k)}`] = mix(s.col, '#FFFFFF', 0.22);
    out[`cl${String(k)}`] = s.col;
    out[`cr${String(k)}`] = mix(s.col, '#000000', 0.3);
    out[`qo${String(k)}`] = s.p.toFixed(3);
    const sc = (0.3 + 0.7 * s.p).toFixed(3);
    out[`q${String(k)}`] = `translate(${String(x)} ${String(y)}) scale(${sc}) translate(${String(-x)} ${String(-y)})`;
  });
  out['grassDark'] = mix(out['grass'] ?? '#000000', '#000000', 0.22);
  return out;
}

/** The frames' palette (graphite) and the tree's trunk. */
const C: Record<string, string> = { 'c.bg': GRAPHITE.bg, 'c.text': GRAPHITE.text, 'c.icon': GRAPHITE.icon, 'c.muted': GRAPHITE.muted, 'c.track': GRAPHITE.track, 'c.gray': GRAPHITE.gray, 'c.end': GRAPHITE.end, 'c.trunk': '#6E4636' };

function fill(markup: string, values: Record<string, string>): string {
  return markup.replace(/\{\{([a-zA-Z.]+\d*)\}\}/g, (_, key: string) => {
    const value = values[key] ?? C[key];
    if (value === undefined) throw new Error(`no value for {{${key}}}`);
    return value;
  });
}

/** The clusters' centres and offsets, as the frames' leaves() and iso() list them (fixtures/tree/*.json). */
const read = (name: string): number[][] => JSON.parse(readFileSync(fileURLToPath(new URL(`./tree/${name}.json`, import.meta.url)), 'utf8')) as number[][];

/** The "tree, side view" frame `minutes` focused minutes into a session (the frame's t, at 60× speed). */
export function treeSideFrame(minutes: number): string {
  return frameDocument(fill(template('ModeTree'), { ...leaves(minutes / 15, read('side-clusters')), mm: String(Math.floor(minutes)).padStart(2, '0') }));
}

/** The "tree, isometric" frame `minutes` focused minutes into a session. */
export function treeIsoFrame(minutes: number): string {
  return frameDocument(fill(template('ModeTreeIso'), { ...iso(minutes / 15, read('iso-cubes')), mm: String(Math.floor(minutes)).padStart(2, '0') }));
}

/**
 * The "results: tree" frame once its replay has landed, for a session of `focusMinutes` with the given stats:
 * the tree full grown (or smaller below an hour) in the season the session ended in.
 */
export function resultsTreeFrame(focusMinutes: number, focused: string, stats: readonly string[]): string {
  const [fh = '', fm = '', fs = ''] = focused.split(':');
  let markup = fill(template('ResultsTree'), {
    ...leaves(focusMinutes / 15, read('side-clusters')),
    ov: '0.000',
    co: '1.000',
    cy: '0.0',
    s: (0.45 + 0.55 * Math.min(1, focusMinutes / 60)).toFixed(3),
    fh,
    fm,
    fs,
  });
  // Accounts arrive in Release 3: until then the results draw no account line (as every results fixture).
  markup = markup.replace(/\n<div style="font-size: 12px; color: [^"]*">this session isn’t saved\..*?<\/div>/, '');
  // The frame's sample stats, replaced by the session's own.
  const sample = ['03:05:40', '00:18:22', '2', '01:32:00', '14:02', '17:07'];
  sample.forEach((value, index) => {
    markup = markup.replace(`tabular-nums">${value}</div>`, `tabular-nums">${stats[index] ?? ''}</div>`);
  });
  return frameDocument(markup);
}

