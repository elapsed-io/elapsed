import { describe, expect, it } from 'vitest';
import { durationParts } from './duration.ts';
import { isTimeZone, localDay, systemTimeZone } from './local-day.ts';

const at = (iso: string): number => Date.parse(iso);

describe('localDay', () => {
  it('counts the hours before 04:00 toward the previous day', () => {
    expect(localDay(at('2026-11-16T03:59:59Z'), 'UTC')).toBe('2026-11-15');
    expect(localDay(at('2026-11-16T04:00:00Z'), 'UTC')).toBe('2026-11-16');
    expect(localDay(at('2026-11-16T23:59:59Z'), 'UTC')).toBe('2026-11-16');
  });

  it('rolls back across month and year boundaries', () => {
    expect(localDay(at('2026-03-01T02:00:00Z'), 'UTC')).toBe('2026-02-28');
    expect(localDay(at('2028-03-01T02:00:00Z'), 'UTC')).toBe('2028-02-29');
    expect(localDay(at('2027-01-01T01:00:00Z'), 'UTC')).toBe('2026-12-31');
  });

  it('uses the local time of the given zone', () => {
    const instant = at('2026-11-16T07:30:00Z');
    expect(localDay(instant, 'America/Los_Angeles')).toBe('2026-11-15'); // 23:30 the day before
    expect(localDay(instant, 'Asia/Kolkata')).toBe('2026-11-16'); // 13:00
    expect(localDay(instant, 'Pacific/Auckland')).toBe('2026-11-16'); // 20:30
    expect(localDay(at('2026-11-15T22:00:00Z'), 'Asia/Kolkata')).toBe('2026-11-15'); // 03:30 on the 16th → previous day
  });

  it('follows daylight saving changes in local time', () => {
    // New York falls back at 06:00 UTC on 2026-11-01 (02:00 EDT becomes 01:00 EST).
    expect(localDay(at('2026-11-01T07:30:00Z'), 'America/New_York')).toBe('2026-10-31'); // 02:30 EST
    expect(localDay(at('2026-11-01T09:00:00Z'), 'America/New_York')).toBe('2026-11-01'); // 04:00 EST
    // Spring forward at 07:00 UTC on 2026-03-08 (02:00 EST becomes 03:00 EDT).
    expect(localDay(at('2026-03-08T07:30:00Z'), 'America/New_York')).toBe('2026-03-07'); // 03:30 EDT
    expect(localDay(at('2026-03-08T08:00:00Z'), 'America/New_York')).toBe('2026-03-08'); // 04:00 EDT
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(localDay(at('2026-11-16T03:00:00Z'), 'Mars/Olympus_Mons')).toBe('2026-11-15');
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isTimeZone('')).toBe(false);
    expect(isTimeZone(42)).toBe(false);
    expect(isTimeZone('Europe/Paris')).toBe(true);
  });

  it('reads a valid system time zone', () => {
    expect(isTimeZone(systemTimeZone())).toBe(true);
  });
});

describe('durationParts', () => {
  it('splits into whole hours, minutes and seconds', () => {
    expect(durationParts(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(durationParts(59_999)).toEqual({ hours: 0, minutes: 0, seconds: 59 });
    expect(durationParts(16 * 3_600_000)).toEqual({ hours: 16, minutes: 0, seconds: 0 });
    expect(durationParts(2 * 3_600_000 + 47 * 60_000 + 5_500)).toEqual({ hours: 2, minutes: 47, seconds: 5 });
  });

  it('treats negative durations as zero', () => {
    expect(durationParts(-5)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
});
