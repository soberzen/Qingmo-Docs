import type { ImageBlockAttributes } from '@qingmo/core';
import { ImageBlockFrame, type ImageBlockSize } from '@qingmo/editor-ui';
import {
  NodeViewWrapper,
  useEditorState,
  type ReactNodeViewProps,
} from '@tiptap/react';

export function ImageBlockNodeView({
  editor,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const isEditable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isEditable,
  });
  const { src, alt, title, caption, width, height, align } =
    node.attrs as ImageBlockAttributes;

  function resizeImage(size: ImageBlockSize) {
    if (editor.isDestroyed || !editor.isEditable) return;
    updateAttributes({
      width: Math.round(size.width),
      height: Math.round(size.height),
    });
  }

  function changeCaption(nextCaption: string) {
    if (editor.isDestroyed || !editor.isEditable) return;
    updateAttributes({ caption: nextCaption });
  }

  return (
    <NodeViewWrapper
      data-node-type='imageBlock'
      data-drag-handle
      contentEditable={false}
    >
      <ImageBlockFrame
        src={src}
        alt={alt ?? ''}
        title={title || undefined}
        caption={caption || undefined}
        align={align ?? 'center'}
        data-block-type='image'
        data-selected={selected || undefined}
        resizable={isEditable}
        {...(width != null ? { width } : {})}
        {...(width && height ? { aspectRatio: width / height } : {})}
        {...(isEditable
          ? { onResizeEnd: resizeImage, onCaptionChange: changeCaption }
          : {})}
      />
    </NodeViewWrapper>
  );
}
