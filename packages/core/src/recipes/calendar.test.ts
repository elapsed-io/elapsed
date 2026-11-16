import { describe, expect, it } from 'vitest';
import { LUNATION_DAYS, calendarDay, calendarShare, moonAge } from './calendar.ts';

describe('the perpetual calendar a calendar cycle counts', () => {
  it('starts on Monday 1 January 2024, a leap year', () => {
    expect(calendarDay(0)).toEqual({ date: 1, monthDays: 31, month: 1, weekday: 0, leapYear: 4, year: 2024 });
  });

  it('steps through months of their own lengths, February 29 in the leap year only', () => {
    expect(calendarDay(30)).toMatchObject({ date: 31, month: 1 });
    expect(calendarDay(59)).toMatchObject({ date: 29, month: 2, monthDays: 29, weekday: 3 });
    expect(calendarDay(60)).toMatchObject({ date: 1, month: 3 });
    expect(calendarDay(365)).toMatchObject({ date: 31, month: 12, year: 2024 });
    expect(calendarDay(366)).toMatchObject({ date: 1, month: 1, year: 2025, leapYear: 1 });
    expect(calendarDay(366 + 58)).toMatchObject({ date: 28, month: 2, monthDays: 28 });
    expect(calendarDay(366 + 59)).toMatchObject({ date: 1, month: 3 });
    expect(calendarDay(366 + 365 * 2)).toMatchObject({ year: 2027, leapYear: 3 });
    expect(calendarDay(366 + 365 * 3)).toMatchObject({ year: 2028, leapYear: 4, date: 1 });
  });

  it('keeps 2100 a common year, as a perpetual calendar must', () => {
    const day = (Date.UTC(2100, 1, 28) - Date.UTC(2024, 0, 1)) / 86_400_000;
    expect(calendarDay(day)).toMatchObject({ date: 28, month: 2, monthDays: 28, year: 2100 });
    expect(calendarDay(day + 1)).toMatchObject({ date: 1, month: 3 });
  });

  it('shows the real moon of the date: new on 11 January 2024, full about 25 January', () => {
    const newMoon = (Date.UTC(2024, 0, 11, 11, 57) - Date.UTC(2024, 0, 1)) / 86_400_000;
    expect(moonAge(newMoon + 0.5)).toBeCloseTo(0.5, 6);
    expect(moonAge(newMoon + 14.77)).toBeCloseTo(14.77, 6);
    expect(moonAge(newMoon + LUNATION_DAYS + 1)).toBeCloseTo(1, 6);
    // On 1 January 2024 the moon was about 19 days old (full on 26 December 2023).
    expect(moonAge(0)).toBeCloseTo(19.03, 1);
    // The disc turns half a turn a lunation: a quarter turn brings the full moon to the top.
    expect(calendarShare('moon', newMoon + LUNATION_DAYS / 2)).toBeCloseTo(0.25, 6);
  });

  it('points each hand at its place', () => {
    expect(calendarShare('date', 59)).toBeCloseTo(28 / 31, 12);
    expect(calendarShare('weekday', 6)).toBeCloseTo(6 / 7, 12);
    expect(calendarShare('month', 59)).toBeCloseTo(1 / 12, 12);
    expect(calendarShare('leap-year', 0)).toBe(0.75);
  });
});
