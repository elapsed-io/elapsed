/**
 * The media store, fetched the first time it is used (round 2.10: the core holds only what the timer, digits, ring
 * and timeline need). Only your own font and, later, background images use it, so most visits never load it.
 */

import type { MediaStore } from './media-store.ts';

export function lazyMediaStore(win: Window): MediaStore {
  let store: Promise<MediaStore> | null = null;
  const get = (): Promise<MediaStore> => (store ??= import('./media-store.ts').then(({ IndexedDbMediaStore, browserIndexedDb }) => new IndexedDbMediaStore(browserIndexedDb(win))));
  return {
    getFont: async () => (await get()).getFont(),
    putFont: async (font) => {
      await (await get()).putFont(font);
    },
    removeFont: async () => {
      await (await get()).removeFont();
    },
    usage: async () => (await get()).usage(),
    clear: async () => {
      await (await get()).clear();
    },
  };
}
