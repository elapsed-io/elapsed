const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export interface DurationParts {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/** Splits a duration into whole hours, minutes and seconds, rounding down. Negative input counts as zero. */
export function durationParts(ms: number): DurationParts {
  const total = Math.max(0, Math.floor(ms));
  return {
    hours: Math.floor(total / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
    seconds: Math.floor((total % MINUTE) / SECOND),
  };
}
