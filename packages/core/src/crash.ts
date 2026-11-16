/**
 * Opt-in crash reports (plan, Privacy; owner changes, items 8 and 9): the
 * error message, its stack, the build version, and the browser's family and
 * major version, nothing else. The site and the endpoint share this module,
 * so the endpoint validates exactly what the site sends and scrubs it again.
 *
 * Scrubbing: query strings and fragments are cut from every URL, URLs from
 * any other origin (browser extensions, for one) are replaced, since they
 * say something about the device, and every quoted string is replaced, since
 * a message can quote a value someone typed.
 * Each report is at most 8 KB; the day is added by the endpoint.
 */

import { CONFIG } from './config.ts';

/** Where the site sends crash reports: the Worker on the site's own address. */
export const CRASH_PATH = '/api/crash';

export const BROWSER_FAMILIES = ['chrome', 'edge', 'firefox', 'safari', 'samsung', 'opera', 'other'] as const;
export type BrowserFamily = (typeof BROWSER_FAMILIES)[number];

export interface CrashReport {
  readonly message: string;
  readonly stack: string;
  /** The build: the site's script file name, which changes with every build. */
  readonly version: string;
  readonly browser: BrowserFamily;
  /** The browser's major version; 0 when unknown. */
  readonly browserVersion: number;
}

const FIELDS = ['message', 'stack', 'version', 'browser', 'browserVersion'] as const;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/;
const MAX_BROWSER_VERSION = 999;

/** Replaces URLs that are not the site's own. */
const OTHER_ORIGIN = '[other origin]';

/**
 * Cuts query strings and fragments from URLs, replaces other origins' URLs
 * and quoted strings, drops control characters, and caps the length.
 */
export function scrubCrashText(text: string, max: number, origin: string): string {
  const scrubbed = text
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s?#()'"`<>]*)[?#][^\s()'"`<>]*/gi, '$1')
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s()'"`<>]*/gi, (url) => (url === origin || url.startsWith(`${origin}/`) ? url : OTHER_ORIGIN))
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '"…"')
    // eslint-disable-next-line no-control-regex -- control characters are what this removes
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ');
  return scrubbed.length <= max ? scrubbed : `${scrubbed.slice(0, max - 1)}…`;
}

/** The browser family and major version from a user agent string; nothing else is kept from it. */
export function browserOf(userAgent: string): { readonly browser: BrowserFamily; readonly browserVersion: number } {
  const tests: readonly (readonly [BrowserFamily, RegExp])[] = [
    ['edge', /\bEdg(?:e|A|iOS)?\/(\d+)/],
    ['opera', /\bOPR\/(\d+)/],
    ['samsung', /\bSamsungBrowser\/(\d+)/],
    ['firefox', /\b(?:Firefox|FxiOS)\/(\d+)/],
    ['chrome', /\b(?:Chrome|CriOS)\/(\d+)/],
    ['safari', /\bVersion\/(\d+)[.\d]* (?:Mobile\/\S+ )?Safari\//],
  ];
  for (const [browser, pattern] of tests) {
    const match = pattern.exec(userAgent);
    if (match !== null) return { browser, browserVersion: Math.min(MAX_BROWSER_VERSION, Number(match[1])) };
  }
  return { browser: 'other', browserVersion: 0 };
}

const encoder = new TextEncoder();

/** The size of a report's request body in bytes. */
export function crashBodyBytes(report: CrashReport): number {
  return encoder.encode(crashBody(report)).byteLength;
}

/** A report from an error, scrubbed and cut until its request body fits the 8 KB limit. */
export function crashReport(input: {
  readonly message: string;
  readonly stack: string;
  readonly version: string;
  readonly userAgent: string;
  /** The site's own origin; URLs from any other are replaced. */
  readonly origin: string;
}): CrashReport {
  const { maxMessageChars, maxStackChars, maxVersionChars, maxBodyBytes } = CONFIG.crashReports;
  const version = input.version.slice(0, maxVersionChars);
  let report: CrashReport = {
    message: scrubCrashText(input.message, maxMessageChars, input.origin),
    stack: scrubCrashText(input.stack, maxStackChars, input.origin),
    version: VERSION.test(version) ? version : 'unknown',
    ...browserOf(input.userAgent),
  };
  // Escaped and multi-byte characters can make the body longer than its characters; the stack gives way first.
  while (crashBodyBytes(report) > maxBodyBytes) {
    const excess = crashBodyBytes(report) - maxBodyBytes;
    const stack = report.stack.length > 0 ? report.stack.slice(0, Math.max(0, report.stack.length - excess - 1)) : '';
    const message = report.stack.length > 0 ? report.message : report.message.slice(0, Math.max(0, report.message.length - excess - 1));
    report = { ...report, stack, message };
  }
  return report;
}

export function crashBody(report: CrashReport): string {
  return JSON.stringify({
    message: report.message,
    stack: report.stack,
    version: report.version,
    browser: report.browser,
    browserVersion: report.browserVersion,
  });
}

/** The report a request body carries, scrubbed again for `origin`, or null if the body is anything else. */
export function parseCrashBody(text: string, origin: string): CrashReport | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== [...FIELDS].sort().join(',')) return null;
  const record = value as Record<string, unknown>;
  const { message, stack, version, browser, browserVersion } = record;
  const { maxMessageChars, maxStackChars, maxVersionChars } = CONFIG.crashReports;
  if (typeof message !== 'string' || message.length > maxMessageChars) return null;
  if (typeof stack !== 'string' || stack.length > maxStackChars) return null;
  if (typeof version !== 'string' || version.length > maxVersionChars || !VERSION.test(version)) return null;
  if (typeof browser !== 'string' || !(BROWSER_FAMILIES as readonly string[]).includes(browser)) return null;
  if (typeof browserVersion !== 'number' || !Number.isInteger(browserVersion) || browserVersion < 0 || browserVersion > MAX_BROWSER_VERSION) return null;
  return {
    message: scrubCrashText(message, maxMessageChars, origin),
    stack: scrubCrashText(stack, maxStackChars, origin),
    version,
    browser: browser as BrowserFamily,
    browserVersion,
  };
}
