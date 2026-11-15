/**
 * POST /api/count (plan, Principles > Private; Privacy; owner decision,
 * 2026-11-15): adds one to today's total for "visit" or "session".
 *
 * - Only a same-origin POST of `{"event":"visit"}` or `{"event":"session"}`
 *   as JSON, at most 256 bytes, is counted; anything else is refused before
 *   the database is touched.
 * - The day is the UTC date on the server's clock, so the device's clock and
 *   time zone play no part.
 * - Nothing about the request is stored or logged: no address, no headers,
 *   no time beyond the day. Inflated counts are an accepted risk (plan,
 *   Security requirements > Anonymous counts).
 */

import { CONFIG, parseCountBody } from '@stopwatch/core';
import type { D1Database } from './d1.ts';

const UPSERT =
  'INSERT INTO daily_counts (day, event, count) VALUES (?1, ?2, 1) ON CONFLICT (day, event) DO UPDATE SET count = count + 1';

/** Headers on every endpoint response. Static files get theirs from _headers; Worker responses need their own. */
export const RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export function respond(status: number, extra: Readonly<Record<string, string>> = {}): Response {
  return new Response(null, { status, headers: { ...RESPONSE_HEADERS, ...extra } });
}

/** The UTC day of `at`, as YYYY-MM-DD. */
export function utcDay(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** Reads at most `limit` bytes of the body as UTF-8 text. */
type Body = { readonly text: string } | 'too-long' | 'not-text';

async function readCapped(request: Request, limit: number): Promise<Body> {
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
function sameOrigin(request: Request): boolean {
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin') return false;
  const origin = request.headers.get('Origin');
  return origin === null || origin === new URL(request.url).origin;
}

export async function handleCount(request: Request, db: D1Database, now: number): Promise<Response> {
  if (request.method !== 'POST') return respond(405, { Allow: 'POST' });
  if (!sameOrigin(request)) return respond(403);
  const type = request.headers.get('Content-Type') ?? '';
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type.trim())) return respond(415);
  const limit = CONFIG.counts.maxBodyBytes;
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (!Number.isFinite(declared) || declared > limit) return respond(413);
  const body = await readCapped(request, limit);
  if (body === 'too-long') return respond(413);
  const event = body === 'not-text' ? null : parseCountBody(body.text);
  if (event === null) return respond(400);
  try {
    await db.prepare(UPSERT).bind(utcDay(now), event).run();
  } catch {
    return respond(503);
  }
  return respond(204);
}
