import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'eol-last': ['error', 'always'],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      // Só relevante pro React Compiler (não usado) — avisa sobre watch() do react-hook-form.
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
    ],
  },
];

export default eslintConfig;
