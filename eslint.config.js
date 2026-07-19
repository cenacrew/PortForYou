import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/emulator-data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Initialisations au mount (détection WebGL, auth) : légitimes.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // React Three Fiber : props JSX propres à three.js (args, uniforms…),
    // et art génératif (Math.random() volontaire dans les useMemo de scène).
    files: ['apps/web/src/components/hero/**'],
    rules: {
      'react/no-unknown-property': 'off',
      // Graphisme impératif three.js : scènes générées dans useMemo et
      // mutées à chaque frame (useFrame) — hors du modèle React classique.
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/use-memo': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Accessibilité statique du front (vitrine Port'ForYou + vitrines
    // publiques d'artistes) : jsx-a11y, en respectant les tolérances héritées.
    files: [
      'templates/*/front/src/**/*.{js,jsx}',
      'packages/template-front-core/src/**/*.{js,jsx}',
      'apps/web/src/**/*.{jsx,tsx}',
    ],
    plugins: { 'jsx-a11y': jsxA11y },
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Code hérité du portfolio d'origine : patterns tolérés dans les templates.
      'react-hooks/set-state-in-effect': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.*'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
);
