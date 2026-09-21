import {
  CodeBlock as TiptapCodeBlock,
  type CodeBlockOptions as TiptapCodeBlockOptions,
} from '@tiptap/extension-code-block';

import {
  type SupportedLanguageConfig,
  getSupportedLanguages,
} from '../utils/supportedLanguages';

export type CodeBlockOptions = TiptapCodeBlockOptions & {
  supportedLanguages: SupportedLanguageConfig[];
};

export const CodeBlock = TiptapCodeBlock.extend<CodeBlockOptions>({
  addOptions() {
    const parentOptions = this.parent?.() ?? TiptapCodeBlock.options;
    return {
      ...parentOptions,
      defaultLanguage: 'javascript',
      HTMLAttributes: { 'data-block-type': 'code', class: 'code-block' },
      supportedLanguages: getSupportedLanguages(),
    };
  },
});
