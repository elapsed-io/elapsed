/**
 * Clock times such as "2:00 pm" (plan, Settings catalog > Appearance: clock
 * format, "follow region" by default). Follow region lets the browser's own
 * locale data decide 12- or 24-hour time; the other two force it. Elapsed
 * time is unaffected and always reads hh:mm.
 *
 * The result is lowercase like all interface text, with the narrow no-break
 * spaces some locales put before "am"/"pm" shown as ordinary spaces, as in
 * the frames.
 */

import type { ClockFormat } from '@stopwatch/core';

let clockFormat: ClockFormat = 'region';
let formatter: Intl.DateTimeFormat | null = null;

export function formatterFor(format: ClockFormat, locale?: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (format === '12h') options.hourCycle = 'h12';
  if (format === '24h') options.hourCycle = 'h23';
  return new Intl.DateTimeFormat(locale, options);
}

/** Changes the clock format for every clock time shown from now on. */
export function setClockFormat(format: ClockFormat): void {
  if (format === clockFormat) return;
  clockFormat = format;
  formatter = null;
}

export function formatClockTime(at: number, format: Intl.DateTimeFormat = defaultFormatter()): string {
  return format
    .format(at)
    .replace(/[\u00a0\u202f]/g, ' ')
    .toLowerCase();
}

function defaultFormatter(): Intl.DateTimeFormat {
  formatter ??= formatterFor(clockFormat);
  return formatter;
}
