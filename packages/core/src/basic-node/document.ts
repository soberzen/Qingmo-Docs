import { Node } from '@tiptap/core';

export const Document = Node.create({
  name: 'document',
  topNode: true,
  content: 'block+',

  renderMarkdown: (node, helpers) => {
    if (!node.content) {
      return '';
    }
    return helpers.renderChildren(node.content, '\n\n');
  },
});
