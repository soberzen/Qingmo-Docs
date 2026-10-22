export type CommentAnchor = {
  anchorId: string;
  start: string;
  end: string;
  quote: string;
};

export type CommentOperation =
  | { type: 'set'; anchor: CommentAnchor }
  | { type: 'delete'; anchorId: string };

export type CommentMeta = {
  /**
   * 是否执行操作
   */
  excute?: boolean;
  /**
   * 当前激活的评论锚点
   */
  activeAnchorId?: string | null;
  /**
   * 待执行操作
   */
  operations?: CommentOperation[];
};

export type CommentState = {
  /**
   * 当前激活的评论锚点
   */
  activeAnchorId: string | null;
  /**
   * 待执行操作
   */
  pending: CommentOperation[];
  /**
   * 是否等待位置同步 true 等待位置同步 false 不等待位置同步
   */
  isWaitingForPositionSync: boolean;
};
