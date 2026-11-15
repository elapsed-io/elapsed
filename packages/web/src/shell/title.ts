/**
 * The tab title (owner decision, 2026-11-15): "00:42 · name" while running,
 * "paused for 00:04 · name" while paused (the pause length), the name when
 * idle. All times hh:mm, so the title changes at most once a minute.
 * Round 4 adds "check in · 02:00 · name" while a check-in waits.
 */

import { BRAND, durationParts } from '@stopwatch/core';
import type { TimerView } from '@stopwatch/core';

const pad = (value: number): string => String(value).padStart(2, '0');

export function hoursMinutes(ms: number): string {
  const { hours, minutes } = durationParts(ms);
  return `${pad(hours)}:${pad(minutes)}`;
}

function fill(template: string, time: string): string {
  return template.replace('{time}', time).replace('{name}', BRAND.name);
}

export function titleFor(view: TimerView): string {
  const { title } = BRAND.copy;
  if (view.status === 'running') return fill(title.running, hoursMinutes(view.focusedMs));
  if (view.status === 'paused') return fill(title.paused, hoursMinutes(view.pausedForMs ?? 0));
  return fill(title.idle, '');
}
