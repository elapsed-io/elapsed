/**
 * Cleans custom CSS when it is saved (plan, Custom CSS safety, defence 4).
 * Loaded only with the editor: pages apply the stored, cleaned CSS directly.
 *
 * The browser's own CSS parser reads the text (a constructed stylesheet, which
 * never loads anything), and the rules are walked with the allowlist from
 * `core`: an at-rule not on it is removed with its contents, and so is every
 * declaration that `checkDeclaration` refuses. The text itself is also read
 * with `core`'s tokenizer, because a constructed stylesheet silently skips
 * some things (an @import, an invalid declaration) that must not be kept as
 * text either.
 *
 * - Nothing to remove: the text is kept exactly as typed, comments and all.
 * - Something removed: the CSS is rebuilt from what the parser kept, and the
 *   rebuilt text is read once more; any rule it still flags is dropped.
 */

import { checkDeclaration, fitsCustomCss, isCleanCss, isCleanScan, isKeptAtRule, scanCss, splitDeclarations } from '@stopwatch/core/custom-css';

export type CleanResult =
  | { readonly ok: true; readonly css: string; /** Whether anything was removed. */ readonly changed: boolean }
  | { readonly ok: false; readonly problem: 'too-large' };

/** The at-rule's name, or null for a style rule, nested declarations or a keyframe. */
function atRuleName(rule: CSSRule): string | null {
  return /^@(-?[a-z][a-z0-9-]*)/i.exec(rule.cssText)?.[1]?.toLowerCase() ?? null;
}

/** The text before an at-rule's block (or all of a statement such as `@layer a, b;`). */
function prelude(rule: CSSRule): string {
  const text = rule.cssText;
  const brace = text.indexOf('{');
  return brace < 0 ? text : text.slice(0, brace);
}

function hasStyle(rule: CSSRule): rule is CSSRule & { readonly style: CSSStyleDeclaration } {
  return 'style' in rule && rule.style instanceof CSSStyleDeclaration;
}

function childRules(rule: CSSRule): CSSRuleList | null {
  return 'cssRules' in rule && rule.cssRules instanceof CSSRuleList ? rule.cssRules : null;
}

/**
 * Deletes a rule. Some deletions throw (an @namespace rule while other rules
 * follow it); such a rule is left for the rebuild, which drops it as text.
 */
function deleteChild(parent: CSSStyleSheet | CSSRule, index: number): void {
  try {
    if (parent instanceof CSSStyleSheet || parent instanceof CSSGroupingRule) parent.deleteRule(index);
    else if (parent instanceof CSSKeyframesRule) parent.deleteRule((parent.cssRules[index] as CSSKeyframeRule).keyText);
  } catch {
    // Counted as removed all the same, so the CSS is rebuilt.
  }
}

/**
 * Removes refused declarations from one block; returns how many. The block is
 * read as the browser writes it, with shorthands whole, so `background:
 * url(…) red` goes as one declaration rather than leaving its other parts
 * spelled out.
 */
function cleanDeclarations(style: CSSStyleDeclaration): number {
  const declarations = splitDeclarations(style.cssText);
  const kept = declarations.filter((declaration) => checkDeclaration(declaration.property, declaration.value) === 'keep');
  if (kept.length === declarations.length) return 0;
  style.cssText = kept.map((declaration) => `${declaration.text};`).join(' ');
  return declarations.length - kept.length;
}

/** Cleans a list of rules in place; returns how many rules and declarations were removed. */
function cleanRules(parent: CSSStyleSheet | CSSRule, rules: CSSRuleList): number {
  let removed = 0;
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];
    if (rule === undefined) continue;
    const name = atRuleName(rule);
    if (name !== null && (!isKeptAtRule(name) || !isCleanScan(scanCss(prelude(rule).slice(name.length + 1))))) {
      deleteChild(parent, index);
      removed += 1;
      continue;
    }
    if (name === null && rule instanceof CSSStyleRule && !isCleanScan(scanCss(rule.selectorText), false)) {
      deleteChild(parent, index);
      removed += 1;
      continue;
    }
    if (hasStyle(rule)) removed += cleanDeclarations(rule.style);
    const children = childRules(rule);
    if (children !== null) removed += cleanRules(rule, children);
  }
  return removed;
}

/** Cleans custom CSS as typed. Refuses text over the size limit rather than cutting it. */
export function cleanCss(text: string): CleanResult {
  if (!fitsCustomCss(text)) return { ok: false, problem: 'too-large' };
  if (text.trim() === '') return { ok: true, css: '', changed: false };
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  const removed = cleanRules(sheet, sheet.cssRules);
  if (removed === 0 && isCleanCss(text)) return { ok: true, css: text, changed: false };
  // Rebuilt from what the parser kept; a rule the text check still flags is left out.
  const rebuilt = Array.from(sheet.cssRules, (rule) => rule.cssText).filter((rule) => isCleanCss(rule));
  return { ok: true, css: rebuilt.join('\n'), changed: true };
}
