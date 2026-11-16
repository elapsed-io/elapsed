/**
 * Starts each Worker in Cloudflare's own runtime (workerd, through `wrangler dev` at the version the deploy
 * scripts pin) and sends it real requests, so an error a Worker only shows on Cloudflare (such as 10021,
 * "Disallowed operation called within global scope", which stopped the deploy of 2026-11-16) fails here, in
 * CI and before every deploy, instead of at deploy time. Nothing leaves this machine: the database is a
 * local one in a temporary folder, and no account is needed.
 *
 *   node tooling/worker-runtime.ts            the app's Worker (production and test settings) and the soon page
 *   node tooling/worker-runtime.ts endpoint   the app's Worker only (run after `npm run build`: it serves dist)
 *   node tooling/worker-runtime.ts soon       the soon page only
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const scripts = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
const version = /wrangler@(\d+\.\d+\.\d+)/.exec(scripts['deploy:test'] ?? '')?.[1];
if (version === undefined) throw new Error('package.json: deploy:test names no pinned Wrangler');
const WRANGLER = ['--yes', `wrangler@${version}`];
const ENDPOINT = 'packages/endpoint/wrangler.jsonc';
const SOON = 'packages/soon/wrangler.jsonc';
/** What the runtime prints when a Worker fails (to start, or on a request). */
const FAILURE = /Uncaught|Disallowed operation|\[ERROR\]|ERR_RUNTIME_FAILURE|Error in LocalRuntimeController/;

const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1', FORCE_COLOR: '0' };

function runOnce(args: readonly string[]): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn('npx', [...WRANGLER, ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

interface Server {
  readonly base: string;
  readonly output: () => string;
  readonly stop: () => void;
}

/** Starts `wrangler dev` and waits until it serves, or fails with what it printed. */
function serve(args: readonly string[], port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    // Its own process group, so stopping it stops workerd too.
    const child: ChildProcess = spawn('npx', [...WRANGLER, 'dev', ...args, '--ip', '127.0.0.1', '--port', String(port)], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    let output = '';
    let settled = false;
    const stop = (): void => {
      if (child.pid !== undefined && child.exitCode === null) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          // Already gone.
        }
      }
    };
    const fail = (reason: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop();
      reject(new Error(`${reason}\n${output}`));
    };
    const timer = setTimeout(() => {
      fail(`wrangler dev did not start within 120 s (${args.join(' ')})`);
    }, 120_000);
    const read = (chunk: Buffer): void => {
      output += chunk.toString();
      if (FAILURE.test(output)) fail(`the Worker failed in Cloudflare's runtime (${args.join(' ')})`);
      else if (!settled && /Ready on http/.test(output)) {
        settled = true;
        clearTimeout(timer);
        resolve({ base: `http://127.0.0.1:${String(port)}`, output: () => output, stop });
      }
    };
    child.stdout?.on('data', read);
    child.stderr?.on('data', read);
    child.on('close', (code) => {
      fail(`wrangler dev exited with ${String(code)} (${args.join(' ')})`);
    });
  });
}

const problems: string[] = [];
const expectStatus = (what: string, actual: number, expected: number): void => {
  if (actual !== expected) problems.push(`${what}: ${String(actual)}, expected ${String(expected)}`);
};

async function post(base: string, path: string, body: string, headers: Record<string, string> = {}): Promise<number> {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, 'Sec-Fetch-Site': 'same-origin', ...headers },
    body,
  });
  await response.arrayBuffer();
  return response.status;
}

async function get(base: string, path: string): Promise<{ status: number; text: string }> {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, text: await response.text() };
}

const CRASH = JSON.stringify({ message: 'TypeError: x is undefined', stack: 'at f (/assets/index-a.js:1:2)', version: 'index-a', browser: 'chrome', browserVersion: 131 });

async function checkEndpoint(label: string, database: string, extra: readonly string[], port: number): Promise<void> {
  const state = mkdtempSync(join(tmpdir(), 'elapsed-worker-'));
  try {
    const migrate = await runOnce(['d1', 'migrations', 'apply', database, '--local', '--config', ENDPOINT, '--persist-to', state, ...extra]);
    if (migrate.code !== 0) {
      problems.push(`${label}: the local database's migrations failed\n${migrate.output}`);
      return;
    }
    const server = await serve(['--config', ENDPOINT, '--persist-to', state, '--test-scheduled', ...extra], port);
    try {
      const page = await get(server.base, '/');
      expectStatus(`${label}: GET /`, page.status, 200);
      if (!page.text.includes('<title>')) problems.push(`${label}: GET / is not the site's page`);
      expectStatus(`${label}: a usage count`, await post(server.base, '/api/count', '{"event":"visit"}'), 204);
      // The crash route builds the rate limiter on first use: five a minute from one address, then 429.
      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1) statuses.push(await post(server.base, '/api/crash', CRASH, { 'CF-Connecting-IP': '203.0.113.7' }));
      if (statuses.join(',') !== '204,204,204,204,204,429') problems.push(`${label}: six crash reports gave ${statuses.join(', ')}, expected five 204 then 429`);
      expectStatus(`${label}: an unknown API path`, (await get(server.base, '/api/nothing')).status, 404);
      expectStatus(`${label}: the daily schedule`, (await get(server.base, '/__scheduled?cron=17+4+*+*+*')).status, 200);
      // Give the runtime a moment to print anything a request made it log.
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (FAILURE.test(server.output())) problems.push(`${label}: the runtime reported an error\n${server.output()}`);
    } finally {
      server.stop();
    }
  } catch (error) {
    problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    rmSync(state, { recursive: true, force: true });
  }
}

async function checkSoon(port: number): Promise<void> {
  try {
    const server = await serve(['--config', SOON], port);
    try {
      const page = await get(server.base, '/');
      expectStatus('soon: GET /', page.status, 200);
      if (!page.text.includes('soon')) problems.push('soon: GET / is not the soon page');
      for (const path of ['/privacy', '/terms', '/anything-else']) expectStatus(`soon: GET ${path}`, (await get(server.base, path)).status, 200);
      if (FAILURE.test(server.output())) problems.push(`soon: the runtime reported an error\n${server.output()}`);
    } finally {
      server.stop();
    }
  } catch (error) {
    problems.push(`soon: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const which = process.argv[2] ?? 'all';
if (!['all', 'endpoint', 'soon'].includes(which)) {
  console.error('usage: node tooling/worker-runtime.ts [endpoint|soon]');
  process.exit(2);
}
if (which !== 'soon') {
  await checkEndpoint('app, test settings (elapsed-test)', 'elapsed-test', ['--env', 'test'], 8791);
  await checkEndpoint('app, production settings (elapsed)', 'elapsed', [], 8792);
}
if (which !== 'endpoint') await checkSoon(8793);

if (problems.length > 0) {
  console.error(`The Workers failed in Cloudflare's runtime (wrangler ${version} dev):\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`ok: ${which === 'all' ? 'the app\'s Worker (test and production settings) and the soon page' : which} started and answered in Cloudflare's runtime (wrangler ${version} dev)`);
}
