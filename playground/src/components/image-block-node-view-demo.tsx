import {
  Document,
  ImageBlock,
  Paragraph,
  Text,
  type ImageBlockAlign,
  type ImageBlockAttributes,
} from '@qingmo/core';
import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { Input } from '@qingmo/shadcn/components/input';
import { Label } from '@qingmo/shadcn/components/label';
import { mergeAttributes, type Editor, type JSONContent } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useState } from 'react';

const initialFields = {
  src: '/image-block-demo.svg',
  caption: '由 core 原生 DOM NodeView 渲染的图片。',
  width: '480',
};

const alignments: [ImageBlockAlign, string][] = [
  ['left', '左对齐'],
  ['center', '居中'],
  ['right', '右对齐'],
];

const DemoParagraph = Paragraph.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, this.options.HTMLAttributes),
      0,
    ];
  },
});

function createInitialContent(): JSONContent {
  return {
    type: 'document',
    content: [
      {
        type: 'imageBlock',
        attrs: {
          src: initialFields.src,
          alt: '青绿色的山峦与湖面插画',
          width: Number(initialFields.width),
          align: 'center',
          caption: initialFields.caption,
        },
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '点击图片选中节点，再使用上方控件更新属性。' },
        ],
      },
      { type: 'paragraph' },
    ],
  };
}

export function ImageBlockNodeViewDemo() {
  const [fields, setFields] = useState(initialFields);
  const [readOnly, setReadOnly] = useState(false);
  const [snapshot, setSnapshot] = useState({ json: '', html: '' });

  function updateSnapshot(current: Editor) {
    setSnapshot({
      json: JSON.stringify(current.getJSON(), null, 2),
      html: current.getHTML(),
    });
  }

  const editor = useEditor({
    extensions: [Document, DemoParagraph, Text, ImageBlock],
    content: createInitialContent(),
    editorProps: {
      attributes: {
        class: 'image-node-demo-editor',
        role: 'textbox',
        'aria-label': '图片节点测试编辑器',
        'aria-multiline': 'true',
      },
    },
    onCreate: ({ editor: current }) => updateSnapshot(current),
    onUpdate: ({ editor: current }) => updateSnapshot(current),
    onSelectionUpdate: ({ editor: current }) => {
      if (!current.isActive('imageBlock')) return;
      const { src, caption, width } = current.getAttributes('imageBlock');
      setFields({
        src: src ?? '',
        caption: caption ?? '',
        width: String(width ?? 480),
      });
    },
  });
  const selectedImage = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const selection = current?.state.selection;
      return selection instanceof NodeSelection &&
        selection.node.type.name === 'imageBlock'
        ? (selection.node.attrs as ImageBlockAttributes)
        : null;
    },
  });
  const width = Number(fields.width);
  const validFields =
    Boolean(fields.src.trim()) && Number.isFinite(width) && width > 0;
  const canEditImage = Boolean(editor && selectedImage && !readOnly);

  function getAttributes(): ImageBlockAttributes {
    return {
      src: fields.src.trim(),
      caption: fields.caption.trim() || null,
      width: Math.round(width),
      height: null,
    };
  }

  return (
    <div className='image-node-demo'>
      <p className='text-sm leading-6 text-muted-foreground'>
        直接加载 core 的 ImageBlock 原生
        NodeView。选中图片后可更新地址、宽度和图注，
        或切换对齐方式；清空图注后，图片下方的说明会移除。
      </p>
      <form
        className='grid gap-3'
        onSubmit={(event) => {
          event.preventDefault();
          if (!canEditImage || !validFields) return;
          editor?.chain().focus().updateImageBlock(getAttributes()).run();
        }}
      >
        <div className='grid gap-3 sm:grid-cols-[1fr_8rem]'>
          <div className='grid gap-2'>
            <Label htmlFor='image-node-src'>图片地址</Label>
            <Input
              id='image-node-src'
              value={fields.src}
              required
              disabled={readOnly}
              onChange={(event) =>
                setFields({ ...fields, src: event.target.value })
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='image-node-width'>宽度（px）</Label>
            <Input
              id='image-node-width'
              type='number'
              min={1}
              step={1}
              required
              value={fields.width}
              disabled={readOnly}
              onChange={(event) =>
                setFields({ ...fields, width: event.target.value })
              }
            />
          </div>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='image-node-caption'>图片说明</Label>
          <Input
            id='image-node-caption'
            value={fields.caption}
            disabled={readOnly}
            placeholder='留空可移除图片说明'
            onChange={(event) =>
              setFields({ ...fields, caption: event.target.value })
            }
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='submit'
            size='sm'
            disabled={!canEditImage || !validFields}
          >
            更新选中图片
          </Button>
          {alignments.map(([align, label]) => (
            <Button
              key={align}
              type='button'
              size='sm'
              variant='outline'
              aria-pressed={selectedImage?.align === align}
              disabled={!canEditImage}
              onClick={() =>
                editor?.chain().focus().setImageBlockAlign(align).run()
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </form>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor || readOnly}
          onClick={() => {
            let position: number | undefined;
            editor?.state.doc.forEach((node, pos) => {
              if (position === undefined && node.type.name === 'imageBlock')
                position = pos;
            });
            if (position !== undefined)
              editor?.chain().focus().setNodeSelection(position).run();
          }}
        >
          选择第一张图片
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor || readOnly || !validFields}
          onClick={() =>
            editor
              ?.chain()
              .focus('end')
              .setImageBlock({
                ...getAttributes(),
                alt: '图片节点示例',
                align: 'center',
              })
              .run()
          }
        >
          插入图片
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!canEditImage}
          onClick={() => editor?.chain().focus().deleteImageBlock().run()}
        >
          删除选中图片
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={() => {
            if (!editor) return;
            editor.setEditable(readOnly);
            setReadOnly(!readOnly);
          }}
        >
          {readOnly ? '恢复编辑' : '切换只读'}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={() => {
            editor?.setEditable(true);
            editor?.commands.setContent(createInitialContent());
            setReadOnly(false);
            setFields(initialFields);
          }}
        >
          重置图片示例
        </Button>
      </div>
      <p
        role='status'
        className='text-xs text-muted-foreground'
      >
        {readOnly
          ? '当前为只读模式。'
          : selectedImage
            ? `已选中图片，当前宽度：${selectedImage.width ?? '自动'}。`
            : '点击图片或“选择第一张图片”，再修改属性。'}
      </p>
      <EditorFrame>
        <EditorContent
          editor={editor}
          className='image-node-demo-host'
          data-readonly={readOnly}
        />
      </EditorFrame>
      <details className='rounded-lg border px-4 py-3 text-sm'>
        <summary className='cursor-pointer'>查看图片节点 JSON 和 HTML</summary>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='mt-3'
          disabled={!editor || readOnly}
          onClick={() => {
            if (editor) editor.commands.setContent(editor.getHTML());
          }}
        >
          重新导入 HTML
        </Button>
        <pre className='mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs'>
          {snapshot.json}
        </pre>
        <pre className='mt-3 whitespace-pre-wrap break-all text-xs'>
          {snapshot.html}
        </pre>
      </details>
    </div>
  );
}
