import { Node } from '@tiptap/core';

export const Text = Node.create({
  name: 'text',
  group: 'inline',

  parseMarkdown: (token) => {
    return {
      type: 'text',
      text: token.text || '',
    };
  },
  renderMarkdown: (node) => {
    return node.text || '';
  },
});
