import { Node, mergeAttributes } from '@tiptap/core';

export interface ParagraphOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraph: {
      setParagraph: () => ReturnType;
    };
  }
}

export const Paragraph = Node.create<ParagraphOptions>({
  name: 'paragraph',
  group: 'block',
  content: 'inline*',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML: () => [{ tag: 'p' }],

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, this.options.HTMLAttributes)];
  },

  parseMarkdown: (token, helpers) => {
    const tokens = token.tokens || [];

    if (tokens.length === 1 && tokens[0]?.type === 'image') {
      return helpers.parseChildren([tokens[0]]);
    }

    const content = helpers.parseInline(tokens);

    const hasExplicitEmptyParagraphMarker =
      tokens.length === 1 &&
      tokens[0]?.type === 'text' &&
      (tokens[0].raw === '&nbsp;' ||
        tokens[0].text === '&nbsp;' ||
        tokens[0].raw === '\u00A0' ||
        tokens[0].text === '\u00A0');
    if (
      hasExplicitEmptyParagraphMarker &&
      content.length === 1 &&
      content[0]?.type === 'text' &&
      (content[0].text === '\u00A0' || content[0].text === '&nbsp;')
    ) {
      return helpers.createNode('paragraph', undefined, []);
    }

    return helpers.createNode('paragraph', undefined, content);
  },

  renderMarkdown: (node, helpers, ctx) => {
    if (!node) {
      return '';
    }
    const content = Array.isArray(node.content) ? node.content : [];

    if (content.length === 0) {
      const previousContent = Array.isArray(ctx.previousNode?.content)
        ? ctx.previousNode.content
        : [];
      const previousNodeIsEmptyParagraph =
        ctx.previousNode?.name === 'paragraph' && previousContent.length === 0;
      return previousNodeIsEmptyParagraph ? '&nbsp;' : '';
    }
    return helpers.renderChildren(content);
  },

  addCommands() {
    return {
      setParagraph:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
    };
  },
});
