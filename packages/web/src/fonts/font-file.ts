/**
 * Checks a user's own font file before anything uses it (plan, Infrastructure
 * > Imported files: "Fonts are size-capped, checked by their contents, and
 * loaded from bytes"). The file's name and type are ignored; only its first
 * bytes decide its format. The browser's own font sanitiser then has the last
 * word when the font is loaded.
 */

import { CONFIG } from '@stopwatch/core';

export const FONT_FORMATS = ['woff2', 'woff', 'ttf', 'otf'] as const;
export type FontFormat = (typeof FONT_FORMATS)[number];

export function isFontFormat(value: unknown): value is FontFormat {
  return typeof value === 'string' && (FONT_FORMATS as readonly string[]).includes(value);
}

/** The format the file's signature names, or null. Font collections (ttcf) are not accepted. */
export function fontFormatOf(bytes: Uint8Array): FontFormat | null {
  if (bytes.length < 12) return null;
  const tag = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  if (tag === 'wOF2') return 'woff2';
  if (tag === 'wOFF') return 'woff';
  if (tag === 'OTTO') return 'otf';
  if (tag === 'true' || tag === '\u0000\u0001\u0000\u0000') return 'ttf';
  return null;
}

export type FontFileCheck =
  | { readonly ok: true; readonly format: FontFormat }
  | { readonly ok: false; readonly problem: 'too-large' | 'not-a-font' };

/** Size first (without reading the file), then the signature. */
export function checkFontSize(size: number): boolean {
  return size > 0 && size <= CONFIG.device.ownFontMaxBytes;
}

export function checkFontBytes(bytes: ArrayBuffer): FontFileCheck {
  if (!checkFontSize(bytes.byteLength)) return { ok: false, problem: bytes.byteLength === 0 ? 'not-a-font' : 'too-large' };
  const format = fontFormatOf(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12)));
  return format === null ? { ok: false, problem: 'not-a-font' } : { ok: true, format };
}

/** "184 KB" or "1.6 MB", for the storage list and the file limit. */
export function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${String(Math.max(1, Math.round(kb)))} KB`;
  return `${String(Math.round((kb / 1024) * 10) / 10)} MB`;
}
