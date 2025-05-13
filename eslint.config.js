// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import parserTs from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ["src-tauri/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: Object.fromEntries(
        Object.entries({
          ...globals.browser,
          ...globals.node,
        }).filter(([key]) => key.trim() === key)
      ),
    },
    plugins: {
      '@typescript-eslint': pluginTs,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];