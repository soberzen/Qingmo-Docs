import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { type KatexOptions, render } from 'katex';

export type MathBlockOptions = {
  /**
   * KaTeX渲染配置
   */
  katexOptions?: KatexOptions | undefined;
  /**
   * 点击数学块时触发
   * @param node MathBlock节点 node.attrs.latex
   * @param pos 节点在文档中的位置
   * @returns 无返回值
   */
  onClick?: (node: PMNode, pos: number) => void | undefined;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertMathBlock: {
      insertBlockMath: (options: { latex: string; pos?: number }) => ReturnType;
      deleteBlockMath: (options?: { pos?: number }) => ReturnType;
      updateBlockMath: (options?: {
        latex: string;
        pos?: number;
      }) => ReturnType;
    };
  }
}

const mathBlockRegex: RegExp = /^\$\$([^$]+)\$\$$/;

export const MathBlock = Node.create<MathBlockOptions>({
  name: 'mathBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      onClick: () => {},
      katexOptions: undefined,
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
        tag: 'div[data-type="math-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }),
    ];
  },

  parseMarkdown: (token, helpers) => {
    return helpers.createNode('mathBlock', {
      latex: token.latex,
    });
  },

  renderMarkdown: (node) => {
    const latex = node.attrs?.latex || '';

    const output = ['$$', latex, '$$'];
    return output.join('\n');
  },

  markdownTokenizer: {
    name: 'mathBlock',
    level: 'block',
    start: (str: string) => str.indexOf('$$'),
    tokenize: (str: string) => {
      const match = str.match(mathBlockRegex);

      if (!match) {
        return undefined;
      }
      const [fullMatch, latex] = match;

      return {
        type: 'mathBlock',
        raw: fullMatch,
        latex: latex?.trim() || '',
      };
    },
  },

  addCommands() {
    return {
      insertBlockMath:
        (options) =>
        ({ tr, commands }) => {
          const { latex, pos } = options;
          if (!latex) {
            return false;
          }
          const insertPos = pos ?? tr.selection.from;

          return commands.insertContentAt(insertPos, {
            type: this.name,
            attrs: { latex },
          });
        },
      deleteBlockMath:
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
      updateBlockMath:
        (options) =>
        ({ tr, dispatch }) => {
          const latex = options?.latex;
          let pos = options?.pos;

          if (pos === undefined) {
            pos = tr.selection.$from.pos;
          }

          const node = tr.doc.nodeAt(pos);

          if (!node || node.type.name !== this.name) {
            return false;
          }

          if (dispatch) {
            tr.setNodeMarkup(pos, this.type, {
              ...node.attrs,
              latex: latex ?? node.attrs.latex,
            });
          }
          return true;
        },
    };
  },

  addInputRules() {
    return [
      // https://github.com/ueberdosis/tiptap/blob/main/packages/core/src/inputRules/nodeInputRule.ts#L51
      // 上面是nodeInputRule源码 实现 offset 是 match[0].lastIndexOf(match[1])
      // 如果要覆盖 $$..$$的话得让 offset 是 0
      nodeInputRule({
        find: /^(\$\$([^$]+)\$\$)$/,
        type: this.type,
        getAttributes: (match) => ({
          latex: match[2]?.trim() || '',
        }),
      }),
    ];
  },
  addNodeView() {
    const { katexOptions } = this.options;
    return ({ node, getPos }) => {
      const wrapper = document.createElement('div');
      const innerWrapper = document.createElement('div');

      wrapper.className = 'math-block-wrapper';

      if (this.editor.isEditable) {
        wrapper.classList.add('math-block-editable');
      }

      innerWrapper.className = 'math-block-inner-wrapper';
      wrapper.dataset.type = 'block-math';
      wrapper.setAttribute('data-latex', node.attrs.latex);
      wrapper.appendChild(innerWrapper);

      function renderMath() {
        try {
          render(node.attrs.latex, innerWrapper, katexOptions);
          wrapper.classList.remove('math-block-error');
        } catch {
          console.error('Failed to render math block:', node.attrs.latex);
          wrapper.textContent = node.attrs.latex;
          wrapper.classList.add('math-block-error');
        }
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const pos = getPos();

        if (pos === undefined) {
          return;
        }

        if (this.options.onClick) {
          this.options.onClick(node, pos);
        }
      };
      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick);
      }
      renderMath();
      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick);
        },
      };
    };
  },
});
