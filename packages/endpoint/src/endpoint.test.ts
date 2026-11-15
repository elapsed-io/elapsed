import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { RESPONSE_HEADERS, utcDay } from './count.ts';
import type { D1Database, D1Statement } from './d1.ts';
import { route } from './worker.ts';
import type { Env } from './worker.ts';

const SITE = 'https://site.example';
const NOW = Date.UTC(2026, 10, 16, 23, 59, 59);

/** D1 stands in as SQLite in memory, with the real migration applied. */
function database(): { db: DatabaseSync; d1: D1Database } {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(import.meta.dirname, '..', 'migrations', '0001_daily_counts.sql'), 'utf8'));
  const statement = (sql: string, values: readonly (string | number | null)[]): D1Statement => ({
    bind: (...next) => statement(sql, next),
    run: () => {
      db.prepare(sql).run(...values);
      return Promise.resolve({ success: true });
    },
  });
  return { db, d1: { prepare: (sql) => statement(sql, []) } };
}

function env(d1: D1Database): Env {
  return { COUNTS: d1, ASSETS: { fetch: () => Promise.resolve(new Response('asset')) } };
}

const post = (body: BodyInit | null, headers: Record<string, string> = {}, path = '/api/count'): Request =>
  new Request(`${SITE}${path}`, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', Origin: SITE, ...headers },
  });

const totals = (db: DatabaseSync): unknown[] => db.prepare('SELECT day, event, count FROM daily_counts ORDER BY day, event').all().map((row) => ({ ...row }));

describe('the counting endpoint', () => {
  it('adds one to the day’s total for each event, keeping nothing else', async () => {
    const { db, d1 } = database();
    for (const body of ['{"event":"visit"}', '{"event":"visit"}', '{"event":"session"}']) {
      const response = await route(post(body), env(d1), NOW);
      expect(response.status).toBe(204);
    }
    await route(post('{"event":"visit"}'), env(d1), NOW + 1000);
    expect(totals(db)).toEqual([
      { day: '2026-11-16', event: 'session', count: 1 },
      { day: '2026-11-16', event: 'visit', count: 2 },
      { day: '2026-11-17', event: 'visit', count: 1 },
    ]);
    const columns = db.prepare('PRAGMA table_info(daily_counts)').all().map((row) => row['name']);
    expect(columns).toEqual(['day', 'event', 'count']);
  });

  it.each([
    ['another event', post('{"event":"signup"}'), 400],
    ['extra fields', post('{"event":"visit","id":"abc"}'), 400],
    ['broken JSON', post('{"event":'), 400],
    ['a body that is too long', post(JSON.stringify({ event: 'visit', pad: 'x'.repeat(300) })), 413],
    ['a declared length that is too long', post('{"event":"visit"}', { 'Content-Length': '100000' }), 413],
    ['another content type', post('{"event":"visit"}', { 'Content-Type': 'text/plain' }), 415],
    ['another site', post('{"event":"visit"}', { 'Sec-Fetch-Site': 'cross-site' }), 403],
    ['another origin', post('{"event":"visit"}', { Origin: 'https://evil.example' }), 403],
    ['a GET', new Request(`${SITE}/api/count`), 405],
    ['invalid UTF-8', post(new Uint8Array([0x7b, 0xff, 0x7d])), 400],
  ])('refuses %s without touching the database', async (_label, request, status) => {
    const { db, d1 } = database();
    const response = await route(request, env(d1), NOW);
    expect(response.status).toBe(status);
    expect(totals(db)).toEqual([]);
  });

  it('answers every response with no-store and the security headers', async () => {
    const { d1 } = database();
    for (const request of [post('{"event":"visit"}'), new Request(`${SITE}/api/count`), new Request(`${SITE}/api/other`)]) {
      const response = await route(request, env(d1), NOW);
      for (const [name, value] of Object.entries(RESPONSE_HEADERS)) expect(response.headers.get(name), name).toBe(value);
    }
  });

  it('serves nothing else under /api/ and leaves other paths to the static files', async () => {
    const { d1 } = database();
    expect((await route(new Request(`${SITE}/api/other`), env(d1), NOW)).status).toBe(404);
    expect(await (await route(new Request(`${SITE}/`), env(d1), NOW)).text()).toBe('asset');
  });

  it('reports a database failure without details', async () => {
    const failing: D1Database = {
      prepare: () => ({
        bind() {
          return this;
        },
        run: () => Promise.reject(new Error('D1_ERROR')),
      }),
    };
    expect((await route(post('{"event":"visit"}'), env(failing), NOW)).status).toBe(503);
  });

  it('dates counts by the UTC day', () => {
    expect(utcDay(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    expect(utcDay(Date.UTC(2025, 11, 31, 23, 59, 59, 999))).toBe('2025-12-31');
  });

  it('refuses rows the schema does not allow', () => {
    const { db } = database();
    expect(() => db.prepare("INSERT INTO daily_counts VALUES ('16 nov', 'visit', 1)").run()).toThrow();
    expect(() => db.prepare("INSERT INTO daily_counts VALUES ('2026-11-16', 'ip', 1)").run()).toThrow();
    expect(() => db.prepare("INSERT INTO daily_counts VALUES ('2026-11-16', 'visit', -1)").run()).toThrow();
  });
});
