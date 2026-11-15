/**
 * Anonymous usage counts (plan, Principles > Private; Privacy): daily totals
 * of visits and sessions started, with nothing that identifies a person or
 * device. The site and the counting endpoint share this vocabulary, so the
 * endpoint validates exactly what the site sends.
 *
 * A request body is `{"event":"visit"}` or `{"event":"session"}` and nothing else.
 */

/** Where the site sends counts: the Worker on the site's own address. */
export const COUNT_PATH = '/api/count';

export const COUNT_EVENTS = ['visit', 'session'] as const;
export type CountEvent = (typeof COUNT_EVENTS)[number];

export function isCountEvent(value: unknown): value is CountEvent {
  return typeof value === 'string' && (COUNT_EVENTS as readonly string[]).includes(value);
}

export function countBody(event: CountEvent): string {
  return JSON.stringify({ event });
}

/** The event a request body counts, or null if the body is anything other than exactly one known event. */
export function parseCountBody(text: string): CountEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'event') return null;
  const event = (value as { readonly event: unknown }).event;
  return isCountEvent(event) ? event : null;
}
