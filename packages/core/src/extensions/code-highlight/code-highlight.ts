import { Extension } from '@tiptap/core';
import type { BundledTheme } from 'shiki';

import { createHighlightPlugin } from './highlight-plugin';
import { createShikiParser } from './shiki-parser';

export interface CodeHighlightOptions {
  darkTheme: BundledTheme;
  lightTheme: BundledTheme;
}

export const CodeHighlight = Extension.create<CodeHighlightOptions>({
  name: 'codeHighlight',

  addOptions() {
    return {
      darkTheme: 'github-dark',
      lightTheme: 'github-light',
    };
  },

  addProseMirrorPlugins() {
    // 从 codeBlock 扩展中获取 supportedLanguages， language 作为参数
    const codeBlockExtension = this.editor.extensionManager.extensions.find(
      (extension) => extension.name === 'codeBlock',
    );
    const supportedLanguage = codeBlockExtension?.options?.supportedLanguages;

    return [
      createHighlightPlugin({
        nodeTypes: ['codeBlock'],
        parser: createShikiParser({
          darkTheme: this.options.darkTheme,
          lightTheme: this.options.lightTheme,
          supportedLanguages: supportedLanguage,
        }),
      }),
    ];
  },
});
