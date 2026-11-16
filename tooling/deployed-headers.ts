/**
 * The release review's "the CSP and headers are verified on the deployed
 * build, not only locally" (plan, Release review): what a deployed response
 * must carry, read from the same `_headers` file that was deployed, and how a
 * live response is judged against it. `check-deployed.ts` runs it against an
 * address; this module has no network code, so it is unit-tested.
 */

export type Headers = Readonly<Record<string, string>>;

export interface HeaderRule {
  readonly path: string;
  readonly headers: Headers;
}

/** Reads Cloudflare's `_headers` format: a path pattern, then indented `Name: value` lines. */
export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: { path: string; headers: Record<string, string> }[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (/^\S/.test(line)) {
      rules.push({ path: line.trim(), headers: {} });
      continue;
    }
    const rule = rules.at(-1);
    const colon = line.indexOf(':');
    if (rule === undefined || colon < 0) throw new Error(`not a header line: ${line}`);
    rule.headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  return rules;
}

/** Whether a `_headers` pattern matches a path: `*` is any run of characters, as Cloudflare reads it. */
export function matches(pattern: string, path: string): boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}$`).test(path);
}

/** Every header the rules give a path (later rules add to earlier ones). */
export function expectedFor(rules: readonly HeaderRule[], path: string): Headers {
  return Object.assign({}, ...rules.filter((rule) => matches(rule.path, path)).map((rule) => rule.headers)) as Headers;
}

export interface LiveResponse {
  readonly path: string;
  readonly status: number;
  /** Header names in lower case; `set-cookie` holds every cookie's name. */
  readonly headers: Headers;
  readonly cookies: readonly string[];
  readonly location: string | null;
}

/** The one cookie allowed: Cloudflare Access's own, set only while the test run is behind Access. */
export const ACCESS_COOKIE = 'CF_Authorization';

/** What is wrong with a live response, as sentences; empty when it is right. */
export function judge(response: LiveResponse, expected: Headers, options: { readonly status: number; readonly behindAccess: boolean }): string[] {
  const problems: string[] = [];
  if (response.location !== null && /cloudflareaccess\.com/.test(response.location)) {
    return [`${response.path}: Cloudflare Access asked for a sign-in; set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET to a service token`];
  }
  if (response.status !== options.status) problems.push(`${response.path}: status ${String(response.status)}, expected ${String(options.status)}`);
  for (const [name, value] of Object.entries(expected)) {
    const actual = response.headers[name];
    if (actual === undefined) problems.push(`${response.path}: no ${name} header`);
    else if (actual !== value) problems.push(`${response.path}: ${name} is "${actual}", expected "${value}"`);
  }
  for (const cookie of response.cookies) {
    if (!(options.behindAccess && cookie === ACCESS_COOKIE)) problems.push(`${response.path}: sets a cookie, ${cookie} (the privacy page says there are none)`);
  }
  return problems;
}
