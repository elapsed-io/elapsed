import { describe, expect, it } from 'vitest';
import { BRAND, computeView, createSession, pauseSession } from '@stopwatch/core';
import { MODE_CHOICES } from '@stopwatch/core';
import { MODE_MANIFESTS } from '../modes/manifests.ts';
import { shortcutFor } from './shortcuts.ts';
import type { KeyLike } from './shortcuts.ts';
import { formatClockTime } from './clock-time.ts';
import { hoursMinutes, titleFor } from './title.ts';

const key = (overrides: Partial<KeyLike>): KeyLike => ({
  key: ' ',
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  defaultPrevented: false,
  ...overrides,
});

describe('shortcuts', () => {
  it('maps space to start, pause and resume, and E to end', () => {
    expect(shortcutFor(key({}), { tagName: 'BODY' })).toBe('toggle');
    expect(shortcutFor(key({ key: 'e' }), { tagName: 'BODY' })).toBe('end');
    expect(shortcutFor(key({ key: 'E' }), null)).toBe('end');
    expect(shortcutFor(key({ key: ',' }), { tagName: 'BUTTON' })).toBe('settings');
  });

  it.each([
    ['a modifier', key({ ctrlKey: true })],
    ['meta', key({ metaKey: true })],
    ['alt', key({ altKey: true })],
    ['shift', key({ shiftKey: true })],
    ['a held key', key({ repeat: true })],
    ['composition', key({ isComposing: true })],
    ['a handled event', key({ defaultPrevented: true })],
    ['another key', key({ key: 'x' })],
  ])('ignores %s', (_label, event) => {
    expect(shortcutFor(event, { tagName: 'BODY' })).toBeNull();
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'input'])('never fires while typing in %s', (tagName) => {
    expect(shortcutFor(key({}), { tagName })).toBeNull();
    expect(shortcutFor(key({ key: 'e' }), { tagName })).toBeNull();
  });

  it('never fires in editable content', () => {
    expect(shortcutFor(key({ key: 'e' }), { tagName: 'DIV', isContentEditable: true })).toBeNull();
  });

  it('leaves space to a focused button, which activates itself', () => {
    expect(shortcutFor(key({}), { tagName: 'BUTTON' })).toBeNull();
    expect(shortcutFor(key({ key: 'e' }), { tagName: 'BUTTON' })).toBe('end');
  });
});

describe('tab title', () => {
  const ID = '3f2c8a4e-9b1d-4c7a-8e5f-1a2b3c4d5e6f';
  const T0 = Date.UTC(2026, 10, 16, 14, 0, 0);
  const session = createSession({ id: ID, mode: 'digits', at: T0, timeZone: 'UTC' });

  it('formats hh:mm', () => {
    expect(hoursMinutes(0)).toBe('00:00');
    expect(hoursMinutes(59_999)).toBe('00:00');
    expect(hoursMinutes(42 * 60_000)).toBe('00:42');
    expect(hoursMinutes(16 * 3_600_000)).toBe('16:00');
  });

  it('follows the owner decision for each state', () => {
    expect(titleFor(computeView(null, T0, 'blur-away'))).toBe(BRAND.name);
    expect(titleFor(computeView(session, T0 + 42 * 60_000 + 30_000, 'blur-away'))).toBe(`00:42 · ${BRAND.name}`);
    const paused = pauseSession(session, T0 + 60_000);
    expect(titleFor(computeView(paused, T0 + 60_000 + 4 * 60_000 + 59_000, 'blur-away'))).toBe(`paused for 00:04 · ${BRAND.name}`);
    const waiting = computeView(session, T0 + 2 * 3_600_000 + 30_000, 'blur-away', { checkInDueAt: T0 + 2 * 3_600_000 });
    expect(titleFor(waiting)).toBe(`check in · 02:00 · ${BRAND.name}`);
  });
});

describe('clock times', () => {
  const at = Date.UTC(2026, 10, 16, 14, 0, 0);
  const format = (locale: string): Intl.DateTimeFormat =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

  it('read like the frame: lowercase, with a plain space before am or pm', () => {
    expect(formatClockTime(at, format('en-US'))).toBe('2:00 pm');
  });

  it('follow the region’s 24-hour clock', () => {
    expect(formatClockTime(at, format('en-GB'))).toBe('14:00');
  });
});

describe('mode manifests', () => {
  it('lists the modes built so far, digits in the core tier, matching the settings schema', () => {
    expect(MODE_MANIFESTS.map((m) => m.id)).toEqual([...MODE_CHOICES]);
    expect(MODE_MANIFESTS.map((m) => [m.id, m.tier])).toEqual([
      ['digits', 'core'],
      ['ring', 'on-choice'],
      ['timeline', 'on-choice'],
      ['analog', 'on-choice'],
      ['ocean', 'on-choice'],
    ]);
    for (const manifest of MODE_MANIFESTS) {
      expect(manifest.name).toBe(manifest.name.toLowerCase());
      expect(manifest.budget.codeBytes).toBe(30 * 1024);
    }
  });
});
