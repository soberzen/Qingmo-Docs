import { Extension } from '@tiptap/core';
import {
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
  type EditorState,
} from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import * as Y from 'yjs';

import type {
  CommentAnchor,
  CommentMeta,
  CommentOperation,
  CommentState,
} from './types';
import {
  encodePosition,
  hasAnchor,
  resolveCommentAnchorPosition,
} from './utils';

export type CommentOptions = {
  /** 评论锚点 */
  anchors: Y.Map<CommentAnchor> | null;
  /** 评论点击事件 */
  onClick: ((anchorId: string, event: MouseEvent) => void) | null;
  /** 评论锚点更新事件 */
  onAnchorsChange: ((anchors: CommentAnchor[]) => void) | null;
  /** 评论激活事件 */
  onActiveChange: ((anchorId: string | null) => void) | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (anchorId: string) => ReturnType;
      unsetComment: (anchorId: string) => ReturnType;
      setActiveComment: (anchorId: string | null) => ReturnType;
      focusComment: (anchorId: string) => ReturnType;
    };
  }
}

const commentPluginKey = new PluginKey<CommentState>('comment');

function patchMeta(tr: Transaction, patch: CommentMeta) {
  tr.setMeta(commentPluginKey, {
    ...tr.getMeta(commentPluginKey),
    ...patch,
  });
}

function decorate(
  anchorId: string,
  from: number,
  to: number,
  active: string | null,
): Decoration {
  return Decoration.inline(
    from,
    to,
    {
      nodeName: 'span',
      class:
        anchorId === active
          ? 'comment-highlight is-active'
          : 'comment-highlight',
      'data-comment-id': anchorId,
    },
    {
      anchorId,
      inclusiveStart: false,
      inclusiveEnd: false,
    },
  );
}

function buildDecorations(
  state: EditorState,
  anchors: Y.Map<CommentAnchor>,
  active: string | null,
): DecorationSet {
  const decorations: Decoration[] = [];

  anchors.forEach((anchor, anchorId) => {
    if (!anchor || anchor.anchorId !== anchorId) {
      return;
    }

    const range = resolveCommentAnchorPosition(state, anchor);

    if (range) {
      decorations.push(decorate(anchorId, range.from, range.to, active));
    }
  });

  return DecorationSet.create(state.doc, decorations);
}

export const Comment = Extension.create<CommentOptions>({
  name: 'comment',

  addOptions() {
    return {
      anchors: null,
      onClick: null,
      onDelete: null,
      onAnchorsChange: null,
      onActiveChange: null,
    };
  },

  onCreate() {
    // 获取 同步状态
    const sync = ySyncPluginKey.getState(this.editor.state);

    if (!sync || sync.doc !== this.options.anchors?.doc) {
      throw new Error(
        'Comment.anchors 必须属于 Collaboration 使用的同一个 Y.Doc',
      );
    }
  },

  addCommands() {
    const anchors = this.options.anchors;

    const isReady = (state: EditorState) => {
      const sync = ySyncPluginKey.getState(state);
      return !!anchors?.doc && sync?.doc === anchors?.doc && !!sync?.binding;
    };

    return {
      setComment:
        (anchorId) =>
        ({ state, tr, dispatch }) => {
          const operations: CommentOperation[] =
            tr.getMeta(commentPluginKey)?.operations || [];

          if (
            !anchors ||
            !isReady(state) ||
            !anchorId.trim() ||
            hasAnchor(anchors, anchorId, operations) ||
            tr.docChanged ||
            !(tr.selection instanceof TextSelection) ||
            tr.selection.empty
          ) {
            return false;
          }

          let start: string | null;
          let end: string | null;

          try {
            start = encodePosition(state, tr.selection.from, 1);
            end = encodePosition(state, tr.selection.to, -1);
          } catch {
            return false;
          }

          if (!start || !end) {
            return false;
          }

          const anchor = {
            anchorId,
            start,
            end,
            quote: tr.doc.textBetween(tr.selection.from, tr.selection.to),
          };

          if (dispatch) {
            patchMeta(tr, {
              activeAnchorId: anchorId,
              operations: [...operations, { type: 'set', anchor }],
            });
          }

          return true;
        },
      unsetComment:
        (anchorId) =>
        ({ state, tr, dispatch }) => {
          const operations: CommentOperation[] =
            tr.getMeta(commentPluginKey)?.operations || [];

          if (
            !anchorId ||
            !anchors ||
            !isReady(state) ||
            !hasAnchor(anchors, anchorId, operations)
          ) {
            return false;
          }

          if (dispatch) {
            patchMeta(tr, {
              operations: [...operations, { type: 'delete', anchorId }],
            });
          }

          return true;
        },
      setActiveComment:
        (anchorId) =>
        ({ tr, dispatch }) => {
          const operations: CommentOperation[] =
            tr.getMeta(commentPluginKey)?.operations || [];

          if (
            anchorId !== null &&
            (!anchors || !hasAnchor(anchors, anchorId, operations))
          ) {
            return false;
          }

          if (dispatch) {
            patchMeta(tr, {
              activeAnchorId: anchorId,
            });
          }
          return true;
        },
      focusComment:
        (anchorId) =>
        ({ state, tr, dispatch, commands }) => {
          if (!anchors || !isReady(state) || tr.docChanged) {
            return false;
          }

          const anchor = anchors.get(anchorId);
          const range = anchor && resolveCommentAnchorPosition(state, anchor);

          if (!range) {
            return false;
          }
          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, range.from, range.to));
            patchMeta(tr, {
              activeAnchorId: anchorId,
            });
            tr.scrollIntoView();
            commands.focus();
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const anchors = this.options.anchors;
    const ydoc = anchors?.doc;
    if (!ydoc || !anchors) {
      throw new Error('请配置已连接 Y.Doc 的 Comment.anchors');
    }
    const options = this.options;
    const editor = this.editor;
    return [
      new Plugin<CommentState>({
        key: commentPluginKey,

        state: {
          init: () => ({
            activeAnchorId: null,
            pending: [],
            isWaitingForPositionSync: true,
          }),

          apply(tr, previous) {
            const meta = tr.getMeta(commentPluginKey) as
              | CommentMeta
              | undefined;

            const pending = meta?.excute
              ? []
              : [...previous.pending, ...(meta?.operations || [])];

            let active =
              meta?.activeAnchorId !== undefined
                ? meta.activeAnchorId
                : previous.activeAnchorId;

            if (active !== null && !hasAnchor(anchors, active, pending)) {
              active = null;
            }

            const isWaitingForPositionSync =
              tr.docChanged ||
              (meta?.excute ? false : previous.isWaitingForPositionSync);

            return {
              activeAnchorId: active,
              pending,
              isWaitingForPositionSync,
            };
          },
        },

        props: {
          decorations(state) {
            const pluginState = commentPluginKey.getState(state);

            if (!pluginState || pluginState.isWaitingForPositionSync) {
              return DecorationSet.empty;
            }

            return buildDecorations(state, anchors, pluginState.activeAnchorId);
          },

          handleClick(view, _pos, event) {
            const ids: string[] = [];
            let target = event.target instanceof Element ? event.target : null;
            while (target && target !== view.dom) {
              const id = target.getAttribute('data-comment-id');

              if (id && anchors.has(id) && !ids.includes(id)) {
                ids.push(id);
              }
              target = target.parentElement;
            }

            const currentActiveAnchorId = commentPluginKey.getState(
              view.state,
            )?.activeAnchorId;
            const active =
              currentActiveAnchorId && ids.includes(currentActiveAnchorId)
                ? currentActiveAnchorId
                : ids[0] || null;

            if (active !== currentActiveAnchorId) {
              view.dispatch(
                view.state.tr.setMeta(commentPluginKey, {
                  activeAnchorId: active,
                } satisfies CommentMeta),
              );
            }

            if (active) {
              options.onClick?.(active, event);
            }

            return false;
          },
        },

        view(view) {
          let destoryed = false;
          let scheduled = false;
          let anchorsChanged = true;
          const committed = new WeakSet<CommentOperation>();

          const scheduleExcute = () => {
            if (destoryed || scheduled) {
              return;
            }
            scheduled = true;
            queueMicrotask(() => {
              scheduled = false;
              if (destoryed || editor.isDestroyed) {
                return;
              }

              const notify = anchorsChanged;
              anchorsChanged = false;

              view.dispatch(
                view.state.tr.setMeta(commentPluginKey, {
                  excute: true,
                } satisfies CommentMeta),
              );

              if (notify) {
                options.onAnchorsChange?.(Array.from(anchors.values()));
              }
            });
          };

          const onAnchorsChange = () => {
            anchorsChanged = true;
            scheduleExcute();
          };

          const afterTransaction = (transaction: Y.Transaction) => {
            if (transaction.changed.size > 0) scheduleExcute();
          };

          anchors.observe(onAnchorsChange);
          ydoc.on('afterTransaction', afterTransaction);
          scheduleExcute();

          return {
            update(view, prevState) {
              if (
                commentPluginKey.getState(view.state)?.isWaitingForPositionSync
              ) {
                scheduleExcute();
              }

              const pending =
                commentPluginKey.getState(view.state)?.pending || [];

              const operations = pending.filter(
                (operation) => !committed.has(operation),
              );
              if (operations.length) {
                ydoc.transact(() => {
                  for (const operation of operations) {
                    committed.add(operation);
                    if (operation.type === 'set') {
                      anchors.set(operation.anchor.anchorId, operation.anchor);
                    } else {
                      anchors.delete(operation.anchorId);
                    }
                  }
                }, commentPluginKey);
              }

              const before =
                commentPluginKey.getState(prevState)?.activeAnchorId || null;
              const after =
                commentPluginKey.getState(view.state)?.activeAnchorId || null;

              if (before !== after) {
                options.onActiveChange?.(after);
              }
            },
            destroy() {
              destoryed = true;
              anchors.unobserve(onAnchorsChange);
              ydoc.off('afterTransaction', afterTransaction);
            },
          };
        },
      }),
    ];
  },
});
