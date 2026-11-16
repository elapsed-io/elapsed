/**
 * Opt-in crash reports (plan, Privacy; Settings catalog > Privacy and data:
 * off by default). When switched on, an uncaught error or rejected promise on
 * this page is sent to the site's own endpoint as the error, its stack, the
 * build and the browser's family and major version, scrubbed by `core`.
 *
 * - Nothing is sent while the setting is off, and nothing is stored.
 * - At most 5 reports a page, each different, so a loop cannot flood.
 * - Errors from other origins' scripts (browser extensions) are not sent.
 * - A report that cannot be sent (offline) is lost, by design.
 */

import { CONFIG, CRASH_PATH, crashBody, crashReport } from '@stopwatch/core';

/** The build: the name of the script this module is bundled into, which changes with every build. */
export function buildVersion(moduleUrl: string): string {
  const file = new URL(moduleUrl).pathname.split('/').pop() ?? '';
  return file.replace(/\.[a-z]+$/i, '') || 'unknown';
}

export class CrashReporter {
  readonly #win: Window;
  readonly #enabled: () => boolean;
  readonly #version: string;
  readonly #sent = new Set<string>();

  constructor(win: Window, enabled: () => boolean, version: string = buildVersion(import.meta.url)) {
    this.#win = win;
    this.#enabled = enabled;
    this.#version = version;
  }

  /** Listens for uncaught errors (including the site's own reportError) and unhandled rejections. */
  attach(): void {
    this.#win.addEventListener('error', (event) => {
      // Another origin's script: the browser hides its details, and it is not the site's error.
      if (event.filename !== '' && !event.filename.startsWith(this.#win.location.origin)) return;
      this.send(event.error ?? event.message);
    });
    this.#win.addEventListener('unhandledrejection', (event) => {
      this.send(event.reason);
    });
  }

  send(error: unknown): void {
    if (!this.#enabled() || this.#sent.size >= CONFIG.crashReports.maxPerPage) return;
    const message = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === 'string' ? error : 'unknown error';
    const stack = error instanceof Error ? (error.stack ?? '') : '';
    const report = crashReport({ message, stack, version: this.#version, userAgent: this.#win.navigator.userAgent, origin: this.#win.location.origin });
    const body = crashBody(report);
    if (this.#sent.has(body)) return;
    this.#sent.add(body);
    this.#win
      .fetch(CRASH_PATH, {
        method: 'POST',
        body,
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        keepalive: true,
      })
      .catch(() => {
        // Offline or blocked: the report is lost, by design.
      });
  }
}
