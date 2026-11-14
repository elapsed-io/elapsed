// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { safetyRules, storageRules } from './tooling/eslint/restrictions.js';

export default defineConfig(
  {
    ignores: ['**/node_modules/', '**/dist/', '**/test-results/', '**/playwright-report/', 'docs/'],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json',
          './packages/core/tsconfig.json',
          './packages/web/tsconfig.json',
          './packages/web/tsconfig.node.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...safetyRules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: false }],
    },
  },
  {
    // Site code: storage only through adapters (src/storage arrives in round 4).
    files: ['packages/web/src/**/*.ts'],
    ignores: ['packages/web/src/storage/**'],
    rules: storageRules,
  },
  {
    // Plain JavaScript config files are linted without type information.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
