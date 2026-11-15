/**
 * Answering a check-in from the keyboard (plan, Session lifecycle: "a short
 * line asks for any key, click or tap"). Every key answers. A key without
 * modifiers is then consumed, so the answering key press does nothing else
 * (Space does not also pause). Keys with modifiers still reach the browser,
 * so its own shortcuts keep working, and Tab still moves focus.
 */

export interface AnswerKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

export function answersCheckIn(event: AnswerKey): 'consume' | 'pass' {
  if (event.ctrlKey || event.metaKey || event.altKey) return 'pass';
  if (event.key === 'Tab') return 'pass';
  return 'consume';
}
