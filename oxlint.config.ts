import { defineConfig } from 'oxlint';

export default defineConfig({
  ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/__test__/**'],
  env: {
    browser: true,
    node: true,
  },
  plugins: ['react', 'typescript', 'unicorn', 'import', 'oxc'],
  settings: {
    react: {
      version: '19',
    },
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'unicorn/no-empty-file': 'error',
    'typescript/no-explicit-any': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      files: ['apps/backend/**/*.ts'],
      plugins: ['jest'],
      env: {
        node: true,
        jest: true,
      },
      rules: {
        'typescript/explicit-function-return-type': 'off',
        'typescript/explicit-module-boundary-types': 'off',
        'typescript/no-explicit-any': 'off',
        'no-console': 'error',
      },
    },
  ],
});
