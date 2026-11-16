/**
 * What both endpoint routes share: response headers, the same-origin check,
 * reading a size-capped body, and the UTC day.
 */

import { RESPONSE_HEADERS } from './headers.ts';

export { RESPONSE_HEADERS };

export function respond(status: number, extra: Readonly<Record<string, string>> = {}): Response {
  return new Response(null, { status, headers: { ...RESPONSE_HEADERS, ...extra } });
}

/** The UTC day of `at`, as YYYY-MM-DD. */
export function utcDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** Reads at most `limit` bytes of the body as UTF-8 text. */
export type Body = { readonly text: string } | 'too-long' | 'not-text';

export async function readCapped(request: Request, limit: number): Promise<Body> {
  if (request.body === null) return { text: '' };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      return 'too-long';
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return 'not-text';
  }
}

/** Whether the request comes from a page on this site (browsers send these headers on every POST). */
export function sameOrigin(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin') return false;
  const origin = request.headers.get('Origin');
  return origin === null || origin === new URL(request.url).origin;
}

/** Whether the request declares a JSON body. */
export function isJson(request: Request): boolean {
  const type = request.headers.get('Content-Type') ?? '';
  return /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type.trim());
}

/** Whether a declared Content-Length is missing or within `limit`. */
export function declaredWithin(request: Request, limit: number): boolean {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  return Number.isFinite(declared) && declared <= limit;
}
