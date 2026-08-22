import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  endOfLine: 'lf',
  insertFinalNewline: true,
  embeddedLanguageFormatting: 'auto',
  sortImports: true,
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '*.lock',
    '*.log',
    '.pnpm-store',
  ],
  overrides: [
    {
      files: ['**/*.{jsx,tsx}'],
      options: {
        singleAttributePerLine: true,
      },
    },
    {
      files: ['**/*.md', '**/*.mdx'],
      options: {
        proseWrap: 'always',
      },
    },
  ],
});
