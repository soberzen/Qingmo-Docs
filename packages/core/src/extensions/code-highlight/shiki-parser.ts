import { Decoration } from '@tiptap/pm/view';
import {
  bundledLanguages,
  createHighlighter,
  stringifyTokenStyle,
  type BundledLanguage,
  type BundledTheme,
  type Highlighter,
  type ThemedToken,
} from 'shiki';

import type { SupportedLanguageConfig } from '../../utils/supportedLanguages';
import type { Parser, ParserOptions } from './types';

const plainTextLanguages = new Set(['plain', 'plaintext', 'text', 'txt']);

export interface ShikiParserOptions {
  darkTheme: BundledTheme;
  lightTheme: BundledTheme;
  supportedLanguages: SupportedLanguageConfig[];
}

export function resolveLanguage(
  language: string | undefined,
  supportedLanguages: SupportedLanguageConfig[],
): string | undefined {
  const normalizedLanguage = language?.trim().toLowerCase();

  if (!normalizedLanguage) {
    return undefined;
  }

  const languageConfig = supportedLanguages.find(
    ({ id, match }) =>
      id.toLowerCase() === normalizedLanguage ||
      match.some((alias) => alias.toLowerCase() === normalizedLanguage),
  );
  const resolvedLanguage = languageConfig?.id.toLowerCase();

  if (
    !resolvedLanguage ||
    plainTextLanguages.has(resolvedLanguage) ||
    !(resolvedLanguage in bundledLanguages)
  ) {
    return undefined;
  }

  return resolvedLanguage;
}

export function createTokenDecorations(
  tokens: ThemedToken[][],
  { pos, size }: Pick<ParserOptions, 'pos' | 'size'>,
): Decoration[] {
  const contentStart = pos + 1;
  const contentEnd = pos + size - 1;

  return tokens.flatMap((line) =>
    line.flatMap((token) => {
      const from = contentStart + token.offset;
      const to = Math.min(from + token.content.length, contentEnd);

      if (from >= to || from >= contentEnd) {
        return [];
      }

      const attributes: Record<string, string> = {
        class: 'shiki-token',
      };

      if (token.htmlStyle) {
        attributes.style = stringifyTokenStyle(token.htmlStyle);
      }

      return [
        Decoration.inline(from, to, attributes, {
          inclusiveEnd: false,
          inclusiveStart: false,
        }),
      ];
    }),
  );
}

export function createShikiParser({
  darkTheme,
  lightTheme,
  supportedLanguages,
}: ShikiParserOptions): Parser {
  let highlighter: Highlighter | undefined;
  let highlighterPromise: Promise<Highlighter> | undefined;
  let initializationFailed = false;
  const failedLanguages = new Set<string>();
  const loadingLanguages = new Map<string, Promise<void>>();

  const initializeHighlighter = () => {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        langs: [],
        themes: [lightTheme, darkTheme],
      }).then(
        (instance) => {
          highlighter = instance;
          return instance;
        },
        (error: unknown) => {
          initializationFailed = true;
          throw error;
        },
      );
    }

    return highlighterPromise;
  };

  const loadLanguage = (instance: Highlighter, language: string) => {
    const canonicalLanguage = instance.resolveLangAlias(language);

    if (instance.getLoadedLanguages().includes(canonicalLanguage)) {
      return undefined;
    }

    if (failedLanguages.has(canonicalLanguage)) {
      return undefined;
    }

    const pendingLanguage = loadingLanguages.get(canonicalLanguage);

    if (pendingLanguage) {
      return pendingLanguage;
    }

    const promise = instance
      .loadLanguage(language as BundledLanguage)
      .catch((error: unknown) => {
        failedLanguages.add(canonicalLanguage);
        throw error;
      })
      .finally(() => {
        loadingLanguages.delete(canonicalLanguage);
      });

    loadingLanguages.set(canonicalLanguage, promise);
    return promise;
  };

  return (parserOptions) => {
    const language = resolveLanguage(
      parserOptions.language,
      supportedLanguages,
    );

    if (!language || !parserOptions.content || initializationFailed) {
      return [];
    }

    if (!highlighter) {
      return initializeHighlighter().then(async (instance) => {
        await loadLanguage(instance, language);
      });
    }

    const pendingLanguage = loadLanguage(highlighter, language);

    if (pendingLanguage) {
      return pendingLanguage;
    }

    const { tokens } = highlighter.codeToTokens(parserOptions.content, {
      defaultColor: false,
      lang: language as BundledLanguage,
      themes: {
        dark: darkTheme,
        light: lightTheme,
      },
    });

    return createTokenDecorations(tokens, parserOptions);
  };
}
