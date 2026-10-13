import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PlaceholderOptions {
  placeholder:
    | string
    | ((props: {
        editor: Editor;
        node: ProseMirrorNode;
        pos: number;
      }) => string);
  emptyEditorClass: string;
  emptyNodeClass: string;
  showOnlyCurrent: boolean;
  showOnlyWhenEditable: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    placeholder: {
      setPlaceholder: (options: Partial<PlaceholderOptions>) => ReturnType;
    };
  }
}

export const placeholderPluginKey = new PluginKey<PlaceholderOptions>(
  'placeholder',
);

function resolvePlaceholder(
  editor: Editor,
  node: ProseMirrorNode,
  pos: number,
  options: PlaceholderOptions,
) {
  if (typeof options.placeholder === 'function') {
    return options.placeholder({ editor, node, pos });
  }

  return options.placeholder;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: 'placeholder',

  addOptions() {
    return {
      placeholder: '请输入内容',
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      showOnlyCurrent: true,
      showOnlyWhenEditable: true,
    };
  },
  addCommands() {
    return {
      setPlaceholder:
        (options) =>
        ({ dispatch, state }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(placeholderPluginKey, options));
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    const initialOptions = this.options;

    return [
      new Plugin<PlaceholderOptions>({
        key: placeholderPluginKey,

        state: {
          init: () => initialOptions,

          apply(tr, value) {
            const nextOptions = tr.getMeta(placeholderPluginKey);

            if (!nextOptions) {
              return value;
            }

            return {
              ...value,
              ...nextOptions,
            };
          },
        },

        props: {
          decorations(state) {
            const options =
              placeholderPluginKey.getState(state) ?? initialOptions;

            if (editor.isDestroyed) {
              return DecorationSet.empty;
            }

            if (options.showOnlyWhenEditable && !editor.isEditable) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];

            const { doc, selection } = state;

            const isEditorEmpty =
              doc.childCount === 1 &&
              Boolean(doc.firstChild?.isTextblock) &&
              doc.firstChild?.content.size === 0;

            doc.descendants((node, pos) => {
              if (!node.isTextblock || node.content.size > 0) {
                return true;
              }

              const isCurrent =
                selection.from >= pos && selection.to <= pos + node.nodeSize;

              if (options.showOnlyCurrent && !isCurrent) {
                return false;
              }

              const placeholderText = resolvePlaceholder(
                editor,
                node,
                pos,
                options,
              );

              if (!placeholderText) {
                return false;
              }

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: [
                    options.emptyNodeClass,
                    isEditorEmpty ? options.emptyEditorClass : undefined,
                  ]
                    .filter(Boolean)
                    .join(' '),
                  'data-placeholder': placeholderText,
                }),
              );

              return false;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
