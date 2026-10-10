import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { type KatexOptions, render } from 'katex';

export type MathInlineOptions = {
  /**
   * KaTeX渲染配置
   */
  katexOptions?: KatexOptions | undefined;
  /**
   * 点击行内公式时触发
   * @param node MathInline节点 node.attrs.latex
   * @param pos 节点在文档中的位置
   * @returns 无返回值
   */
  onClick?: (node: PMNode, pos: number) => void | undefined;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      insertInlineMath: (options: {
        latex: string;
        pos?: number;
      }) => ReturnType;
      deleteInlineMath: (options?: { pos?: number }) => ReturnType;
      updateInlineMath: (options?: {
        latex: string;
        pos?: number;
      }) => ReturnType;
    };
  }
}

const mathInlineInputRegex =
  /(?<![\\$])(\$(?!\$)((?:\\[^\r\n]|[^\\$\r\n])+)\$(?!\$))$/;
const mathInlineMarkdownRegex = /^\$(?!\$)((?:\\[^\r\n]|[^\\$\r\n])+)\$(?!\$)/;

export const MathInline = Node.create<MathInlineOptions>({
  name: 'mathInline',
  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      onClick: () => {},
      katexOptions: { displayMode: false },
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex'),
        renderHTML: (attributes) => {
          return {
            'data-latex': attributes.latex,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-inline' }),
    ];
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode('mathInline', {
      latex: token.latex,
    });
  },

  renderMarkdown(node) {
    const latex = node.attrs?.latex || '';
    return `$${latex}$`;
  },

  markdownTokenizer: {
    name: 'mathInline',
    level: 'inline',
    start(src) {
      return src.search(/(?<![\\$])\$(?!\$)/);
    },
    tokenize(src) {
      const match = src.match(mathInlineMarkdownRegex);
      if (!match) {
        return undefined;
      }
      const [fullMatch, latex] = match;

      return {
        type: 'mathInline',
        raw: fullMatch,
        latex: latex?.trim() || '',
      };
    },
  },

  addCommands() {
    return {
      insertInlineMath:
        (options) =>
        ({ tr, commands }) => {
          const { latex, pos } = options;
          if (!latex) {
            return false;
          }

          return commands.insertContentAt(pos ?? tr.selection.from, {
            type: this.name,
            attrs: { latex },
          });
        },
      deleteInlineMath:
        (options) =>
        ({ tr, dispatch }) => {
          const pos = options?.pos ?? tr.selection.$from.pos;
          const node = tr.doc.nodeAt(pos);

          if (!node || node.type.name !== this.name) {
            return false;
          }
          if (dispatch) {
            tr.delete(pos, pos + node.nodeSize);
          }
          return true;
        },
      updateInlineMath:
        (options) =>
        ({ tr, dispatch }) => {
          const pos = options?.pos ?? tr.selection.$from.pos;
          const node = tr.doc.nodeAt(pos);

          if (!node || node.type.name !== this.name) {
            return false;
          }
          if (dispatch) {
            tr.setNodeMarkup(pos, this.type, {
              ...node.attrs,
              latex: options?.latex ?? node.attrs.latex,
            });
          }
          return true;
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: mathInlineInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          latex: match[2]?.trim() || '',
        }),
      }),
    ];
  },

  addPasteRules() {
    return [];
  },

  addNodeView() {
    const { katexOptions } = this.options;

    return ({ node, getPos }) => {
      const wrapper = document.createElement('span');
      const innerWrapper = document.createElement('span');

      wrapper.className = 'math-inline-wrapper';
      if (this.editor.isEditable) {
        wrapper.classList.add('math-inline-editable');
      }

      wrapper.dataset.type = 'math-inline';
      wrapper.setAttribute('data-latex', node.attrs.latex);
      wrapper.contentEditable = 'false';
      innerWrapper.className = 'math-inline-inner-wrapper';
      wrapper.appendChild(innerWrapper);

      try {
        render(node.attrs.latex, innerWrapper, {
          ...katexOptions,
          displayMode: false,
        });
      } catch {
        console.error('Failed to render inline math:', node.attrs.latex);
        innerWrapper.textContent = node.attrs.latex;
        wrapper.classList.add('math-inline-error');
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const pos = getPos();
        if (pos === undefined) {
          return;
        }
        this.options.onClick?.(node, pos);
      };

      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick);
      }

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick);
        },
      };
    };
  },
});
