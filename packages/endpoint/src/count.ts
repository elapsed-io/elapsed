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
import { declaredWithin, isJson, readCapped, respond, sameOrigin, utcDay } from './http.ts';

const UPSERT =
  'INSERT INTO daily_counts (day, event, count) VALUES (?1, ?2, 1) ON CONFLICT (day, event) DO UPDATE SET count = count + 1';

export async function handleCount(request: Request, db: D1Database, now: number): Promise<Response> {
  if (request.method !== 'POST') return respond(405, { Allow: 'POST' });
  if (!sameOrigin(request)) return respond(403);
  if (!isJson(request)) return respond(415);
  const limit = CONFIG.counts.maxBodyBytes;
  if (!declaredWithin(request, limit)) return respond(413);
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
