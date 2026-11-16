import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { crashBody, crashReport } from '@stopwatch/core';
import { deleteExpiredReports, expiredThrough } from './crash.ts';
import type { D1Database, D1Statement } from './d1.ts';
import { RESPONSE_HEADERS, utcDay } from './http.ts';
import { RateLimiter } from './rate-limit.ts';
import worker, { route } from './worker.ts';
import type { Env } from './worker.ts';

const SITE = 'https://site.example';
const NOW = Date.UTC(2026, 10, 16, 23, 59, 59);

/** D1 stands in as SQLite in memory, with the real migration applied. */
function database(): { db: DatabaseSync; d1: D1Database } {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_daily_counts.sql', '0002_crash_reports.sql']) db.exec(readFileSync(join(import.meta.dirname, '..', 'migrations', file), 'utf8'));
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
  return { DB: d1, ASSETS: { fetch: () => Promise.resolve(new Response('asset')) } };
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

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const report = (message = 'TypeError: x is undefined'): string =>
  crashBody(crashReport({ message, stack: `at f (${SITE}/assets/index-a.js?k=v:1:2)`, version: 'index-Bu-rRp5K', userAgent: CHROME, origin: SITE }));
const crash = (body: BodyInit | null, headers: Record<string, string> = {}): Request => post(body, { 'CF-Connecting-IP': '203.0.113.7', ...headers }, '/api/crash');
const reports = (db: DatabaseSync): unknown[] => db.prepare('SELECT * FROM crash_reports ORDER BY id').all().map((row) => ({ ...row }));

describe('the crash report endpoint', () => {
  it('stores the report with the UTC day and nothing about the request', async () => {
    const { db, d1 } = database();
    const response = await route(crash(report()), env(d1), NOW, new RateLimiter());
    expect(response.status).toBe(204);
    expect(reports(db)).toEqual([
      {
        id: 1,
        day: '2026-11-16',
        version: 'index-Bu-rRp5K',
        browser: 'chrome',
        browser_version: 131,
        message: 'TypeError: x is undefined',
        stack: `at f (${SITE}/assets/index-a.js)`,
      },
    ]);
    expect(JSON.stringify(reports(db))).not.toContain('203.0.113.7');
  });

  it('takes at most 5 a minute from one address, and forgets the address after the minute', async () => {
    const { db, d1 } = database();
    const limiter = new RateLimiter();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await route(crash(report()), env(d1), NOW, limiter)).status);
    expect(statuses).toEqual([204, 204, 204, 204, 204, 429]);
    // Another address is counted on its own.
    expect((await route(crash(report(), { 'CF-Connecting-IP': '198.51.100.1' }), env(d1), NOW, limiter)).status).toBe(204);
    expect(limiter.size).toBe(2);
    expect((await route(crash(report()), env(d1), NOW + 60_000, limiter)).status).toBe(204);
    expect(limiter.size).toBe(1);
    expect(reports(db)).toHaveLength(7);
  });

  it.each([
    ['not a report', crash('{"event":"visit"}'), 400],
    ['an extra field', crash(JSON.stringify({ ...JSON.parse(report()) as object, ip: '1.2.3.4' })), 400],
    ['a body over 8 KB', crash(JSON.stringify({ message: 'x', stack: 'y'.repeat(9000), version: 'v', browser: 'chrome', browserVersion: 1 })), 413],
    ['a declared length over 8 KB', crash(report(), { 'Content-Length': '9000' }), 413],
    ['another content type', crash(report(), { 'Content-Type': 'text/plain' }), 415],
    ['another site', crash(report(), { 'Sec-Fetch-Site': 'cross-site' }), 403],
    ['a GET', new Request(`${SITE}/api/crash`), 405],
  ])('refuses %s without touching the database', async (_label, request, status) => {
    const { db, d1 } = database();
    expect((await route(request, env(d1), NOW, new RateLimiter())).status).toBe(status);
    expect(reports(db)).toEqual([]);
  });

  it('deletes reports after 14 days, on each new report and on the daily schedule', async () => {
    const { db, d1 } = database();
    const DAY = 24 * 60 * 60 * 1000;
    const insert = db.prepare("INSERT INTO crash_reports (day, version, browser, browser_version, message, stack) VALUES (?, 'v', 'chrome', 1, 'm', 's')");
    for (const day of ['2026-11-01', '2026-11-02', '2026-11-03']) insert.run(day);
    expect(expiredThrough(NOW)).toBe('2026-11-02');
    await deleteExpiredReports(d1, NOW);
    expect(reports(db).map((row) => (row as { day: string }).day)).toEqual(['2026-11-03']);
    await worker.scheduled(null, env(d1));
    // The scheduled run uses the real clock, so anything 14 days old by now is gone.
    expect(reports(db).every((row) => (row as { day: string }).day > utcDay(Date.now() - 14 * DAY))).toBe(true);
    await route(crash(report()), env(d1), NOW + DAY, new RateLimiter());
    expect(reports(db).map((row) => (row as { day: string }).day)).toEqual(['2026-11-17']);
  });

  it('refuses rows the schema does not allow', () => {
    const { db } = database();
    expect(() => db.prepare("INSERT INTO crash_reports (day, version, browser, browser_version, message, stack) VALUES ('2026-11-16', 'v', 'netscape', 1, 'm', 's')").run()).toThrow();
    expect(() => db.prepare(`INSERT INTO crash_reports (day, version, browser, browser_version, message, stack) VALUES ('2026-11-16', 'v', 'chrome', 1, '${'x'.repeat(501)}', 's')`).run()).toThrow();
  });
});
