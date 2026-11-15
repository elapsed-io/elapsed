// @ts-check
/**
 * Safety rules enforced by lint (plan, Principles > Safe; Architecture
 * invariants 6 and 16). Kept separate from eslint.config.js so tests can run
 * them against known-bad code.
 *
 * HTML sinks are banned outright, not only with dynamic content: the CSP
 * requires Trusted Types with no policy, so even a constant string assigned
 * to innerHTML throws in supporting browsers. Build DOM with createElement,
 * textContent and replaceChildren instead.
 */

const HTML_PROPERTY = /^(innerHTML|outerHTML|srcdoc)$/;
const HTML_METHOD = /^(insertAdjacentHTML|createContextualFragment|setHTMLUnsafe|parseHTMLUnsafe|parseFromString)$/;

const htmlSinkMessage =
  'Unsafe HTML sink. Trusted Types blocks it at runtime; build DOM with createElement, textContent and replaceChildren.';

/** Syntax banned everywhere. */
const safetySyntax = [
    {
      selector: `AssignmentExpression > MemberExpression.left[property.name=${HTML_PROPERTY}]`,
      message: htmlSinkMessage,
    },
    {
      selector: `AssignmentExpression > MemberExpression.left[computed=true][property.value=${HTML_PROPERTY}]`,
      message: htmlSinkMessage,
    },
    {
      selector: `CallExpression > MemberExpression.callee[property.name=${HTML_METHOD}]`,
      message: htmlSinkMessage,
    },
    {
      selector: "CallExpression > MemberExpression.callee[object.name='document'][property.name=/^(write|writeln)$/]",
      message: htmlSinkMessage,
    },
    {
      selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(on|srcdoc$)/i]",
      message: 'Event-handler and srcdoc attributes are banned; use addEventListener.',
    },
];

/**
 * Rules that apply to every TypeScript and JavaScript file.
 * @type {import('eslint').Linter.RulesRecord}
 */
export const safetyRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-script-url': 'error',
  'no-restricted-syntax': ['error', ...safetySyntax],
};

const injectedClockMessage = 'Core reads time only through the injected Clock (plan, Architecture invariant 1).';

/**
 * Core code is deterministic: time comes from the injected clock and ids from
 * the injected generator, so tests can control both.
 * @type {import('eslint').Linter.RulesRecord}
 */
export const coreRules = {
  'no-restricted-syntax': [
    'error',
    ...safetySyntax,
    { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: injectedClockMessage },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Date', property: 'now', message: injectedClockMessage },
    { object: 'performance', property: 'now', message: injectedClockMessage },
    { object: 'Math', property: 'random', message: 'Core takes randomness from an injected generator.' },
  ],
};

/**
 * Browser storage is reached only through the storage adapters (invariant 6); guests get no cookies.
 * @type {import('eslint').Linter.RulesRecord}
 */
export const storageRules = {
  'no-restricted-globals': [
    'error',
    { name: 'localStorage', message: 'Use a store from src/storage (SettingsStore, SessionStore, MediaStore).' },
    { name: 'sessionStorage', message: 'Use a store from src/storage (SettingsStore, SessionStore, MediaStore).' },
    { name: 'indexedDB', message: 'Use a store from src/storage (SettingsStore, SessionStore, MediaStore).' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'window', property: 'localStorage', message: 'Use a store from src/storage.' },
    { object: 'window', property: 'sessionStorage', message: 'Use a store from src/storage.' },
    { object: 'window', property: 'indexedDB', message: 'Use a store from src/storage.' },
    { object: 'document', property: 'cookie', message: 'The site sets no cookies for guests.' },
  ],
};
