/**
 * Clock times such as "2:00 pm" (plan, Settings catalog > Appearance: clock
 * format, "follow region" by default; the setting arrives in round 6). The
 * browser's own locale data decides 12- or 24-hour time; the result is
 * lowercase like all interface text, with the narrow no-break spaces some
 * locales put before "am"/"pm" shown as ordinary spaces, as in the frames.
 */

let formatter: Intl.DateTimeFormat | null = null;

export function formatClockTime(at: number, format: Intl.DateTimeFormat = defaultFormatter()): string {
  return format
    .format(at)
    .replace(/[\u00a0\u202f]/g, ' ')
    .toLowerCase();
}

function defaultFormatter(): Intl.DateTimeFormat {
  formatter ??= new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  return formatter;
}
