/**
 * Applies the user's custom CSS (plan, Custom CSS safety, defences 3 and 5):
 * one constructed stylesheet, adopted by the document (never a <style>
 * element, which the CSP refuses), with every rule placed in the `user`
 * cascade layer and scoped to the timer view, `.view`.
 *
 * The scope is the view's wrapper, not `.screen` itself: inside `@scope`, a
 * selector reads as `:scope <selector>`, so the published `.screen …`
 * selectors must sit below the scope root to match. The wrapper's isolation
 * is locked in the base layer (main.css), so `:scope` cannot undo it.
 *
 * The CSS arrives already cleaned (it was cleaned when saved), so this module
 * does not load the checker. It parses the text once and inserts each rule
 * into the scope by itself, so no text can close the scope or the layer early
 * and style the settings panel or anything else outside the timer view.
 * Keyframes are not scoped (they select nothing), so they go in the layer.
 */

/** The timer view's wrapper: user rules match only it and what it holds. */
export const CUSTOM_CSS_SCOPE = '.view';

const FRAME = `@layer user { @scope (${CUSTOM_CSS_SCOPE}) {} }`;

function isKeyframes(rule: CSSRule): boolean {
  return /^@(-webkit-)?keyframes\b/i.test(rule.cssText);
}

export class CustomCssSheet {
  readonly #view: Window & typeof globalThis;
  readonly #sheet: CSSStyleSheet;
  #css = '';

  constructor(doc: Document) {
    const view = doc.defaultView;
    if (view === null) throw new Error('the document has no window');
    this.#view = view;
    this.#sheet = new view.CSSStyleSheet();
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, this.#sheet];
  }

  /** The CSS in force ('' for none). */
  get css(): string {
    return this.#css;
  }

  apply(css: string): void {
    if (css === this.#css) return;
    this.#css = css;
    if (css.trim() === '') {
      this.#sheet.replaceSync('');
      return;
    }
    const parsed = new this.#view.CSSStyleSheet();
    parsed.replaceSync(css);
    this.#sheet.replaceSync(FRAME);
    const layer = this.#sheet.cssRules[0];
    const scope = layer instanceof this.#view.CSSGroupingRule ? layer.cssRules[0] : undefined;
    if (!(layer instanceof this.#view.CSSGroupingRule) || !(scope instanceof this.#view.CSSGroupingRule)) return;
    for (const rule of Array.from(parsed.cssRules)) {
      const target = isKeyframes(rule) ? layer : scope;
      try {
        target.insertRule(rule.cssText, target.cssRules.length);
      } catch {
        // A rule that cannot stand in this place is left out.
      }
    }
  }
}
