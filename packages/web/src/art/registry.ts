/**
 * The asset registry (plan, Architecture invariant 13: "Ambient art ... are
 * referenced by key with placeholder defaults, so final files replace them
 * without code changes. Art is inline SVG whose colours are CSS custom
 * properties, so custom CSS can restyle it. ... Catalogs load only when their
 * mode is used").
 *
 * - A mode declares the keys of the art it draws in its manifest
 *   (modes/manifests.ts); every declared key draws a placeholder until a
 *   catalog registers that key.
 * - A catalog is data, not markup: shapes of a few SVG kinds with a small set
 *   of geometry attributes, checked when registered. It is drawn with the DOM,
 *   never through HTML parsing, so nothing in it can run, load or link (the
 *   CSP's Trusted Types would refuse markup anyway).
 * - Colour is never in the data: each shape names a tone (`data-tone`), and the
 *   mode's stylesheet gives each tone a custom property, which custom CSS can
 *   change.
 * - A mode's catalog is a module its code imports when the mode is shown, so it
 *   loads with the mode and is counted in the mode's art budget by the size
 *   check. Catalogs live with their art's own licence file, apart from the GPL
 *   code (owner, 2026-11-16: art under its own licence).
 */

import { svg } from '../dom.ts';
import './art.css';

export const ART_TAGS = ['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'] as const;
export type ArtTag = (typeof ART_TAGS)[number];

/** Geometry only: no colour, no style, no reference to anything outside the shape. */
const ART_ATTRIBUTES = new Set([
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'width',
  'height',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill-rule',
  'opacity',
]);

/** Numbers, path commands, and the few words geometry needs (rotate, round, evenodd); nothing that could name a URL. */
const ART_VALUE = /^[-\d.,\s()a-zA-Z]*$/;
const FORBIDDEN_VALUE = /url|javascript|data:|expression|var\s*\(/i;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
const TONE = /^[a-z][a-z0-9-]{0,31}$/;

export interface ArtShape {
  readonly tag: ArtTag;
  readonly attrs?: Readonly<Record<string, string | number>>;
  /** Which colour of the mode's palette the shape takes (its stylesheet maps tones to custom properties). */
  readonly tone?: string;
  /** Only for groups. */
  readonly children?: readonly ArtShape[];
}

export interface ArtEntry {
  /** "zone/name", lowercase with hyphens, e.g. "sunlight/sardine-school". */
  readonly key: string;
  readonly viewBox: readonly [number, number, number, number];
  readonly shapes: readonly ArtShape[];
}

export interface ArtCatalog {
  /** The mode the catalog belongs to; it loads only with that mode. */
  readonly mode: string;
  readonly entries: readonly ArtEntry[];
}

export function isArtKey(key: string): boolean {
  return KEY.test(key) && key.length <= 80;
}

function shapeProblems(shape: ArtShape, where: string, depth: number): string[] {
  const problems: string[] = [];
  if (!(ART_TAGS as readonly string[]).includes(shape.tag)) problems.push(`${where}: <${shape.tag}> is not allowed`);
  if (shape.tone !== undefined && !TONE.test(shape.tone)) problems.push(`${where}: tone "${shape.tone}" is not a plain name`);
  for (const [name, value] of Object.entries(shape.attrs ?? {})) {
    if (!ART_ATTRIBUTES.has(name)) problems.push(`${where}: attribute ${name} is not allowed`);
    const text = String(value);
    if (typeof value === 'number' ? !Number.isFinite(value) : !ART_VALUE.test(text) || FORBIDDEN_VALUE.test(text)) problems.push(`${where}: ${name}="${text}" is not plain geometry`);
  }
  if (shape.children !== undefined) {
    if (shape.tag !== 'g') problems.push(`${where}: only a group has children`);
    if (depth >= 4) problems.push(`${where}: groups nest at most four deep`);
    shape.children.forEach((child, index) => problems.push(...shapeProblems(child, `${where}.${String(index)}`, depth + 1)));
  }
  return problems;
}

/** Everything wrong with an entry; empty when it may be drawn. */
export function artProblems(entry: ArtEntry): string[] {
  const problems: string[] = [];
  if (!isArtKey(entry.key)) problems.push(`"${entry.key}" is not an art key`);
  const [, , width, height] = entry.viewBox;
  // Catalogs are data: their shape is checked as given, whatever the types say.
  if ((entry.viewBox as readonly number[]).length !== 4 || !entry.viewBox.every(Number.isFinite) || width <= 0 || height <= 0) problems.push(`${entry.key}: the viewBox is not a box`);
  if (entry.shapes.length === 0) problems.push(`${entry.key}: nothing to draw`);
  entry.shapes.forEach((shape, index) => problems.push(...shapeProblems(shape, `${entry.key}#${String(index)}`, 0)));
  return problems;
}

/** What a key draws until its art is registered: a plain rounded box in the placeholder tone. */
export function placeholderArt(key: string): ArtEntry {
  return { key, viewBox: [0, 0, 40, 24], shapes: [{ tag: 'rect', attrs: { x: 1, y: 1, width: 38, height: 22, rx: 6 }, tone: 'placeholder' }] };
}

export class ArtRegistry {
  readonly #entries = new Map<string, ArtEntry>();

  /** Adds a catalog's art. Refuses the whole catalog if any entry is not plain geometry, or a key comes twice. */
  register(catalog: ArtCatalog): void {
    const keys = new Set<string>();
    const problems: string[] = [];
    for (const entry of catalog.entries) {
      problems.push(...artProblems(entry));
      if (keys.has(entry.key)) problems.push(`${entry.key}: registered twice`);
      keys.add(entry.key);
    }
    if (problems.length > 0) throw new Error(`the ${catalog.mode} art catalog is refused: ${problems.join('; ')}`);
    for (const entry of catalog.entries) this.#entries.set(entry.key, entry);
  }

  /** Whether a key has its own art (otherwise it draws the placeholder). */
  has(key: string): boolean {
    return this.#entries.has(key);
  }

  /** The art for a key, or its placeholder. */
  resolve(key: string): ArtEntry {
    if (!isArtKey(key)) throw new RangeError(`not an art key: ${key}`);
    return this.#entries.get(key) ?? placeholderArt(key);
  }

  /** Draws a key's art as inline SVG, decorative (hidden from screen readers). */
  draw(doc: Document, key: string, className = 'art'): SVGSVGElement {
    const entry = this.resolve(key);
    const shape = (item: ArtShape): SVGElement => {
      const element = svg(doc, item.tag, item.attrs ?? {}, (item.children ?? []).map(shape));
      if (item.tone !== undefined) element.setAttribute('data-tone', item.tone);
      return element;
    };
    return svg(
      doc,
      'svg',
      { class: className, viewBox: entry.viewBox.join(' '), 'data-art': entry.key, 'aria-hidden': 'true', focusable: 'false' },
      entry.shapes.map(shape),
    );
  }
}

/** The site's one registry: modes register their catalogs here when they load. */
export const ART = new ArtRegistry();
