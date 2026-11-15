import { describe, expect, it } from 'vitest';
import { isCountedNavigation } from '../counts/client.ts';
import { parseControl } from '../offline/register.ts';
import { answersCheckIn } from './check-in.ts';

const key = (key: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers,
});

describe('answering a check-in from the keyboard', () => {
  it('consumes the answering key, so Space or E does nothing else', () => {
    for (const name of [' ', 'e', 'Enter', 'a', 'Escape', 'Shift', 'ArrowDown']) expect(answersCheckIn(key(name)), name).toBe('consume');
  });

  it('lets browser shortcuts and focus movement through', () => {
    expect(answersCheckIn(key('t', { ctrlKey: true }))).toBe('pass');
    expect(answersCheckIn(key('r', { metaKey: true }))).toBe('pass');
    expect(answersCheckIn(key('Tab'))).toBe('pass');
  });

  it('never swallows a key typed into a text field', () => {
    expect(answersCheckIn(key('e'), { tagName: 'INPUT' })).toBe('pass');
    expect(answersCheckIn(key(' '), { tagName: 'DIV', isContentEditable: true })).toBe('pass');
    expect(answersCheckIn(key(' '), { tagName: 'BUTTON' })).toBe('consume');
  });
});

describe('counting visits', () => {
  it('counts a page load unless it is a reload or a back-and-forward navigation', () => {
    expect(isCountedNavigation('navigate')).toBe(true);
    expect(isCountedNavigation('prerender')).toBe(true);
    expect(isCountedNavigation(undefined)).toBe(true);
    expect(isCountedNavigation('reload')).toBe(false);
    expect(isCountedNavigation('back_forward')).toBe(false);
  });
});

describe('the offline kill switch', () => {
  it('reads only an exact on or off', () => {
    expect(parseControl('{"serviceWorker":"off"}')).toBe('off');
    expect(parseControl('{"serviceWorker":"on"}')).toBe('on');
    for (const text of ['', 'off', '{"serviceWorker":false}', '{"serviceWorker":"off","x":1}', '[]', 'null']) {
      expect(parseControl(text), text).toBeNull();
    }
  });
});
