import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { coreRules, safetyRules, storageRules } from './restrictions.js';

const linter = new Linter({ configType: 'flat' });
const config: Linter.Config[] = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      // Browser globals the core rules need to recognise (no-implied-eval checks setTimeout).
      globals: { setTimeout: 'readonly', window: 'readonly', document: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', indexedDB: 'readonly' },
    },
    rules: { ...safetyRules, ...storageRules },
  },
];

function ruleIds(code: string): string[] {
  return linter.verify(code, config, 'example.ts').map((message) => message.ruleId ?? 'parse-error');
}

describe('lint safety rules', () => {
  it.each([
    'el.innerHTML = userText;',
    'el.innerHTML = `<b>${name}</b>`;',
    "el.innerHTML = '<b>static</b>';",
    'el.innerHTML += more;',
    'el.outerHTML = html;',
    "el['innerHTML'] = html;",
    'frame.srcdoc = html;',
    "el.insertAdjacentHTML('beforeend', html);",
    'range.createContextualFragment(html);',
    "new DOMParser().parseFromString(html, 'text/html');",
    'el.setHTMLUnsafe(html);',
    'document.write(html);',
    "el.setAttribute('onclick', code);",
    "el.setAttribute('style', css);",
  ])('bans the HTML sink in %s', (code) => {
    expect(ruleIds(code)).toContain('no-restricted-syntax');
  });

  it.each(["eval('1');", "setTimeout('alert(1)', 0);", "new Function('return 1');", "location.href = 'javascript:void 0';"])(
    'bans code from strings in %s',
    (code) => {
      expect(ruleIds(code).length).toBeGreaterThan(0);
    },
  );

  it.each([
    'el.textContent = userText;',
    'el.replaceChildren(child);',
    "el.setAttribute('aria-label', label);",
    "el.style.setProperty('--x', '1em');",
    'const html = el.innerHTML;',
    'writer.write(chunk);',
  ])('allows %s', (code) => {
    expect(ruleIds(code)).toEqual([]);
  });

  it.each([
    "localStorage.setItem('k', 'v');",
    "window.sessionStorage.getItem('k');",
    "indexedDB.open('db');",
    "document.cookie = 'a=b';",
  ])('keeps browser storage behind the adapters: %s', (code) => {
    expect(ruleIds(code).length).toBeGreaterThan(0);
  });

  describe('core determinism', () => {
    const coreConfig: Linter.Config[] = [{ files: ['**/*.ts'], languageOptions: { parser: tseslint.parser }, rules: coreRules }];
    const coreIds = (code: string): string[] =>
      linter.verify(code, coreConfig, 'example.ts').map((message) => message.ruleId ?? 'parse-error');

    it.each(['Date.now();', 'new Date();', 'performance.now();', 'Math.random();', 'el.innerHTML = x;'])('bans %s in core', (code) => {
      expect(coreIds(code).length).toBeGreaterThan(0);
    });

    it.each(['clock.now();', 'new Date(at);', 'Date.UTC(2026, 0, 1);', 'Math.floor(x);'])('allows %s in core', (code) => {
      expect(coreIds(code)).toEqual([]);
    });
  });
});
