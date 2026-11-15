/**
 * The site's one small endpoint (plan, Architecture invariants > Stack): a
 * Cloudflare Worker on the site's own address that writes daily totals to D1
 * through a direct binding, so no database key exists and nothing pauses
 * while the site is idle. Static files are served by Workers static assets;
 * this script runs only for /api/ (wrangler.jsonc: run_worker_first).
 *
 * Opt-in crash reports join it in round 6.
 */

import { COUNT_PATH } from '@stopwatch/core';
import { handleCount, respond } from './count.ts';
import type { AssetsBinding, D1Database } from './d1.ts';

export interface Env {
  readonly COUNTS: D1Database;
  readonly ASSETS: AssetsBinding;
}

export async function route(request: Request, env: Env, now: number): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === COUNT_PATH) return handleCount(request, env.COUNTS, now);
  if (pathname.startsWith('/api/')) return respond(404);
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env, Date.now());
  },
};
