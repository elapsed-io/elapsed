/**
 * The time in words, for screen readers (plan, Decisions > Interface: "the
 * time can always be read on demand"). "00:42" read aloud is ambiguous;
 * "42 minutes" is not. Seconds are spoken only while they are shown.
 */

import { BRAND, durationParts } from '@stopwatch/core';

const words = BRAND.copy.timer.spoken;

function unit(n: number, one: string, many: string): string {
  return n === 1 ? one : many.replace('{n}', String(n));
}

export function spokenDuration(ms: number, withSeconds: boolean): string {
  const { hours, minutes, seconds } = durationParts(ms);
  const parts: string[] = [];
  if (hours > 0) parts.push(unit(hours, words.hour, words.hours));
  if (minutes > 0 || (hours === 0 && !withSeconds)) parts.push(unit(minutes, words.minute, words.minutes));
  if (withSeconds && (seconds > 0 || parts.length === 0)) parts.push(unit(seconds, words.second, words.seconds));
  return parts.join(' ');
}
