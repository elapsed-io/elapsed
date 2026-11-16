/**
 * The site's one small endpoint (plan, Architecture invariants > Stack): a
 * Cloudflare Worker on the site's own address that writes daily totals to D1
 * through a direct binding, so no database key exists and nothing pauses
 * while the site is idle. Static files are served by Workers static assets;
 * this script runs only for /api/ (wrangler.jsonc: run_worker_first).
 *
 * Two routes: anonymous usage counts and opt-in crash reports. A daily
 * schedule deletes crash reports older than 14 days.
 */

import { COUNT_PATH, CRASH_PATH } from '@stopwatch/core';
import { handleCount } from './count.ts';
import { deleteExpiredReports, handleCrash } from './crash.ts';
import type { AssetsBinding, D1Database } from './d1.ts';
import { respond } from './http.ts';
import { RateLimiter } from './rate-limit.ts';

export interface Env {
  /** The one D1 database: daily counts and crash reports, kept apart from account data. */
  readonly DB: D1Database;
  readonly ASSETS: AssetsBinding;
}

/** One per Worker instance; it remembers addresses (hashed) for a minute only. */
const limiter = new RateLimiter();

export async function route(request: Request, env: Env, now: number, crashLimiter: RateLimiter = limiter): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === COUNT_PATH) return handleCount(request, env.DB, now);
  if (pathname === CRASH_PATH) return handleCrash(request, env.DB, crashLimiter, now);
  if (pathname.startsWith('/api/')) return respond(404);
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env, Date.now());
  },
  /** The daily schedule (wrangler.jsonc: triggers). */
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await deleteExpiredReports(env.DB, Date.now());
  },
};
