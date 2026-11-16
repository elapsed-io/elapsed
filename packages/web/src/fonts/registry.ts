/**
 * The built-in fonts (plan, Loading and performance > Fonts; owner changes,
 * item 7). Archivo is the default, preloaded with the core tier as "Timer
 * Sans". Every other font's files are hashed assets that download only when
 * the font is chosen, and its name preview only when the appearance category
 * first opens. Provenance and licenses: assets/fonts/choices/README.md.
 */

import { BRAND, FONT_CHOICES } from '@stopwatch/core';
import type { BuiltInFont } from '@stopwatch/core';
import { DEFAULT_FONT_FAMILY } from '../styles/tokens.ts';

/** URLs only: the files themselves are fetched on demand. */
const FILES = import.meta.glob<string>('../assets/fonts/choices/*/*.woff2', { query: '?url', import: 'default', eager: true });

export interface FontFaceFile {
  readonly url: string;
  /** A CSS font-weight descriptor: "300 500" for a variable file, or one weight. */
  readonly weight: string;
}

export interface FontEntry {
  readonly id: BuiltInFont;
  readonly label: string;
  /** The CSS family name the font is registered under once loaded. */
  readonly family: string;
  /** Archivo's width is pinned at 92; the others are drawn at their normal width. */
  readonly stretch: string;
  readonly faces: readonly FontFaceFile[];
  /** The name preview; Archivo has none because the default font is already loaded. */
  readonly preview: FontFaceFile | null;
}

function file(id: string, name: string): string {
  const url = FILES[`../assets/fonts/choices/${id}/${name}`];
  if (url === undefined) throw new Error(`missing font file ${id}/${name}`);
  return url;
}

function entry(id: BuiltInFont): FontEntry {
  const label = BRAND.copy.fonts[id];
  if (id === 'archivo') return { id, label, family: DEFAULT_FONT_FAMILY, stretch: '92%', faces: [], preview: null };
  const variable = FILES[`../assets/fonts/choices/${id}/${id}.woff2`];
  const faces =
    variable === undefined
      ? (['300', '400', '500'] as const).map((weight) => ({ url: file(id, `${id}-${weight}.woff2`), weight }))
      : [{ url: variable, weight: '300 500' }];
  return {
    id,
    label,
    family: `elapsed-${id}`,
    stretch: '100%',
    faces,
    preview: { url: file(id, `${id}.name.woff2`), weight: '400' },
  };
}

export const BUILT_IN_FONTS: readonly FontEntry[] = FONT_CHOICES.filter((id): id is BuiltInFont => id !== 'own').map(entry);

export function fontEntry(id: BuiltInFont): FontEntry {
  const found = BUILT_IN_FONTS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new RangeError(`unknown font ${id}`);
  return found;
}

/** The family the user's own font file is registered under. */
export const OWN_FONT_FAMILY = 'elapsed-own';

/** The font-family value for a loaded family, falling back to the default font for missing characters. */
export function familyStack(family: string): string {
  return family === DEFAULT_FONT_FAMILY ? `"${DEFAULT_FONT_FAMILY}", system-ui, sans-serif` : `"${family}", "${DEFAULT_FONT_FAMILY}", system-ui, sans-serif`;
}

export function previewFamily(entry: FontEntry): string {
  return entry.preview === null ? entry.family : `${entry.family}-preview`;
}
