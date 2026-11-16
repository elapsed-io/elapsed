/**
 * The calendar a recipe's calendar cycle counts (docs/recipes/mode-recipes.md, cycles): a Gregorian perpetual
 * calendar whose days are the cycle's `minutes` of focus, from Monday 1 January 2024 (a leap year), so a session
 * steps through months of 28, 29, 30 and 31 days and through the four-year leap cycle as a perpetual calendar
 * does, and its moon is the real moon of the date it shows.
 */

const DAY_MS = 86_400_000;
/** Day 0: Monday 1 January 2024, 00:00 UTC. */
const EPOCH = Date.UTC(2024, 0, 1);
/** The mean synodic month, in days. */
export const LUNATION_DAYS = 29.530588853;
/** A new moon (11 January 2024, 11:57 UTC), as days from the epoch. */
const NEW_MOON_DAY = (Date.UTC(2024, 0, 11, 11, 57) - EPOCH) / DAY_MS;

export interface CalendarDay {
  /** Day of the month, 1 to 31. */
  readonly date: number;
  /** How many days this month has (28 to 31). */
  readonly monthDays: number;
  /** Month, 1 (January) to 12. */
  readonly month: number;
  /** Day of the week, 0 (Monday) to 6 (Sunday). */
  readonly weekday: number;
  /** The year's place in the leap cycle, 1 to 4, 4 being the leap year. */
  readonly leapYear: number;
  readonly year: number;
}

const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** The calendar on day `day` (0 = Monday 1 January 2024), counting whole days. */
export function calendarDay(day: number): CalendarDay {
  const at = new Date(EPOCH + Math.floor(Math.max(0, day)) * DAY_MS);
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth() + 1;
  return {
    date: at.getUTCDate(),
    monthDays: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    month,
    weekday: (at.getUTCDay() + 6) % 7,
    // 2021 was the first year after a leap year: 2021 is 1, 2024 is 4.
    leapYear: isLeap(year) ? 4 : Math.min(3, (((year - 2021) % 4) + 4) % 4 + 1),
    year,
  };
}

/** The moon's age on day `day` (fractions of a day count), 0 (new) to the lunation's length. */
export function moonAge(day: number): number {
  const age = (Math.max(0, day) - NEW_MOON_DAY) % LUNATION_DAYS;
  return age < 0 ? age + LUNATION_DAYS : age;
}

/** Which part of a calendar a subdial shows, and how many places its hand has. */
export type CalendarPart = 'date' | 'weekday' | 'month' | 'leap-year' | 'moon';
export const CALENDAR_PLACES: Readonly<Record<Exclude<CalendarPart, 'moon'>, number>> = { date: 31, weekday: 7, month: 12, 'leap-year': 4 };

/**
 * Where a calendar subdial's hand points on day `day`, as a share of a turn: the date, the weekday, the month or the
 * leap year's place (each a step, as a perpetual calendar jumps at midnight); the moon disc's half turn per lunation.
 */
export function calendarShare(part: CalendarPart, day: number): number {
  if (part === 'moon') return moonAge(day) / LUNATION_DAYS / 2;
  const at = calendarDay(day);
  const place = part === 'date' ? at.date - 1 : part === 'weekday' ? at.weekday : part === 'month' ? at.month - 1 : at.leapYear - 1;
  return place / CALENDAR_PLACES[part];
}
