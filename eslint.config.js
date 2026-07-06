'use strict';

// Flat ESLint config. castplay is dependency-free at runtime; ESLint and the
// other linters are dev-only tooling and never ship. The library file is a
// browser-first UMD script; the tests and scripts are Node CommonJS.

const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**'] },

  js.configs.recommended,

  // Turns off the stylistic rules Prettier owns, so the two don't fight.
  prettier,

  {
    // Shared rules.
    rules: {
      // Unused caught errors are intentional in the "render an inline message
      // and move on" catch blocks; don't force a throwaway binding name.
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },

  {
    // The library: runs in the browser (auto-init) and in Node (require, for
    // tests), so it sees both global sets. ES5-flavoured but parsed loosely.
    files: ['castplay.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    // Tests, build scripts, and this config: Node CommonJS.
    files: ['test/**/*.js', 'scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, globalThis: 'readonly' },
    },
  },
];
