/**
 * POST /api/crash (plan, Privacy; owner changes, items 8 and 9): stores one
 * opt-in crash report, scrubbed again, with the UTC day it arrived.
 *
 * - Only a same-origin POST of a report as JSON, at most 8 KB, is accepted;
 *   anything else is refused before the database is touched.
 * - At most 5 a minute from one address (rate-limit.ts); the address is never
 *   stored, logged or written anywhere.
 * - Reports are deleted after 14 days: on every insert, and daily on a
 *   schedule so they go even when no new report arrives.
 * - Nothing else about the request is kept: no headers, no time beyond the day.
 */

import { CONFIG, parseCrashBody } from '@stopwatch/core';
import type { D1Database } from './d1.ts';
import { declaredWithin, isJson, readCapped, respond, sameOrigin, utcDay } from './http.ts';
import type { RateLimiter } from './rate-limit.ts';

const INSERT =
  'INSERT INTO crash_reports (day, version, browser, browser_version, message, stack) VALUES (?, ?, ?, ?, ?, ?)';
const DELETE_OLD = 'DELETE FROM crash_reports WHERE day <= ?';

const DAY = 24 * 60 * 60 * 1000;

/** Reports from this UTC day or earlier are deleted at `now`: they are 14 days old. */
export function expiredThrough(now: number): string {
  return utcDay(now - CONFIG.crashReports.retentionDays * DAY);
}

export async function deleteExpiredReports(db: D1Database, now: number): Promise<void> {
  await db.prepare(DELETE_OLD).bind(expiredThrough(now)).run();
}

export async function handleCrash(request: Request, db: D1Database, limiter: RateLimiter, now: number): Promise<Response> {
  if (request.method !== 'POST') return respond(405, { Allow: 'POST' });
  if (!sameOrigin(request)) return respond(403);
  if (!isJson(request)) return respond(415);
  const limit = CONFIG.crashReports.maxBodyBytes;
  if (!declaredWithin(request, limit)) return respond(413);
  // Cloudflare sets this header; the address is only hashed for the limit (rate-limit.ts).
  const address = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await limiter.allow(address, now))) return respond(429, { 'Retry-After': String(Math.ceil(CONFIG.crashReports.rateWindow / 1000)) });
  const body = await readCapped(request, limit);
  if (body === 'too-long') return respond(413);
  const report = body === 'not-text' ? null : parseCrashBody(body.text, new URL(request.url).origin);
  if (report === null) return respond(400);
  try {
    await db.prepare(INSERT).bind(utcDay(now), report.version, report.browser, report.browserVersion, report.message, report.stack).run();
    await deleteExpiredReports(db, now);
  } catch {
    return respond(503);
  }
  return respond(204);
}
