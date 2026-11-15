/**
 * Keyboard shortcuts (plan, Settings catalog > Timer): fixed, with no modifier
 * keys so they never clash with browser shortcuts, and never while typing.
 * Space starts, pauses and resumes; E ends. Comma (settings) arrives in round 6.
 */

export type Shortcut = 'toggle' | 'end';

export interface KeyLike {
  readonly key: string;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly defaultPrevented: boolean;
}

export interface TargetLike {
  readonly tagName?: string;
  readonly isContentEditable?: boolean;
}

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
/** Controls that act on Space themselves. */
const ACTIVATES_ON_SPACE = new Set(['BUTTON', 'A', 'SUMMARY']);

/** Whether keys pressed on `target` type text. */
export function isTypingTarget(target: TargetLike | null): boolean {
  return TYPING.has(target?.tagName?.toUpperCase() ?? '') || target?.isContentEditable === true;
}

export function shortcutFor(event: KeyLike, target: TargetLike | null): Shortcut | null {
  if (event.defaultPrevented || event.repeat || event.isComposing) return null;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null;
  const tag = target?.tagName?.toUpperCase() ?? '';
  if (isTypingTarget(target)) return null;
  if (event.key === ' ') return ACTIVATES_ON_SPACE.has(tag) ? null : 'toggle';
  if (event.key === 'e' || event.key === 'E') return 'end';
  return null;
}
