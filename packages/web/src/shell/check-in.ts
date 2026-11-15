/**
 * Answering a check-in from the keyboard (plan, Session lifecycle: "a short
 * line asks for any key, click or tap"). Every key answers. A key without
 * modifiers is then consumed, so the answering key press does nothing else
 * (Space does not also pause). Keys with modifiers still reach the browser,
 * so its own shortcuts keep working, Tab still moves focus, and a key typed
 * into a text field (settings, from round 6) still types.
 */

import { isTypingTarget } from './shortcuts.ts';
import type { TargetLike } from './shortcuts.ts';

export interface AnswerKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

export function answersCheckIn(event: AnswerKey, target: TargetLike | null = null): 'consume' | 'pass' {
  if (event.ctrlKey || event.metaKey || event.altKey) return 'pass';
  if (isTypingTarget(target)) return 'pass';
  if (event.key === 'Tab') return 'pass';
  return 'consume';
}
