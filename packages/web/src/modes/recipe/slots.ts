/**
 * Slots (docs/recipes/mode-recipes.md): every image or catalog a recipe uses is a named slot with a built-in
 * default, `builtin:<key>`. An image's key is its asset-registry key (art/registry.ts), so final art drops in
 * without code changes; data (a landmark list) is built in by key too. Round 2.9 lets a user fill an image slot
 * with their own picture through the local image import; until then every slot holds its default.
 *
 * Each built-in mode names where its own defaults come from (built-in/*.ts), so its download carries its own art
 * and nothing of another mode's.
 */

import type { Recipe, Slot } from '@stopwatch/core';
import { ART } from '../../art/registry.ts';
import type { ArtCatalog } from '../../art/registry.ts';

export type CatalogLoader = () => Promise<ArtCatalog>;

export interface SlotSources {
  /** The catalog holding each built-in image, by the start of its key ("sunlight/", "passing/"). */
  readonly art?: Readonly<Record<string, CatalogLoader>>;
  /** Built-in data, by key. */
  readonly data?: Readonly<Record<string, () => unknown>>;
}

const BUILTIN = 'builtin:';

/** The asset key a slot default names (`builtin:sky/stars` → `sky/stars`). */
export function builtinKey(slot: Slot): string {
  return slot.default.startsWith(BUILTIN) ? slot.default.slice(BUILTIN.length) : '';
}

export class Slots {
  readonly #slots: ReadonlyMap<string, Slot>;
  readonly #sources: SlotSources;
  readonly #loading = new Map<string, Promise<void>>();

  constructor(recipe: Recipe, sources: SlotSources = {}) {
    this.#slots = new Map((recipe.slots ?? []).map((slot) => [slot.id, slot]));
    this.#sources = sources;
  }

  /** The registry key of the image a slot holds now. */
  key(id: string): string {
    const slot = this.#slots.get(id);
    return slot === undefined ? '' : builtinKey(slot);
  }

  /** Loads the catalog of every image these slots name, once each, so they can be drawn. */
  async images(ids: readonly string[]): Promise<void> {
    await Promise.all(ids.map(async (id) => this.#image(this.key(id))));
  }

  /** Whether a slot's image can be drawn now (its catalog registered); otherwise it draws the placeholder. */
  ready(id: string): boolean {
    return ART.has(this.key(id));
  }

  /** A data slot's built-in value (a landmark list), or undefined. */
  data(id: string): unknown {
    return this.#sources.data?.[this.key(id)]?.();
  }

  async #image(key: string): Promise<void> {
    if (key === '' || ART.has(key)) return;
    const prefix = Object.keys(this.#sources.art ?? {})
      .filter((start) => key.startsWith(start))
      .sort((a, b) => b.length - a.length)[0];
    const load = prefix === undefined ? undefined : this.#sources.art?.[prefix];
    if (load === undefined) return;
    let loading = this.#loading.get(prefix ?? '');
    if (loading === undefined) {
      loading = load().then((catalog) => {
        if (!catalog.entries.every((entry) => ART.has(entry.key))) ART.register(catalog);
      });
      this.#loading.set(prefix ?? '', loading);
    }
    await loading;
  }
}
