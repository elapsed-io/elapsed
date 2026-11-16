/**
 * Loads fonts through the CSS Font Loading API, so a font is used only once
 * it has arrived (the time never shows a fallback and then jumps).
 *
 * - Built-in fonts load from the site's own hashed files (font-src 'self').
 * - The user's own font loads from its bytes, never from a URL; the browser's
 *   font sanitiser checks it, and a font it refuses is reported, not used.
 */

import { OWN_FONT_FAMILY, previewFamily } from './registry.ts';
import type { FontEntry } from './registry.ts';

export class FontLoader {
  readonly #fonts: FontFaceSet;
  readonly #full = new Map<string, Promise<void>>();
  readonly #previews = new Map<string, Promise<void>>();
  #own: FontFace | null = null;

  constructor(doc: Document) {
    this.#fonts = doc.fonts;
  }

  /** Loads a built-in font's files once; later calls share the same promise. */
  load(entry: FontEntry): Promise<void> {
    if (entry.faces.length === 0) return Promise.resolve();
    let loading = this.#full.get(entry.id);
    if (loading === undefined) {
      loading = Promise.all(
        entry.faces.map((face) => this.#add(new FontFace(entry.family, `url("${face.url}") format("woff2")`, { weight: face.weight, style: 'normal' }))),
      ).then(() => undefined);
      loading.catch(() => this.#full.delete(entry.id));
      this.#full.set(entry.id, loading);
    }
    return loading;
  }

  /** Loads a font's name preview (a few letters) for the settings grid. */
  preview(entry: FontEntry): Promise<void> {
    const file = entry.preview;
    if (file === null) return Promise.resolve();
    let loading = this.#previews.get(entry.id);
    if (loading === undefined) {
      loading = this.#add(new FontFace(previewFamily(entry), `url("${file.url}") format("woff2")`, { weight: file.weight, style: 'normal' }));
      loading.catch(() => this.#previews.delete(entry.id));
      this.#previews.set(entry.id, loading);
    }
    return loading;
  }

  /**
   * Loads the user's own font from its bytes, replacing any earlier one.
   * Rejects if the browser cannot use it.
   */
  async own(bytes: ArrayBuffer): Promise<void> {
    // One face for every weight: a single static file is never made bolder or lighter.
    const face = new FontFace(OWN_FONT_FAMILY, bytes, { weight: '1 1000', style: 'normal' });
    await face.load();
    if (this.#own !== null) this.#fonts.delete(this.#own);
    this.#own = face;
    this.#fonts.add(face);
  }

  /** Forgets the user's own font (cleared from the device). */
  dropOwn(): void {
    if (this.#own !== null) this.#fonts.delete(this.#own);
    this.#own = null;
  }

  get hasOwn(): boolean {
    return this.#own !== null;
  }

  async #add(face: FontFace): Promise<void> {
    this.#fonts.add(face);
    try {
      await face.load();
    } catch (error) {
      this.#fonts.delete(face);
      throw error;
    }
  }
}
