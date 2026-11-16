/**
 * MediaStore (plan, Architecture invariant 6): files the user creates or
 * imports, kept on this device only and never uploaded or synced (owner
 * changes, item 10). Release 1 keeps the user's own font file; Release 2 adds
 * background images. The browser's IndexedDB holds them (database `media`,
 * store `files`).
 *
 * What is read back is untrusted: the record's shape, size and file signature
 * are checked again, and anything else is deleted.
 */

import { CONFIG } from '@stopwatch/core';
import { fontFormatOf, isFontFormat } from '../fonts/font-file.ts';
import type { FontFormat } from '../fonts/font-file.ts';

export const MEDIA_DATABASE = 'media';
const STORE = 'files';
const FONT_KEY = 'font';
const RECORD_SCHEMA = 1;

export interface StoredFont {
  readonly format: FontFormat;
  readonly bytes: ArrayBuffer;
}

export interface MediaUsage {
  /** The stored font's size in bytes, or null when there is none. */
  readonly font: number | null;
}

export interface MediaStore {
  getFont(): Promise<StoredFont | null>;
  putFont(font: StoredFont): Promise<void>;
  removeFont(): Promise<void>;
  usage(): Promise<MediaUsage>;
  /** Removes every stored file (clear device data). */
  clear(): Promise<void>;
}

/** Validates a record read back from the database. */
export function readFontRecord(value: unknown): StoredFont | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort().join(',');
  if (keys !== 'bytes,format,kind,schema' || record['schema'] !== RECORD_SCHEMA || record['kind'] !== 'font') return null;
  const { format, bytes } = record;
  if (!isFontFormat(format) || !(bytes instanceof ArrayBuffer)) return null;
  if (bytes.byteLength === 0 || bytes.byteLength > CONFIG.device.ownFontMaxBytes) return null;
  if (fontFormatOf(new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength))) !== format) return null;
  return { format, bytes };
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', () => {
      resolve(req.result);
    });
    req.addEventListener('error', () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    });
  });
}

export class IndexedDbMediaStore implements MediaStore {
  readonly #factory: IDBFactory | null;
  #database: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory | null) {
    this.#factory = factory;
  }

  async getFont(): Promise<StoredFont | null> {
    const db = await this.#open();
    if (db === null) return null;
    const value: unknown = await request(db.transaction(STORE, 'readonly').objectStore(STORE).get(FONT_KEY));
    if (value === undefined) return null;
    const font = readFontRecord(value);
    if (font === null) await this.removeFont();
    return font;
  }

  async putFont(font: StoredFont): Promise<void> {
    const db = await this.#open();
    if (db === null) throw new Error('no IndexedDB in this browser');
    const record = { schema: RECORD_SCHEMA, kind: 'font', format: font.format, bytes: font.bytes };
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record, FONT_KEY));
  }

  async removeFont(): Promise<void> {
    const db = await this.#open();
    if (db === null) return;
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(FONT_KEY));
  }

  async usage(): Promise<MediaUsage> {
    const font = await this.getFont();
    return { font: font === null ? null : font.bytes.byteLength };
  }

  async clear(): Promise<void> {
    const db = await this.#open();
    if (db === null) return;
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
  }

  #open(): Promise<IDBDatabase | null> {
    const factory = this.#factory;
    if (factory === null) return Promise.resolve(null);
    this.#database ??= new Promise((resolve, reject) => {
      const req = factory.open(MEDIA_DATABASE, 1);
      req.addEventListener('upgradeneeded', () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      });
      req.addEventListener('success', () => {
        // Another tab deleting or upgrading the database closes this connection.
        req.result.addEventListener('versionchange', () => {
          req.result.close();
          this.#database = null;
        });
        resolve(req.result);
      });
      req.addEventListener('error', () => {
        reject(req.error ?? new Error('IndexedDB could not open'));
      });
    });
    return this.#database.catch(() => {
      this.#database = null;
      return null;
    });
  }
}

/** The browser's IndexedDB, or null where it is unavailable. */
export function browserIndexedDb(win: Window): IDBFactory | null {
  try {
    return win.indexedDB;
  } catch {
    return null;
  }
}
