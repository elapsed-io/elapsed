/**
 * Each download's ceiling, compressed (round 2.10: creep fails the round it happens in). The plan's budgets
 * (CONFIG.budgets: the core's 50 KB of JavaScript and 150 KB in all, 30 KB of code a mode) stay what they are; these
 * ceilings sit just above what each download measured when it was last changed on purpose (about 5 % over, to the
 * next half kilobyte), and the size check fails the moment one is passed. Raising one is a decision: record it
 * (docs/decisions.md) with the change that needs it. A download with no ceiling fails too, so a new one is budgeted
 * the round it appears.
 */

const KB = 1024;

export interface Ceiling {
  readonly code: number;
  readonly art: number;
}

/** What the first visit downloads (scripts/size-budget.ts, coreFiles): 39.8 KB of JavaScript and 68.9 KB in all. */
export const CORE_CEILING = { javascriptBytes: 42 * KB, totalBytes: 72.5 * KB } as const;

/** Every other download, by its id in scripts/downloads.ts; code and art in kilobytes, as measured in round 2.10. */
const CEILINGS_KB: Readonly<Record<string, Ceiling>> = {
  'mode:analog': { code: 5.0, art: 0.0 }, // 4.66 / 0.00
  'mode:ocean': { code: 28.0, art: 1.5 }, // 26.65 / 1.22
  'mode:height': { code: 28.0, art: 4.0 }, // 26.58 / 3.35
  'mode:tree': { code: 8.5, art: 11.0 }, // 7.69 / 10.11
  'mode:interstellar': { code: 24.5, art: 19.0 }, // 22.94 / 17.83
  'piece:dial': { code: 4.5, art: 0.0 }, // 4.19
  'piece:tree': { code: 6.5, art: 11.0 }, // 6.00 / 10.11
  'piece:particles': { code: 7.0, art: 0.0 }, // 6.38
  'piece:starfield': { code: 4.5, art: 0.0 }, // 3.88
  'piece:circles': { code: 3.0, art: 0.0 }, // 2.69
  'piece:shape': { code: 3.0, art: 0.0 }, // 2.43
  'piece:path': { code: 3.0, art: 0.0 }, // 2.71
  'piece:landmarks': { code: 5.5, art: 0.0 }, // 4.89
  'view:strip': { code: 2.0, art: 0.0 }, // 1.47
  'view:rings-per-hour': { code: 2.5, art: 0.0 }, // 2.25
  'view:profile': { code: 16.5, art: 0.0 }, // 15.66
  'view:scene': { code: 7.5, art: 11.0 }, // 7.07 / 10.11
  'view:scene-camera': { code: 12.0, art: 0.0 }, // 11.30
  'environment:light-falloff': { code: 1.5, art: 0.0 }, // 1.42
  'environment:stops': { code: 0.5, art: 0.0 }, // 0.35
  camera: { code: 2.5, art: 0.0 }, // 1.95
  'part:settings panel': { code: 17.0, art: 0.0 }, // 16.14 (round 2.12: the test modes' tiles and options moved out)
  'part:results': { code: 4.0, art: 0.0 }, // 3.64
  'part:custom CSS editor': { code: 3.5, art: 0.0 }, // 3.22
  'part:test modes (flagged visits)': { code: 1.5, art: 0.0 }, // 1.10 (round 2.12)
  'part:test-mode settings (flagged visits)': { code: 5.5, art: 0.0 }, // 5.01 (round 2.12)
  'part:downloaded modes list': { code: 1.0, art: 0.0 }, // 0.92
  'part:image store': { code: 1.0, art: 0.0 }, // 0.93
  'part:service worker': { code: 3.0, art: 0.0 }, // 2.40
  'part:credits page theme': { code: 0.5, art: 0.0 }, // 0.29 (round 2.14; the theme code it uses is the core's)
};

/** A download's ceiling in bytes, or undefined if it has none. */
export function ceilingOf(id: string): Ceiling | undefined {
  const kb = CEILINGS_KB[id];
  return kb === undefined ? undefined : { code: kb.code * KB, art: kb.art * KB };
}

export const CEILING_IDS: readonly string[] = Object.keys(CEILINGS_KB);
