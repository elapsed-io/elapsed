/**
 * The few parts of Cloudflare's D1 binding the endpoint uses, typed here so
 * no Workers type package is needed. See
 * https://developers.cloudflare.com/d1/worker-api/prepared-statements/.
 */

export interface D1Statement {
  bind(...values: readonly (string | number | null)[]): D1Statement;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(sql: string): D1Statement;
}

/** The static assets binding (Workers static assets). */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}
