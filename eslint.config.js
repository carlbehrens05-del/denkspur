import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'test-results', 'playwright-report', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.worker },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Kern, Importer, Agenten und Befehle bleiben frei von React.
    files: ['src/core/**', 'src/importers/**', 'src/agents/**', 'src/commands/**', 'src/demo/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'react-*', 'zustand'] }],
    },
  },
  {
    // Inhalte aus dem Record nie per console ausgeben – im Kern nur gezielte Ausnahmen.
    files: ['src/**'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**', 'tools/**'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright-Fixtures heißen „use“, sind aber keine React-Hooks.
    files: ['tests/e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
);
