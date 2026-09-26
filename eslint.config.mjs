import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'public/vendor/**', 'public/apps/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
  {
    // The existing platform and CMS expose handlers to declarative HTML and share
    // lexical bindings across ordered classic scripts. DOM tests verify that contract.
    files: ['public/js/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
];
