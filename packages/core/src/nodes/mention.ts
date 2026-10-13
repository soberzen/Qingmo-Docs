import { Node, mergeAttributes, type Range } from '@tiptap/core';
import { NodeSelection, PluginKey } from '@tiptap/pm/state';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import Suggestion from '@tiptap/suggestion';

export type MentionItem = {
  id: string;
  label: string;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (options: {
        mention: MentionItem;
        range?: Range;
      }) => ReturnType;
      deleteMention: (options?: { pos?: number }) => ReturnType;
      dismissMention: () => ReturnType;
    };
  }
}

export type MentionOptions = {
  HTMLAttributes?: Record<string, any>;
  char: string;
  render: NonNullable<SuggestionOptions<MentionItem, MentionItem>['render']>;
};

export type MentionProps = SuggestionProps<MentionItem, MentionItem>;

export const mentionPluginKey = new PluginKey('mention');

export const Mention = Node.create<MentionOptions>({
  name: 'mention',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      char: '@',
      render: () => ({}),
    };
  },

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-id') ?? '',
        renderHTML: (attributes) =>
          attributes.id ? { 'data-id': attributes.id } : {},
      },

      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? '',
        renderHTML: (attributes) =>
          attributes.label ? { 'data-label': attributes.label } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-type': 'mention',
      }),
      `${this.options.char}${node.attrs.label || node.attrs.id || ''}`,
    ];
  },

  renderText({ node }) {
    return `${this.options.char}${node.attrs.label || node.attrs.id || ''}`;
  },

  addCommands() {
    return {
      insertMention:
        ({ mention, range }) =>
        ({ editor, tr, commands }) => {
          if (editor.isDestroyed || !editor.isEditable) {
            return false;
          }

          if (
            typeof mention?.id !== 'string' ||
            !mention.id.trim() ||
            typeof mention.label !== 'string' ||
            !mention.label.trim()
          ) {
            return false;
          }

          const { from, to } = range ?? tr.selection;
          if (
            !Number.isInteger(from) ||
            !Number.isInteger(to) ||
            from < 0 ||
            from > to ||
            to > tr.doc.content.size
          ) {
            return false;
          }

          const $from = tr.doc.resolve(from);
          const $to = tr.doc.resolve(to);

          // 只替换同一文本块内的内容，不推断跨段落选区的插入方式。
          if (
            !$from.sameParent($to) ||
            !$from.parent.canReplaceWith(
              $from.index(),
              $to.indexAfter(),
              this.type,
            )
          ) {
            return false;
          }

          return commands.insertContentAt(
            { from, to },
            {
              type: this.name,
              attrs: {
                id: mention.id,
                label: mention.label,
              },
            },
          );
        },
      deleteMention:
        (options) =>
        ({ editor, tr, dispatch }) => {
          if (editor.isDestroyed || !editor.isEditable) {
            return false;
          }

          const pos = options?.pos ?? tr.selection.from;
          if (!Number.isInteger(pos) || pos < 0 || pos >= tr.doc.content.size) {
            return false;
          }

          const node = tr.doc.nodeAt(pos);
          if (node?.type !== this.type) return false;
          if (dispatch) {
            tr.delete(pos, pos + node.nodeSize);
          }
          return true;
        },
      dismissMention:
        () =>
        ({ editor, tr, dispatch }) => {
          if (editor.isDestroyed) return false;

          if (dispatch) {
            tr.setMeta(mentionPluginKey, { exit: true });
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state;

        if (selection instanceof NodeSelection) {
          return selection.node.type === this.type
            ? this.editor.commands.deleteMention({ pos: selection.from })
            : false;
        }

        const nodeBefore = selection.$from.nodeBefore;
        if (!selection.empty || nodeBefore?.type !== this.type) return false;

        return this.editor.commands.deleteMention({
          pos: selection.from - nodeBefore.nodeSize,
        });
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<MentionItem, MentionItem>({
        editor: this.editor,
        char: this.options.char,
        allowSpaces: false,
        allowedPrefixes: null,
        startOfLine: false,
        pluginKey: mentionPluginKey,

        allow: ({ state, range }) => {
          const parent = state.doc.resolve(range.from).parent;
          return Boolean(parent.type.contentMatch.matchType(this.type));
        },

        command({ editor, range, props }) {
          if (editor.commands.insertMention({ mention: props, range })) {
            editor.commands.focus();
          }
        },

        render: this.options.render,
      }),
    ];
  },
});
