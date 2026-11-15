/**
 * The local day a session counts toward: YYYY-MM-DD in the device's time
 * zone at the session's start, with the day ending at 04:00 so late-night
 * sessions count toward the previous day (plan, Data model; Open decisions).
 *
 * Stored times are UTC epoch milliseconds, so time zone and daylight saving
 * changes never affect elapsed time; they only decide which day a session
 * belongs to, once, when it starts.
 */

import { CONFIG } from '../config.ts';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The device's time zone, or UTC if the runtime cannot name one. */
export function systemTimeZone(): string {
  const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isTimeZone(zone) ? zone : 'UTC';
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value === '') return false;
  try {
    formatterFor(value);
    return true;
  } catch {
    return false;
  }
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * The local day for an instant. An unknown time zone falls back to UTC so a
 * bad value can never stop a session from starting.
 */
export function localDay(at: number, timeZone: string, boundaryHour: number = CONFIG.session.dayBoundaryHour): string {
  const zone = isTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Map(formatterFor(zone).formatToParts(at).map((part) => [part.type, part.value]));
  const year = Number(parts.get('year'));
  const month = Number(parts.get('month'));
  const day = Number(parts.get('day'));
  const hour = Number(parts.get('hour'));
  // Before the boundary, the instant belongs to the previous calendar day.
  // Calendar arithmetic in UTC is immune to the zone's own DST changes.
  const date = new Date(Date.UTC(year, month - 1, hour < boundaryHour ? day - 1 : day));
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}
