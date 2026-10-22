import type { EditorState } from '@tiptap/pm/state';
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from '@tiptap/y-tiptap';
import * as Y from 'yjs';

import type { CommentAnchor, CommentOperation } from './types';

// 从 Yjs 中解析评论锚点，返回评论范围的起始位置和结束位置。
export function resolveCommentAnchorPosition(
  state: EditorState,
  anchor: CommentAnchor,
): { from: number; to: number } | null {
  const sync = ySyncPluginKey.getState(state);

  if (!sync?.binding || !sync.doc) {
    return null;
  }

  try {
    // 解析评论锚点的位置
    const decode = (value: string) =>
      relativePositionToAbsolutePosition(
        sync.doc,
        sync.type,
        Y.createRelativePositionFromJSON(JSON.parse(value)),
        sync.binding.mapping,
      );
    const from = decode(anchor.start);
    const to = decode(anchor.end);

    if (
      from === null ||
      to === null ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      from >= to ||
      to > state.doc.content.size
    ) {
      return null;
    }
    // 评论只能在段落中，也只能是段落中的内容
    if (
      !state.doc.resolve(from).parent.inlineContent ||
      !state.doc.resolve(to).parent.inlineContent
    ) {
      return null;
    }

    return { from, to };
  } catch {
    return null;
  }
}

// 将 editor 中的位置编码为 Yjs 中的位置。
export function encodePosition(state: EditorState, pos: number, assoc: -1 | 1) {
  const sync = ySyncPluginKey.getState(state);

  if (!sync?.binding || !sync.doc) return null;
  const relative = absolutePositionToRelativePosition(
    pos,
    sync.type,
    sync.binding.mapping,
  );
  const absolute = Y.createAbsolutePositionFromRelativePosition(
    relative,
    sync.doc,
  );

  if (!absolute) return null;

  const point = Y.createRelativePositionFromTypeIndex(
    absolute.type,
    absolute.index,
    assoc,
  );

  return JSON.stringify(Y.relativePositionToJSON(point));
}

// 检查评论锚点是否存在
export function hasAnchor(
  anchors: Y.Map<CommentAnchor>,
  anchorId: string,
  pendingList: CommentOperation[],
) {
  for (let i = pendingList.length - 1; i >= 0; i--) {
    const op = pendingList[i];
    const id = op?.type === 'set' ? op.anchor?.anchorId : op?.anchorId;

    if (id === anchorId) {
      return op?.type === 'set';
    }
  }

  // 没有找到，检查 anchors 中是否存在
  return anchors.has(anchorId);
}
